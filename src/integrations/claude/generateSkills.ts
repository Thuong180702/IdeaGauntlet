import type { IntegrationFile } from "../types.js";
import { formatForAgentInstructions } from "../../workflows/formatters/formatForAgentInstructions.js";
import { getWorkflow } from "../../workflows/definitions.js";

export function generateClaudeSkills(): IntegrationFile[] {
  const quick = getWorkflow("quick");
  const court = getWorkflow("court");
  const users = getWorkflow("users");
  const mvp = getWorkflow("mvp");

  const quickInstructions = formatForAgentInstructions(quick, "quick");
  const courtInstructions = formatForAgentInstructions(court, "court");
  const usersInstructions = formatForAgentInstructions(users, "users");
  const mvpInstructions = formatForAgentInstructions(mvp, "mvp");

  return [
    {
      path: ".claude/skills/gauntlet-quick/SKILL.md",
      description: "Claude Code skill for quick critique",
      content: `---
name: gauntlet-quick
description: Run a quick adversarial critique of a product idea
---

${quickInstructions}
`,
    },
    {
      path: ".claude/skills/gauntlet-court/SKILL.md",
      description: "Claude Code skill for court debate",
      content: `---
name: gauntlet-court
description: Run a structured court-style debate on a product idea
---

${courtInstructions}
`,
    },
    {
      path: ".claude/skills/gauntlet-users/SKILL.md",
      description: "Claude Code skill for synthetic user generation",
      content: `---
name: gauntlet-users
description: Generate synthetic user personas for hypothesis generation
---

${usersInstructions}
`,
    },
    {
      path: ".claude/skills/gauntlet-mvp/SKILL.md",
      description: "Claude Code skill for MVP validation planning",
      content: `---
name: gauntlet-mvp
description: Generate an aggressive MVP validation plan
---

${mvpInstructions}
`,
    },
  ];
}
