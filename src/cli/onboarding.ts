import type { OnboardingChoice } from "../core/types.js";
import { createInterface } from "node:readline/promises";

/** First-run menu. Writes to stderr so piped stdout (reports, JSON) stays clean. */
export async function showOnboardingMenu(): Promise<OnboardingChoice> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  console.error("\nIdeaGauntlet needs an LLM to run this analysis, and none is configured yet.");
  console.error("How do you want to proceed?\n");
  console.error("  1) Use a local model via Ollama   (free; Ollama must be running)");
  console.error("  2) Paste an API key               (Anthropic, Groq, or any OpenAI-compatible)");
  console.error("  3) No key — set up Claude Code / Cursor / Codex integration instead\n");
  try {
    for (;;) {
      const answer = (await rl.question("Enter choice (1-3): ")).trim();
      if (answer === "1") return "ollama";
      if (answer === "2") return "configure_key";
      if (answer === "3") return "setup_agent_native";
      console.error("Please enter 1, 2, or 3 (Ctrl+C to quit).");
    }
  } finally {
    rl.close();
  }
}
