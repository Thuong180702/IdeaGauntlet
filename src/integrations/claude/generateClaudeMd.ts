import type { IntegrationFile } from "../types.js";
import { AGENT_NATIVE_PREAMBLE } from "../../workflows/formatters/formatForAgentInstructions.js";
import { getWorkflow } from "../../workflows/definitions.js";
import { formatForAgentInstructions } from "../../workflows/formatters/formatForAgentInstructions.js";

export function generateClaudeMd(): IntegrationFile[] {
  const court = getWorkflow("court");
  const quick = getWorkflow("quick");
  const instructions = formatForAgentInstructions(court, "court");

  return [{
    path: "CLAUDE.md.idea-gauntlet",
    description: "Claude Code project instructions for IdeaGauntlet",
    content: `<!-- IdeaGauntlet Section -->
## IdeaGauntlet Integration

${AGENT_NATIVE_PREAMBLE}

### Court mode evidence research

If web/search tools are available, court mode performs a brief evidence scan before the debate. Research roles examine market, competitor, distribution, user behavior, and privacy/trust evidence. The judge produces a research brief that separates evidence-backed claims from assumptions and unknowns.

### Available workflows

- **Quick critique** — Fast adversarial review of positioning, assumptions, users, distribution, monetization, and buildability.
- **Court mode** — Structured multi-role debate with 7 specialist roles and judge verdict.
- **Synthetic users** — Fictional archetypes for hypothesis generation and interview preparation.
- **MVP planning** — Ruthlessly minimal validation plan to test the riskiest assumption.
- **Idea comparison** — Structured comparison across 10 dimensions.

### Using in conversation

\`\`\`
Use IdeaGauntlet court mode to stress-test this idea:
...

Use IdeaGauntlet quick mode to critique this idea:
...
\`\`\`

### Advanced: Direct CLI usage

If you have configured a provider (IDEAGAUNTLET_API_KEY or --ollama), you can also run:

\`\`\`bash
idea-gauntlet quick "idea"
idea-gauntlet court "idea" --output report.md
\`\`\`

This is optional. Agent-native workflows do not require a provider.
`,
  }];
}
