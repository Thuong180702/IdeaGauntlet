export type WorkflowMode = "quick" | "court" | "users" | "mvp" | "compare";

export type WorkflowRole = {
  id: string;
  name: string;
  stance: "skeptic" | "defender" | "judge" | "user" | "planner" | "analyst";
  mandate: string;
  mustAddress: string[];
  mustAvoid?: string[];
};

export type DebatePhase = {
  id: string;
  name: string;
  participants: string[];
  instruction: string;
};

export type WorkflowSection = {
  id: string;
  heading: string;
  purpose: string;
  required: string[];
};

export type ScoringDimension = {
  id: string;
  label: string;
  definition: string;
};

export type WorkflowDefinition = {
  id: WorkflowMode;
  name: string;
  purpose: string;
  whenToUse: string;
  inputGuidance: string[];
  roles: WorkflowRole[];
  phases?: DebatePhase[];
  sections: WorkflowSection[];
  scoringDimensions: ScoringDimension[];
  outputRules: string[];
  requiredHeadings: string[];
};
