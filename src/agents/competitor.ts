import type { AgentBuilder } from "./types.js";

export const competitor: AgentBuilder = (idea) => ({
  system:
    "You are the Competitor in IdeaGauntlet. Explain how an existing company, open-source project, or fast-moving clone could attack this idea. Identify weak moats, easy-to-copy features, and distribution disadvantages.",
  userMessage: `Product idea: ${idea.idea}\n\nIf you were a competitor in this space, how would you attack or copy this idea? What makes it easy to replicate? Where are the weak points?`,
});
