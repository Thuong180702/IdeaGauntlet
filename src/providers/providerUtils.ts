import { hasApiKey, getApiKey, getBaseUrl, getModel } from "../utils/env.js";
import { OpenAICompatibleProvider } from "./openaiCompatibleProvider.js";
import { OllamaProvider } from "./ollamaProvider.js";
import { ClaudeProvider } from "./claudeProvider.js";
import type { LLMProvider } from "../core/types.js";

export type ProviderResolution = {
  provider: LLMProvider;
  source: "flags" | "env" | "ollama" | "claude" | "groq";
};

export function resolveProvider(options?: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  ollama?: boolean;
  provider?: string;
}): ProviderResolution | null {
  const selectedProvider = options?.provider || process.env.IDEAGAUNTLET_PROVIDER;

  if (selectedProvider === "claude" || (options?.apiKey && options.apiKey.startsWith("sk-ant-"))) {
    const key = options?.apiKey || process.env.ANTHROPIC_API_KEY || process.env.IDEAGAUNTLET_API_KEY;
    if (key) {
      return {
        provider: new ClaudeProvider({
          apiKey: key,
          model: options?.model || process.env.IDEAGAUNTLET_MODEL || "claude-sonnet-5",
        }),
        source: "claude",
      };
    }
  }

  if (selectedProvider === "groq" || (options?.apiKey && options.apiKey.startsWith("gsk_"))) {
    const key = options?.apiKey || process.env.GROQ_API_KEY || process.env.IDEAGAUNTLET_API_KEY;
    if (key) {
      return {
        provider: new OpenAICompatibleProvider({
          apiKey: key,
          baseUrl: options?.baseUrl || "https://api.groq.com/openai/v1",
          model: options?.model || process.env.IDEAGAUNTLET_MODEL || "llama-3.3-70b-versatile",
        }),
        source: "groq",
      };
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: new ClaudeProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: options?.model || process.env.IDEAGAUNTLET_MODEL || "claude-sonnet-5",
      }),
      source: "claude",
    };
  }

  if (process.env.GROQ_API_KEY) {
    return {
      provider: new OpenAICompatibleProvider({
        apiKey: process.env.GROQ_API_KEY,
        baseUrl: "https://api.groq.com/openai/v1",
        model: options?.model || process.env.IDEAGAUNTLET_MODEL || "llama-3.3-70b-versatile",
      }),
      source: "groq",
    };
  }

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
    const envKey = getApiKey()!;
    if (envKey.startsWith("sk-ant-")) {
      return {
        provider: new ClaudeProvider({
          apiKey: envKey,
          model: options?.model ?? getModel() ?? "claude-sonnet-5",
        }),
        source: "claude",
      };
    } else if (envKey.startsWith("gsk_")) {
      return {
        provider: new OpenAICompatibleProvider({
          apiKey: envKey,
          baseUrl: "https://api.groq.com/openai/v1",
          model: options?.model ?? getModel() ?? "llama-3.3-70b-versatile",
        }),
        source: "groq",
      };
    }
    
    return {
      provider: new OpenAICompatibleProvider({
        apiKey: envKey,
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
  provider?: string;
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
