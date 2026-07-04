import type { WorkflowDefinition, WorkflowMode, WorkflowResearchRole } from "../types.js";

export const AGENT_NATIVE_PREAMBLE = `When the user asks for IdeaGauntlet analysis inside this AI coding tool, execute the workflow natively using these instructions. Do not run the \`idea-gauntlet\` CLI first unless the user explicitly asks for terminal execution.

IdeaGauntlet agent-native mode does not require a runtime tool named \`IdeaGauntlet\`. These instructions are the workflow. Execute them directly.

Direct CLI commands require a provider. Agent-native workflows do not require an IdeaGauntlet provider because the AI coding tool supplies the model and context.

If the user types \`idea-gauntlet <mode> "..."\` in chat, treat it as a request for that mode's analysis, not as a terminal instruction, unless they explicitly say to run it in the terminal.`;

function renderResearchRoles(roles: WorkflowResearchRole[]): string[] {
  const lines: string[] = [];
  lines.push("### Research roles");
  for (const role of roles) {
    lines.push(`- **${role.name}**: ${role.mandate}`);
  }
  lines.push("");
  return lines;
}

function renderResearchPhases(phases: { id: string; name: string; instruction: string }[]): string[] {
  const lines: string[] = [];
  lines.push("### Research phases");
  for (const phase of phases) {
    lines.push(`- **${phase.name}**: ${phase.instruction}`);
  }
  lines.push("");
  return lines;
}

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

  // Research layer (for court mode with research roles)
  if (def.researchRoles && def.researchRoles.length > 0) {
    lines.push("### Evidence research");
    lines.push("");
    lines.push("If web/search tools are available, perform a brief evidence scan before the court debate. Use citations or source names for factual market, competitor, pricing, regulatory, or trend claims. If web/search is unavailable, state that no live research was performed and continue as hypothesis-only analysis.");
    lines.push("");

    lines.push(...renderResearchRoles(def.researchRoles));

    if (def.researchPhases && def.researchPhases.length > 0) {
      lines.push(...renderResearchPhases(def.researchPhases));
    }

    lines.push("### Research output headings");
    const researchHeadings = [
      "Research Brief",
      "Market Evidence",
      "Competitor Landscape",
      "Distribution Evidence",
      "User Behavior Evidence",
      "Privacy / Trust Evidence",
      "Source Notes",
      "Evidence Gaps",
    ];
    for (const h of researchHeadings) {
      lines.push(`- ${h}`);
    }
    lines.push("");

    lines.push("### Citation discipline");
    lines.push("- Cite sources when making factual market, competitor, pricing, regulatory, or trend claims");
    lines.push("- Do not cite unsupported assumptions");
    lines.push("- If search results are weak, say the evidence is weak");
    lines.push("- Do not fabricate sources");
    lines.push("- Do not overquote copyrighted text; summarize instead");
    lines.push("- Separate fresh evidence from model knowledge");
    lines.push("");
  }

  // Debate roles
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
