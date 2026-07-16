import type { LLMProvider, CompletionOptions, RetryConfig } from "../core/types.js";
import { DEFAULT_RETRY } from "../core/types.js";
import { warnIfError } from "../utils/warn.js";

const DEFAULT_TIMEOUT_MS = 120000;

export class OllamaProvider implements LLMProvider {
  kind = "ollama" as const;
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(model?: string, baseUrl?: string, timeoutMs?: number) {
    this.baseUrl = baseUrl ?? "http://localhost:11434";
    this.model = model ?? "llama3";
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const retryCfg: Required<RetryConfig> = {
      maxRetries: options?.retry?.maxRetries ?? DEFAULT_RETRY.maxRetries,
      baseDelayMs: options?.retry?.baseDelayMs ?? DEFAULT_RETRY.baseDelayMs,
      maxDelayMs: options?.retry?.maxDelayMs ?? DEFAULT_RETRY.maxDelayMs,
      retryOnStatuses: options?.retry?.retryOnStatuses ?? DEFAULT_RETRY.retryOnStatuses,
    };

    const timeoutCtrl = new AbortController();

    // Track the active timer so it can be cleared before creating a new one on retry.
    let activeTimeoutId: ReturnType<typeof setTimeout> = setTimeout(
      () => timeoutCtrl.abort(),
      this.timeoutMs,
    );

    // Helper to reset the timeout for the next attempt without leaking the old timer.
    const resetTimeout = () => {
      clearTimeout(activeTimeoutId);
      activeTimeoutId = setTimeout(() => timeoutCtrl.abort(), this.timeoutMs);
    };

    if (options?.signal) {
      options.signal.addEventListener("abort", () => timeoutCtrl.abort(), { once: true });
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (options?.system) messages.push({ role: "system", content: options.system });
    messages.push({ role: "user", content: prompt });

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      stream: !!options?.onToken,
      options: { temperature: options?.temperature ?? 0.4, num_predict: options?.maxTokens ?? 2048 },
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryCfg.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: timeoutCtrl.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch((err: any) => {
            warnIfError("ollama: failed to read error body", err);
            return "";
          });
          if (retryCfg.retryOnStatuses.includes(response.status) && attempt < retryCfg.maxRetries) {
            await sleep(computeBackoff(attempt, retryCfg));
            resetTimeout();
            continue;
          }
          clearTimeout(activeTimeoutId);
          throw new Error(`Ollama returned ${response.status}: ${text}`);
        }

        clearTimeout(activeTimeoutId);

        // Handle streaming
        if (options?.onToken && response.body) {
          return await readOllamaStream(response.body, options.onToken);
        }

        const data = (await response.json()) as any;
        return data.message?.content ?? "";
      } catch (err: any) {
        lastError = err;
        if (err.name === "AbortError") {
          clearTimeout(activeTimeoutId);
          throw new Error(`Ollama request timed out or was cancelled after ${this.timeoutMs}ms`);
        }
        if (attempt < retryCfg.maxRetries) {
          await sleep(computeBackoff(attempt, retryCfg));
          resetTimeout();
          continue;
        }
      }
    }

    clearTimeout(activeTimeoutId);
    throw lastError ?? new Error("Ollama request failed after all retries");
  }
}

function computeBackoff(attempt: number, cfg: Required<RetryConfig>): number {
  const exp = cfg.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * cfg.baseDelayMs;
  return Math.min(exp + jitter, cfg.maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read Ollama's NDJSON stream (newline-delimited JSON).
 * Each line contains { message: { content } }.
 */
async function readOllamaStream(
  body: ReadableStream<Uint8Array>,
  onToken: (chunk: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const delta = parsed.message?.content ?? "";
          if (delta) {
            fullContent += delta;
            onToken(delta);
          }
        } catch (err: any) {
          // Skip non-JSON lines
          warnIfError("ollama: stream parse skip", err);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}