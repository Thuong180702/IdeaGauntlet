import type { OnboardingChoice } from "../core/types.js";
import { createInterface } from "node:readline/promises";

export async function showOnboardingMenu(): Promise<OnboardingChoice> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("\n⚠ No API key or provider configured.");
  console.log("Choose how to proceed:\n");
  console.log("  1) Use Ollama/local model (if installed)");
  console.log("  2) Configure API key now");
  console.log("  3) Set up agent-native integration files (setup)\n");
  const answer = await rl.question("Enter choice (1-3): ");
  rl.close();

  switch (answer.trim()) {
    case "1": return "ollama";
    case "2": return "configure_key";
    case "3": return "setup_agent_native";
    default:
      console.log("Invalid choice. Please enter 1-3.");
      return showOnboardingMenu();
  }
}
