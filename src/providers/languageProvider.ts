import type { CompletionOptions, LLMProvider } from "../core/types.js";
import { buildLanguageInstruction, isSupportedLang, listSupportedLanguages } from "../core/i18n.js";

export class UnsupportedLanguageError extends Error {
  constructor(lang: string) {
    super(`Unsupported language "${lang}". Supported: ${listSupportedLanguages().join(", ")}`);
    this.name = "UnsupportedLanguageError";
  }
}

/**
 * Decorate a provider so every completion is answered in `lang`.
 *
 * Works for any engine because it only touches the system prompt — engines
 * stay language-agnostic. Returns the provider untouched for English.
 */
export function withResponseLanguage(provider: LLMProvider, lang?: string): LLMProvider {
  const normalized = lang?.trim().toLowerCase();
  if (!normalized || normalized.slice(0, 2) === "en") return provider;
  if (!isSupportedLang(normalized)) throw new UnsupportedLanguageError(lang!);

  const instruction = buildLanguageInstruction(normalized);
  return {
    kind: provider.kind,
    complete(prompt: string, options?: CompletionOptions): Promise<string> {
      const system = options?.system ? `${options.system}\n\n${instruction}` : instruction;
      return provider.complete(prompt, { ...options, system });
    },
  };
}
