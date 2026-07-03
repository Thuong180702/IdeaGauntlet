import type { LLMProvider, IdeaInput, GauntletReport, MVPPlan, Verdict } from "../core/types.js";
import { buildReport } from "../core/report.js";
import { skeptic } from "../agents/skeptic.js";
import { MVP_SYSTEM_PROMPT } from "../prompts/mvpPrompt.js";

export async function runMvpPlanner(idea: IdeaInput, provider: LLMProvider): Promise<GauntletReport> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // First, find the riskiest assumption
  let riskiestAssumption = "Users will adopt this product";
  try {
    const skepticPrompt = skeptic(idea);
    const skepticResponse = await provider.complete(skepticPrompt.userMessage, { system: skepticPrompt.system, temperature: 0.4, maxTokens: 1024 });
    const parsed = JSON.parse(skepticResponse);
    const assumptions = parsed.assumptions ?? [];
    if (assumptions.length > 0) {
      riskiestAssumption = assumptions[0].title ?? riskiestAssumption;
    }
  } catch {
    // Use default riskiest assumption
  }

  // Then, generate MVP plan
  let plan: MVPPlan = {
    goal: `Test the riskiest assumption: ${riskiestAssumption}`,
    scope: ["Fake-door landing page"],
    nonGoals: ["Auth", "Payments", "Mobile apps"],
    timeline: "14 days",
    metrics: ["Signup conversion > 10%", "5+ user interviews"],
  };

  try {
    const response = await provider.complete(
      `Product idea: ${idea.idea}\nRiskiest assumption: ${riskiestAssumption}\n\nDesign a 14-day MVP validation plan as JSON.`,
      { system: MVP_SYSTEM_PROMPT, temperature: 0.4, maxTokens: 1024 }
    );
    const parsed = JSON.parse(response);
    plan = {
      goal: parsed.goal ?? plan.goal,
      scope: parsed.scope ?? plan.scope,
      nonGoals: parsed.nonGoals ?? plan.nonGoals,
      timeline: parsed.timeline ?? plan.timeline,
      metrics: parsed.metrics ?? plan.metrics,
    };
  } catch {
    // Use default plan
  }

  const report: GauntletReport = {
    id, createdAt: now, mode: "mvp", input: idea,
    verdict: `MVP plan: ${plan.goal}` as Verdict,
    mvpPlan: plan,
    nextActions: plan.scope,
    markdown: "",
  };
  report.markdown = buildReport(report);
  return report;
}
