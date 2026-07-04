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

export function formatNoProviderError(): string {
  return [
    "No provider configured for direct CLI analysis.",
    "",
    "Direct CLI commands need one of:",
    "  - IDEAGAUNTLET_API_KEY with IDEAGAUNTLET_BASE_URL / IDEAGAUNTLET_MODEL",
    "  - --api-key / --base-url / --model",
    "  - --ollama --model <local-model>",
    "",
    "If you are using IdeaGauntlet inside Claude Code, Codex, or Cursor, do not run the CLI command directly. Ask naturally:",
    '  Use IdeaGauntlet court mode to stress-test this idea: ...',
  ].join("\n");
}

export class NoProviderError extends Error {
  constructor() {
    super(formatNoProviderError());
    this.name = "NoProviderError";
  }
}
