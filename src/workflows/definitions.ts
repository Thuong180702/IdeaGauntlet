import type { WorkflowDefinition, WorkflowMode } from "./types.js";
import { courtWorkflow } from "./definitions/court.js";
import { quickWorkflow } from "./definitions/quick.js";
import { usersWorkflow } from "./definitions/users.js";
import { mvpWorkflow } from "./definitions/mvp.js";
import { compareWorkflow } from "./definitions/compare.js";

export const workflowRegistry: Record<WorkflowMode, WorkflowDefinition> = {
  quick: quickWorkflow,
  court: courtWorkflow,
  users: usersWorkflow,
  mvp: mvpWorkflow,
  compare: compareWorkflow,
};

export function getWorkflow(mode: WorkflowMode): WorkflowDefinition {
  return workflowRegistry[mode];
}

export { courtWorkflow } from "./definitions/court.js";
export { quickWorkflow } from "./definitions/quick.js";
export { usersWorkflow } from "./definitions/users.js";
export { mvpWorkflow } from "./definitions/mvp.js";
export { compareWorkflow } from "./definitions/compare.js";
