import type { LLMProvider, CompletionOptions, RetryConfig } from "../core/types.js";
import { DEFAULT_RETRY } from "../core/types.js";

export type OpenAICompatibleConfig = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  /** Default timeout in ms for API calls. Default 60000. */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 60000;

export class OpenAICompatibleProvider implements LLMProvider {
  kind = "openai" as const;
  private config: Required<OpenAICompatibleConfig>;

  constructor(config: OpenAICompatibleConfig) {
    if (!config.apiKey) throw new Error("API key is required for OpenAICompatibleProvider");
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
      model: config.model ?? "gpt-4o-mini",
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };
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
    // Using a mutable object so inner functions share the same reference.
    let activeTimeoutId: ReturnType<typeof setTimeout> = setTimeout(
      () => timeoutCtrl.abort(),
      this.config.timeoutMs,
    );

    // Helper to reset the timeout for the next attempt without leaking the old timer.
    const resetTimeout = () => {
      clearTimeout(activeTimeoutId);
      activeTimeoutId = setTimeout(() => timeoutCtrl.abort(), this.config.timeoutMs);
    };

    // If the caller provided their own signal, listen to it.
    if (options?.signal) {
      options.signal.addEventListener("abort", () => timeoutCtrl.abort(), { once: true });
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (options?.system) messages.push({ role: "system", content: options.system });
    messages.push({ role: "user", content: prompt });

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      temperature: options?.temperature ?? 0.4,
      max_tokens: options?.maxTokens ?? 2048,
    };

    // Enable streaming if onToken callback is provided.
    if (options?.onToken) {
      body.stream = true;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryCfg.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: timeoutCtrl.signal,
        });

        // Check for retryable status codes.
        if (!response.ok) {
          const statusCode = response.status;
          const text = await response.text().catch(() => "");

          // Parse Retry-After header for 429.
          if (statusCode === 429 && attempt < retryCfg.maxRetries) {
            const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
            const delay = retryAfter ?? computeBackoff(attempt, retryCfg);
            await sleep(delay);
            resetTimeout(); // Reset timer — clears old, creates new (fixes memory leak).
            continue;
          }

          if (retryCfg.retryOnStatuses.includes(statusCode) && attempt < retryCfg.maxRetries) {
            const delay = computeBackoff(attempt, retryCfg);
            await sleep(delay);
            resetTimeout();
            continue;
          }

          clearTimeout(activeTimeoutId);
          throw new Error(`Provider returned ${statusCode}: ${text}`);
        }

        clearTimeout(activeTimeoutId);

        // Handle streaming response.
        if (options?.onToken && response.body) {
          return await readSSEStream(response.body, options.onToken);
        }

        const data = await response.json() as any;
        return data.choices[0].message.content ?? "";
      } catch (err: any) {
        lastError = err;
        // Don't retry on AbortError (user-initiated cancel or timeout).
        if (err.name === "AbortError") {
          clearTimeout(activeTimeoutId);
          throw new Error(`Request timed out or was cancelled after ${this.config.timeoutMs}ms`);
        }
        // Retry network errors.
        if (attempt < retryCfg.maxRetries) {
          const delay = computeBackoff(attempt, retryCfg);
          await sleep(delay);
          resetTimeout();
          continue;
        }
      }
    }

    clearTimeout(activeTimeoutId);
    throw lastError ?? new Error("Provider request failed after all retries");
  }
}

/**
 * Compute exponential backoff delay with jitter.
 */
function computeBackoff(attempt: number, cfg: Required<RetryConfig>): number {
  const exp = cfg.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * cfg.baseDelayMs;
  return Math.min(exp + jitter, cfg.maxDelayMs);
}

/**
 * Parse the Retry-After header (seconds or HTTP date).
 * Returns milliseconds, or null if unparseable.
 */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  // Numeric (seconds)
  const seconds = Number(header);
  if (!isNaN(seconds)) return seconds * 1000;
  // HTTP date
  const date = new Date(header);
  if (!isNaN(date.getTime())) {
    const diff = date.getTime() - Date.now();
    return Math.max(diff, 0);
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read a Server-Sent Events stream, invoking onToken for each delta.
 * Returns the full concatenated content.
 */
async function readSSEStream(
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
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            fullContent += delta;
            onToken(delta);
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}
