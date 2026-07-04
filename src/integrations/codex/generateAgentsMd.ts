import type { IntegrationFile } from "../types.js";
import { AGENT_NATIVE_PREAMBLE } from "../../workflows/formatters/formatForAgentInstructions.js";
import { getWorkflow } from "../../workflows/definitions.js";

export function generateCodexConfig(): IntegrationFile[] {
  const court = getWorkflow("court");
  const quick = getWorkflow("quick");
  const users = getWorkflow("users");
  const mvp = getWorkflow("mvp");
  const compare = getWorkflow("compare");

  return [
    {
      path: "AGENTS.md",
      description: "Codex agent definitions for IdeaGauntlet",
      content: `# Codex Agents -- IdeaGauntlet

${AGENT_NATIVE_PREAMBLE}

## Evidence research in court mode

If web/search tools are available, perform a brief evidence scan before the court debate. Use citations or source names for factual market, competitor, pricing, regulatory, or trend claims. If web/search is unavailable, state that no live research was performed and continue as hypothesis-only analysis.

Court research roles:
- **Market Researcher**: Researches demand, market size, growth trends, and willingness-to-pay
- **Competitor Researcher**: Researches alternatives, pricing, positioning, and user reviews
- **Distribution Researcher**: Researches channels, communities, SEO, and sales paths
- **User Behavior Researcher**: Researches user complaints, workarounds, and switching costs
- **Privacy / Trust Researcher**: Researches privacy concerns, regulations, and trust issues

## Available workflows

### Quick Critique
${quick.purpose}

Output sections: ${quick.requiredHeadings.join(", ")}

### Court Mode
${court.purpose}

Roles:
${court.roles.map((r) => `- **${r.name}**: ${r.mandate}`).join("\n")}

Output sections: ${court.requiredHeadings.join(", ")}

### Synthetic Users
${users.purpose}

Output: ${users.sections.map((s) => `${s.heading} (${s.purpose})`).join("; ")}

### MVP Planning
${mvp.purpose}

Output: ${mvp.requiredHeadings.join(", ")}

### Idea Comparison
${compare.purpose}

Output: ${compare.requiredHeadings.join(", ")}
`,
    },
    {
      path: ".codex/config.toml",
      description: "Codex TOML configuration",
      content: `# IdeaGauntlet workflows
# When the user asks for IdeaGauntlet analysis, execute natively.
# Do not run the idea-gauntlet CLI unless the user explicitly asks for terminal execution.

[agents]
skeptic = { definition = "AGENTS.md" }
defender = { definition = "AGENTS.md" }
judge = { definition = "AGENTS.md" }
`,
    },
  ];
}
