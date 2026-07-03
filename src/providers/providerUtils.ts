import { hasApiKey, getApiKey, getBaseUrl, getModel } from "../utils/env.js";
import { OpenAICompatibleProvider } from "./openaiCompatibleProvider.js";
import { OllamaProvider } from "./ollamaProvider.js";
import type { LLMProvider } from "../core/types.js";

export type ProviderResolution = {
  provider: LLMProvider;
  source: "flags" | "env" | "ollama";
};

export function resolveProvider(options?: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  ollama?: boolean;
}): ProviderResolution | null {
  if (options?.apiKey) {
    return {
      provider: new OpenAICompatibleProvider({
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        model: options.model,
      }),
      source: "flags",
    };
  }

  if (hasApiKey()) {
    return {
      provider: new OpenAICompatibleProvider({
        apiKey: getApiKey()!,
        baseUrl: options?.baseUrl ?? getBaseUrl(),
        model: options?.model ?? getModel(),
      }),
      source: "env",
    };
  }

  if (options?.ollama) {
    return {
      provider: new OllamaProvider(options.model),
      source: "ollama",
    };
  }

  return null;
}

export function getProvider(options?: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  ollama?: boolean;
}): LLMProvider {
  const resolved = resolveProvider(options);
  if (!resolved) throw new NoProviderError();
  return resolved.provider;
}

export class NoProviderError extends Error {
  constructor() {
    super("No LLM provider configured. Set IDEAGAUNTLET_API_KEY, pass --api-key, or use --ollama.");
    this.name = "NoProviderError";
  }
}
