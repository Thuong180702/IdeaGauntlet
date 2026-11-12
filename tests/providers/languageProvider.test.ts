import { describe, it, expect } from "vitest";
import { withResponseLanguage, UnsupportedLanguageError } from "../../src/providers/languageProvider.js";
import type { CompletionOptions, LLMProvider } from "../../src/core/types.js";

function recordingProvider() {
  const calls: Array<{ prompt: string; options?: CompletionOptions }> = [];
  const provider: LLMProvider = {
    kind: "custom",
    async complete(prompt, options) {
      calls.push({ prompt, options });
      return "ok";
    },
  };
  return { provider, calls };
}

describe("withResponseLanguage", () => {
  it("returns the same provider for English or no language", () => {
    const { provider } = recordingProvider();
    expect(withResponseLanguage(provider)).toBe(provider);
    expect(withResponseLanguage(provider, "en")).toBe(provider);
    expect(withResponseLanguage(provider, "en-US")).toBe(provider);
  });

  it("appends the language instruction to an existing system prompt", async () => {
    const { provider, calls } = recordingProvider();
    await withResponseLanguage(provider, "vi").complete("idea", { system: "Return JSON.", temperature: 0.2 });
    expect(calls[0].prompt).toBe("idea");
    expect(calls[0].options?.temperature).toBe(0.2);
    expect(calls[0].options?.system).toMatch(/^Return JSON\./);
    expect(calls[0].options?.system).toContain("tiếng Việt");
  });

  it("sets a system prompt when the engine passes none", async () => {
    const { provider, calls } = recordingProvider();
    await withResponseLanguage(provider, "ja").complete("idea");
    expect(calls[0].options?.system).toContain("日本語");
  });

  it("tells the model to keep parsed and verified values untranslated", async () => {
    const { provider, calls } = recordingProvider();
    await withResponseLanguage(provider, "fr").complete("idea");
    const system = calls[0].options?.system ?? "";
    expect(system).toContain("JSON keys");
    expect(system).toContain("citations");
  });

  it("preserves the wrapped provider kind", () => {
    const { provider } = recordingProvider();
    expect(withResponseLanguage(provider, "de").kind).toBe("custom");
  });

  it("rejects unsupported languages with the supported list", () => {
    const { provider } = recordingProvider();
    expect(() => withResponseLanguage(provider, "xx")).toThrow(UnsupportedLanguageError);
    expect(() => withResponseLanguage(provider, "xx")).toThrow(/Supported: en, vi/);
  });
});
