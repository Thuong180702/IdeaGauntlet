import type { LLMProvider, CompletionOptions } from "../core/types.js";

export class OllamaProvider implements LLMProvider {
  kind = "ollama" as const;
  private baseUrl: string;
  private model: string;

  constructor(model?: string, baseUrl?: string) {
    this.baseUrl = baseUrl ?? "http://localhost:11434";
    this.model = model ?? "llama3";
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;
    const messages: Array<{ role: string; content: string }> = [];
    if (options?.system) messages.push({ role: "system", content: options.system });
    messages.push({ role: "user", content: prompt });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: { temperature: options?.temperature ?? 0.4, num_predict: options?.maxTokens ?? 2048 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama returned ${response.status}: ${text}`);
    }

    const data = (await response.json()) as any;
    return data.message?.content ?? "";
  }
}