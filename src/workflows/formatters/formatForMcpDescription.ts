import type { WorkflowDefinition, WorkflowMode } from "../types.js";
import { getWorkflow } from "../definitions.js";

export function formatForMcpDescription(def: WorkflowDefinition): string {
  const roleCount = def.roles.length;
  const sectionCount = def.sections.length;
  const scoreCount = def.scoringDimensions.length;

  let description = `${def.name}: ${def.purpose}`;

  if (roleCount > 0) {
    const roleNames = def.roles.map((r) => r.name).join(", ");
    description += ` Roles: ${roleNames}.`;
  }

  if (scoreCount > 0) {
    const dims = def.scoringDimensions.map((d) => d.label).join(", ");
    description += ` Scores: ${dims}.`;
  }

  return description;
}

export function mcpToolDescriptions(): Record<string, string> {
  const modes: WorkflowMode[] = ["quick", "court", "users", "mvp", "compare"];
  const descriptions: Record<string, string> = {};

  const toolNames: Record<WorkflowMode, string> = {
    quick: "quick_critique",
    court: "run_court",
    users: "generate_users",
    mvp: "plan_mvp",
    compare: "compare_ideas",
  };

  for (const mode of modes) {
    const def = getWorkflow(mode);
    descriptions[toolNames[mode]] = formatForMcpDescription(def);
  }

  return descriptions;
}
