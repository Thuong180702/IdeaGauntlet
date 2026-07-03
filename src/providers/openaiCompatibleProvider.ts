import type { LLMProvider, CompletionOptions } from "../core/types.js";

export type OpenAICompatibleConfig = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
};

export class OpenAICompatibleProvider implements LLMProvider {
  kind = "openai" as const;
  private config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    if (!config.apiKey) throw new Error("API key is required for OpenAICompatibleProvider");
    this.config = {
      ...config,
      baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
      model: config.model ?? "gpt-4o-mini",
    };
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const url = `${this.config.baseUrl}/chat/completions`;
    const messages: Array<{ role: string; content: string }> = [];
    if (options?.system) messages.push({ role: "system", content: options.system });
    messages.push({ role: "user", content: prompt });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: options?.temperature ?? 0.4,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Provider returned ${response.status}: ${text}`);
    }

    const data = await response.json() as any;
    return data.choices[0].message.content ?? "";
  }
}
