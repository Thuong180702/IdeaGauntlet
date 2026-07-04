import type { IntegrationFile } from "../types.js";
import { AGENT_NATIVE_PREAMBLE } from "../../workflows/formatters/formatForAgentInstructions.js";
import { getWorkflow } from "../../workflows/definitions.js";

export function generateClaudeCommands(): IntegrationFile[] {
  const quick = getWorkflow("quick");
  const court = getWorkflow("court");
  const users = getWorkflow("users");
  const mvp = getWorkflow("mvp");
  const compare = getWorkflow("compare");

  return [
    {
      path: ".claude/commands/gauntlet-quick.md",
      description: "Claude Code slash command for quick critique",
      content: `---
name: gauntlet-quick
description: Run an IdeaGauntlet quick critique on the current product idea
---
${AGENT_NATIVE_PREAMBLE}

${quick.purpose}

Required output headings:
${quick.requiredHeadings.map((h) => "- " + h).join("\n")}
`,
    },
    {
      path: ".claude/commands/gauntlet-court.md",
      description: "Claude Code slash command for court debate",
      content: `---
name: gauntlet-court
description: Run an IdeaGauntlet court-style debate
---
${AGENT_NATIVE_PREAMBLE}

Court mode includes an optional evidence research layer. If web/search tools are available, perform a brief evidence scan before the debate.

${court.purpose}

Roles:
${court.roles.map((r) => "- **" + r.name + "**: " + r.mandate).join("\n")}

Required output headings:
${court.requiredHeadings.map((h) => "- " + h).join("\n")}
`,
    },
    {
      path: ".claude/commands/gauntlet-users.md",
      description: "Claude Code slash command for synthetic user generation",
      content: `---
name: gauntlet-users
description: Generate synthetic user personas
---
${AGENT_NATIVE_PREAMBLE}

${users.purpose}

Required output headings:
${users.requiredHeadings.map((h) => "- " + h).join("\n")}
`,
    },
    {
      path: ".claude/commands/gauntlet-mvp.md",
      description: "Claude Code slash command for MVP validation planning",
      content: `---
name: gauntlet-mvp
description: Generate an MVP validation plan
---
${AGENT_NATIVE_PREAMBLE}

${mvp.purpose}

Required output headings:
${mvp.requiredHeadings.map((h) => "- " + h).join("\n")}
`,
    },
    {
      path: ".claude/commands/gauntlet-compare.md",
      description: "Claude Code slash command for idea comparison",
      content: `---
name: gauntlet-compare
description: Compare multiple product ideas
---
${AGENT_NATIVE_PREAMBLE}

${compare.purpose}

Scoring dimensions:
${compare.scoringDimensions.map((d) => "- " + d.label + ": " + d.definition).join("\n")}

Required output headings:
${compare.requiredHeadings.map((h) => "- " + h).join("\n")}
`,
    },
  ];
}
