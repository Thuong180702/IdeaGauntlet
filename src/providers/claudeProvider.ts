import type { LLMProvider, CompletionOptions, RetryConfig } from "../core/types.js";
import { DEFAULT_RETRY } from "../core/types.js";
import { warnIfError } from "../utils/warn.js";

export type ClaudeConfig = {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  // BUG-08: Allow custom endpoint for proxy/gateway setups.
  baseUrl?: string;
};

const DEFAULT_TIMEOUT_MS = 60000;

export class ClaudeProvider implements LLMProvider {
  kind = "custom" as const;
  private config: Required<ClaudeConfig>;

  constructor(config: ClaudeConfig) {
    if (!config.apiKey) throw new Error("API key is required for ClaudeProvider");
    this.config = {
      apiKey: config.apiKey,
      model: config.model ?? "claude-sonnet-5",
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      baseUrl: (config.baseUrl ?? "https://api.anthropic.com").replace(/\/$/, ""),
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
    let activeTimeoutId: ReturnType<typeof setTimeout> = setTimeout(
      () => timeoutCtrl.abort(),
      this.config.timeoutMs,
    );

    const resetTimeout = () => {
      clearTimeout(activeTimeoutId);
      activeTimeoutId = setTimeout(() => timeoutCtrl.abort(), this.config.timeoutMs);
    };

    if (options?.signal) {
      options.signal.addEventListener("abort", () => timeoutCtrl.abort(), { once: true });
    }

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.4,
    };

    if (options?.system) {
      body.system = options.system;
    }

    if (options?.onToken) {
      body.stream = true;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryCfg.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.config.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
          signal: timeoutCtrl.signal,
        });

        if (!response.ok) {
          const statusCode = response.status;
          const text = await response.text().catch((err: any) => {
            warnIfError("claude: failed to read error body", err);
            return "";
          });

          if (statusCode === 429 && attempt < retryCfg.maxRetries) {
            const delay = computeBackoff(attempt, retryCfg);
            await sleep(delay);
            resetTimeout();
            continue;
          }

          if (retryCfg.retryOnStatuses.includes(statusCode) && attempt < retryCfg.maxRetries) {
            const delay = computeBackoff(attempt, retryCfg);
            await sleep(delay);
            resetTimeout();
            continue;
          }

          clearTimeout(activeTimeoutId);
          throw new Error(`Claude API returned ${statusCode}: ${text}`);
        }

        clearTimeout(activeTimeoutId);

        if (options?.onToken && response.body) {
          return await readClaudeSSEStream(response.body, options.onToken);
        }

        const data = await response.json() as any;
        return data.content?.[0]?.text ?? "";
      } catch (err: any) {
        lastError = err;
        if (err.name === "AbortError") {
          clearTimeout(activeTimeoutId);
          throw new Error(`Claude request timed out or was cancelled after ${this.config.timeoutMs}ms`);
        }
        if (attempt < retryCfg.maxRetries) {
          const delay = computeBackoff(attempt, retryCfg);
          await sleep(delay);
          resetTimeout();
          continue;
        }
      }
    }

    clearTimeout(activeTimeoutId);
    throw lastError ?? new Error("Claude API request failed after all retries");
  }

  // W-10: Quick key validation — minimal message call with 5s timeout.
  async validateKey(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5_000);
      const res = await fetch(`${this.config.baseUrl ?? "https://api.anthropic.com"}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.config.model ?? "claude-sonnet-4-20250514",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      return res.ok || res.status === 400; // 400 = key valid, bad model still means auth OK
    } catch {
      return false;
    }
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

async function readClaudeSSEStream(
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
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            const text = parsed.delta.text;
            fullContent += text;
            onToken(text);
          }
        } catch (err: any) {
          // Ignore non-JSON
          warnIfError("claude: SSE stream parse skip", err);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}
