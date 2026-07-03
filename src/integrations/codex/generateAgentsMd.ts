import type { IntegrationFile } from "../types.js";

export function generateCodexConfig(): IntegrationFile[] {
  return [
    {
      path: "AGENTS.md",
      description: "Codex agent definitions",
      content: `# Codex Agents — IdeaGauntlet

## skeptic
An agent that attacks product ideas to find weaknesses.

## defender
An agent that makes the strongest honest case for a product idea.

## judge
An agent that synthesizes arguments into a conservative verdict.
`,
    },
    {
      path: ".codex/config.toml",
      description: "Codex TOML configuration",
      content: `[agents]
skeptic = { definition = "AGENTS.md#skeptic" }
defender = { definition = "AGENTS.md#defender" }
judge = { definition = "AGENTS.md#judge" }
`,
    },
  ];
}
