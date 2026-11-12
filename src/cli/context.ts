/**
 * Shared CLI plumbing: turn parsed flags into a ready-to-use provider.
 *
 * Every analysis command goes through here so that provider flags, the
 * first-run onboarding menu, and `--lang` behave identically everywhere.
 */
import type { LLMProvider } from "../core/types.js";
import { resolveProvider, formatNoProviderError, type ProviderResolution } from "../providers/providerUtils.js";
import { withResponseLanguage } from "../providers/languageProvider.js";
import { showOnboardingMenu } from "./onboarding.js";

export function resolveLang(options: Record<string, unknown>): string | undefined {
  const lang = options.lang ?? process.env.IDEAGAUNTLET_LANG;
  return typeof lang === "string" && lang.trim() ? lang.trim() : undefined;
}

function isInteractiveTerminal(): boolean {
  return process.stdin.isTTY === true && process.stderr.isTTY === true;
}

async function onboard(options: Record<string, unknown>): Promise<ProviderResolution | null> {
  const choice = await showOnboardingMenu();
  switch (choice) {
    case "ollama":
      return resolveProvider({ ollama: true, model: options.model as string | undefined });
    case "configure_key": {
      const { createInterface } = await import("node:readline/promises");
      const rl = createInterface({ input: process.stdin, output: process.stderr });
      const key = (await rl.question("Paste API key (used for this run only, never saved): ")).trim();
      rl.close();
      if (!key) return null;
      console.error(
        "\nTip: to skip this prompt next time, export the key in your shell profile, e.g.\n" +
        "  export ANTHROPIC_API_KEY=...   (or GROQ_API_KEY / IDEAGAUNTLET_API_KEY)\n",
      );
      return resolveProvider({
        apiKey: key,
        baseUrl: options.baseUrl as string | undefined,
        model: options.model as string | undefined,
      });
    }
    case "setup_agent_native": {
      const { setupCommand } = await import("./commands/setup.js");
      await setupCommand({});
      process.exit(0);
    }
  }
  return null;
}

/**
 * Resolve the provider for an analysis command, or exit(2) with setup help.
 * In an interactive terminal the user gets a one-time menu instead of an error.
 */
export async function resolveCliProvider(options: Record<string, unknown>): Promise<LLMProvider> {
  let resolved = resolveProvider({
    apiKey: options.apiKey as string | undefined,
    baseUrl: options.baseUrl as string | undefined,
    model: options.model as string | undefined,
    ollama: !!options.ollama,
  });

  if (!resolved && isInteractiveTerminal()) resolved = await onboard(options);

  if (!resolved) {
    console.error(formatNoProviderError());
    process.exit(2);
  }

  try {
    return withResponseLanguage(resolved.provider, resolveLang(options));
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(2);
  }
}
