import type { IntegrationFile } from "../types.js";
import { AGENT_NATIVE_PREAMBLE } from "../../workflows/formatters/formatForAgentInstructions.js";
import { getWorkflow } from "../../workflows/definitions.js";

export function generateCursorRules(): IntegrationFile[] {
  const court = getWorkflow("court");
  const quick = getWorkflow("quick");
  const users = getWorkflow("users");
  const mvp = getWorkflow("mvp");
  const compare = getWorkflow("compare");

  const allWorkflows = [
    { id: "quick", def: quick, description: "Run a quick adversarial critique" },
    { id: "court", def: court, description: "Run a structured multi-role debate" },
    { id: "users", def: users, description: "Generate synthetic user personas" },
    { id: "mvp", def: mvp, description: "Generate an MVP validation plan" },
    { id: "compare", def: compare, description: "Compare multiple product ideas" },
  ];

  return allWorkflows.map((wf) => {
    let researchLayer = "";
    if (wf.id === "court") {
      researchLayer = `

Court mode includes an optional evidence research layer. If web/search tools are available, perform a brief evidence scan before the debate. Use citations or source names for factual claims. If web/search is unavailable, state that no live research was performed.

`;
    }

    return {
      path: `.cursor/rules/idea-gauntlet-${wf.id}.mdc`,
      description: `Cursor rule for ${wf.def.name}`,
      content: `---
description: ${wf.description}
globs: *.md
---
${AGENT_NATIVE_PREAMBLE}${researchLayer}
## ${wf.def.name}

${wf.def.purpose}

### Required output headings:
${wf.def.requiredHeadings.map((h) => `- ${h}`).join("\n")}
`,
    };
  });
}
