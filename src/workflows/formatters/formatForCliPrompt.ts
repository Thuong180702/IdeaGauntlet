import type { WorkflowDefinition, WorkflowMode } from "../types.js";

export function formatForCliPrompt(def: WorkflowDefinition, mode: WorkflowMode, ideaText?: string): string {
  const lines: string[] = [];

  lines.push(`You are the ${def.name} analyst in IdeaGauntlet.`);
  lines.push(def.purpose);
  lines.push("");

  if (def.roles.length > 0) {
    lines.push("## Roles");
    lines.push("");
    for (const role of def.roles) {
      lines.push(`### ${role.name} (${role.stance})`);
      lines.push(role.mandate);
      lines.push("");
      if (role.mustAddress.length > 0) {
        lines.push("Must address:");
        for (const addr of role.mustAddress) {
          lines.push(`- ${addr}`);
        }
        lines.push("");
      }
    }
  }

  if (def.phases && def.phases.length > 0) {
    lines.push("## Phases");
    lines.push("Your response must cover all phases:");
    for (const phase of def.phases) {
      lines.push(`### ${phase.name}`);
      lines.push(phase.instruction);
      lines.push("");
    }
  }

  if (def.scoringDimensions.length > 0) {
    lines.push("## Scoring");
    lines.push("Score each dimension 0-10:");
    for (const dim of def.scoringDimensions) {
      lines.push(`- ${dim.label}: ${dim.definition}`);
    }
    lines.push("");
  }

  if (def.sections.length > 0) {
    lines.push("## Output Sections");
    for (const section of def.sections) {
      lines.push(`- ${section.heading}: ${section.purpose}`);
    }
    lines.push("");
  }

  if (def.outputRules.length > 0) {
    lines.push("## Rules");
    for (const rule of def.outputRules) {
      lines.push(`- ${rule}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
