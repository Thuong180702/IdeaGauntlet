import type { AgentBuilder } from "./types.js";
import { buildImmuneSystemPrompt } from "../prompts/immunePrompt.js";

export const skeptic: AgentBuilder = (idea) => ({
  system: buildImmuneSystemPrompt("Skeptic"),
  userMessage: `Product idea: ${idea.idea}${idea.targetUsers ? `\nTarget users: ${idea.targetUsers.join(", ")}` : ""}${idea.market ? `\nMarket: ${idea.market}` : ""}\n\nReturn your critique as a JSON object with these fields:\n- coreInsight (string)\n- strongestCase (string)\n- weakestAssumption (string)\n- risks (array of {title, severity: "low"|"medium"|"high"|"critical", explanation, mitigation?})\n- assumptions (array of {title, whyItMatters, howToTest, confidence: "low"|"medium"|"high"})\n- killTests (array of {title, method, timeframe, successSignal, killSignal})\n- nextActions (array of string)\n\nOnly return valid JSON. No markdown fences.`,
});
