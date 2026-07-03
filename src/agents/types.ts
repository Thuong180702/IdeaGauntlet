import type { IdeaInput } from "../core/types.js";

export type AgentPrompt = {
  system: string;
  userMessage: string;
};

export type AgentBuilder = (idea: IdeaInput) => AgentPrompt;
