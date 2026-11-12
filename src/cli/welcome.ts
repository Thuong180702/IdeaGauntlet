/**
 * User-facing guidance text for the CLI: the no-argument welcome screen,
 * "did you mean" suggestions, and post-report next steps.
 */
import { isQuiet } from "../utils/warn.js";

export function formatWelcome(version: string): string {
  return [
    `IdeaGauntlet v${version} — put your idea through trial before users do.`,
    "",
    "Start here:",
    '  idea-gauntlet quick "A CRM for independent dog groomers"   fast adversarial critique',
    "  idea-gauntlet court idea.md                                 full court-style debate",
    "  idea-gauntlet assumptions idea.md                           what to test first, with kill thresholds",
    "",
    "Go deeper:",
    "  users · mvp · compare · gtm · compete · revenue · founder · interview · pitch · evolve · compliance",
    "",
    "Input:   inline text, a .md/.txt file, or - to read from stdin",
    "Output:  --output report.md · --format html · --json · --lang vi · --save (track score over time)",
    "",
    "First time?",
    "  idea-gauntlet doctor     check your setup and see which LLM provider will be used",
    "  idea-gauntlet setup      use it inside Claude Code / Cursor / Codex — no API key needed",
    "",
    "All commands: idea-gauntlet --help     One command: idea-gauntlet <command> --help",
  ].join("\n");
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/** Closest known command to a mistyped one, or undefined if nothing is close. */
export function suggestCommand(input: string, known: string[]): string | undefined {
  const needle = input.toLowerCase();
  let best: { name: string; distance: number } | undefined;
  for (const name of known) {
    const distance = editDistance(needle, name);
    if (!best || distance < best.distance) best = { name, distance };
  }
  if (!best) return undefined;
  return best.distance <= Math.max(2, Math.floor(needle.length / 3)) ? best.name : undefined;
}

const NEXT_STEPS: Record<string, Array<[command: string, why: string]>> = {
  quick: [
    ["court", "full prosecution/defense debate on the same idea"],
    ["assumptions", "falsifiable assumptions with kill thresholds, cheapest test first"],
    ["mvp", "a validation plan for the riskiest parts"],
  ],
  court: [
    ["assumptions", "turn the verdict into falsifiable tests with kill thresholds"],
    ["evolve", "structural pivots for the weakest dimension"],
    ["mvp", "a validation plan for the riskiest parts"],
  ],
};

/**
 * Suggest follow-up commands on stderr. Only for humans at a terminal:
 * silent when piped, quiet, or when the report itself went to a pipe.
 */
export function printNextSteps(mode: string, ideaArg: string): void {
  const steps = NEXT_STEPS[mode];
  if (!steps || isQuiet() || process.stderr.isTTY !== true || process.stdout.isTTY !== true) return;
  const arg = ideaArg === "-" || /\s/.test(ideaArg) ? '"<your idea>"' : ideaArg;
  const width = Math.max(...steps.map(([c]) => c.length));
  const lines = steps.map(([c, why]) => `  idea-gauntlet ${c.padEnd(width)} ${arg}   — ${why}`);
  console.error(["", "Next steps:", ...lines, "", "Synthetic critique is not customer evidence — test the top risk with real users."].join("\n"));
}
