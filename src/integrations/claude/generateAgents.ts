import type { IntegrationFile } from "../types.js";
import { AGENT_NATIVE_PREAMBLE } from "../../workflows/formatters/formatForAgentInstructions.js";
import { getWorkflow } from "../../workflows/definitions.js";

export function generateClaudeAgents(): IntegrationFile[] {
  const court = getWorkflow("court");
  const quick = getWorkflow("quick");
  const users = getWorkflow("users");
  const mvp = getWorkflow("mvp");

  const agents: IntegrationFile[] = [];

  // One agent per court role
  for (const role of court.roles) {
    const mustAddress = role.mustAddress.map((m) => `  - ${m}`).join("\n");
    agents.push({
      path: `.claude/agents/${role.id}.md`,
      description: `Claude Code subagent for ${role.name} role`,
      content: `---
model:
  name: claude-sonnet-5
instructions: |
  ${AGENT_NATIVE_PREAMBLE.replace(/\n/g, "\n  ")}

  You are the ${role.name} in IdeaGauntlet.

  ${role.mandate}

  Must address:
${mustAddress}
---
`,
    });
  }

  // Quick critique agent
  const quickRole = quick.roles[0];
  if (quickRole) {
    agents.push({
      path: ".claude/agents/quick-skeptic.md",
      description: "Claude Code subagent for quick critique Skeptic role",
      content: `---
model:
  name: claude-sonnet-5
instructions: |
  ${AGENT_NATIVE_PREAMBLE.replace(/\n/g, "\n  ")}

  You are the ${quickRole.name} in IdeaGauntlet.

  ${quickRole.mandate}

  Must address:
${quickRole.mustAddress.map((m) => `  - ${m}`).join("\n")}
---
`,
    });
  }

  return agents;
}
