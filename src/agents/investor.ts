import type { AgentBuilder } from "./types.js";

export const investor: AgentBuilder = (idea) => ({
  system:
    "You are the Investor in IdeaGauntlet. Examine market size, distribution, monetization, defensibility, and scale potential. Be conservative. Do not assume the idea is venture-scale unless there is a credible path.",
  userMessage: `Product idea: ${idea.idea}\n\nEvaluate this idea from an investor perspective. What is the market size? How defensible is it? What does distribution look like? Be conservative.`,
});
