import type { IntegrationFile } from "../types.js";

export function generateClaudeCommands(): IntegrationFile[] {
  return [
    {
      path: ".claude/commands/gauntlet-quick.md",
      description: "Claude Code slash command for quick critique",
      content: `---
name: gauntlet-quick
description: Run an IdeaGauntlet quick critique on the current product idea
---
Run a structured adversarial critique using the Skeptic and Defender roles. Output a verdict with core insight, risks, assumptions, kill tests, and next actions.
`,
    },
    {
      path: ".claude/commands/gauntlet-court.md",
      description: "Claude Code slash command for court debate",
      content: `---
name: gauntlet-court
description: Run an IdeaGauntlet court-style debate
---
Run a structured debate with Prosecutor, Defender, User Advocate, Investor, and Competitor roles. End with a Judge verdict.
`,
    },
  ];
}
