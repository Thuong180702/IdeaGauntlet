import type { IntegrationFile } from "../types.js";

export function generateClaudeMd(): IntegrationFile[] {
  return [{
    path: "CLAUDE.md.idea-gauntlet",
    description: "Claude Code project instructions for IdeaGauntlet",
    content: `<!-- IdeaGauntlet Section -->
## IdeaGauntlet Integration

Use \`idea-gauntlet\` commands to stress-test product ideas:
- \`idea-gauntlet quick "idea"\` — fast adversarial critique
- \`idea-gauntlet court idea.md\` — structured debate
- \`idea-gauntlet users idea.md\` — synthetic user personas
- \`idea-gauntlet mvp idea.md\` — 14-day validation plan
`,
  }];
}
