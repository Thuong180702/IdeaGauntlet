import type { WorkflowDefinition, WorkflowMode } from "../types.js";

export const AGENT_NATIVE_PREAMBLE = `When the user asks for IdeaGauntlet analysis inside this AI coding tool, execute the workflow natively using these instructions. Do not run the \`idea-gauntlet\` CLI first unless the user explicitly asks for terminal execution.

Direct CLI commands require a provider. Agent-native workflows do not require an IdeaGauntlet provider because the AI coding tool supplies the model and context.

If the user types \`idea-gauntlet <mode> "..."\` in chat, treat it as a request for that mode's analysis, not as a terminal instruction, unless they explicitly say to run it in the terminal.`;

export function formatForAgentInstructions(def: WorkflowDefinition, mode: WorkflowMode): string {
  const lines: string[] = [];

  lines.push(AGENT_NATIVE_PREAMBLE);
  lines.push("");
  lines.push(`## ${def.name}`);
  lines.push("");
  lines.push(`**Purpose:** ${def.purpose}`);
  lines.push(`**When to use:** ${def.whenToUse}`);
  lines.push("");

  if (def.inputGuidance.length > 0) {
    lines.push("**Input guidance:**");
    for (const g of def.inputGuidance) {
      lines.push(`- ${g}`);
    }
    lines.push("");
  }

  if (def.roles.length > 0) {
    lines.push("### Roles");
    for (const role of def.roles) {
      lines.push(`- **${role.name}** (${role.stance}): ${role.mandate}`);
    }
    lines.push("");
  }

  if (def.sections.length > 0) {
    lines.push("### Required report sections");
    for (const section of def.sections) {
      lines.push(`- **${section.heading}**: ${section.purpose}`);
    }
    lines.push("");
  }

  if (def.requiredHeadings.length > 0) {
    lines.push("### Required headings");
    for (const h of def.requiredHeadings) {
      lines.push(`- ${h}`);
    }
    lines.push("");
  }

  if (def.scoringDimensions.length > 0) {
    lines.push("### Scoring dimensions (0-10)");
    for (const dim of def.scoringDimensions) {
      lines.push(`- ${dim.label}: ${dim.definition}`);
    }
    lines.push("");
  }

  if (def.outputRules.length > 0) {
    lines.push("### Output rules");
    for (const rule of def.outputRules) {
      lines.push(`- ${rule}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
