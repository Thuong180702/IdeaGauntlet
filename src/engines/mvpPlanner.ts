import type { LLMProvider, IdeaInput, GauntletReport, MVPPlan, Verdict, EnhancedMVPPlan } from "../core/types.js";
import { buildReport } from "../core/report.js";
import { mvpWorkflow } from "../workflows/definitions/mvp.js";
import { formatForCliPrompt } from "../workflows/formatters/formatForCliPrompt.js";

export async function runMvpPlanner(idea: IdeaInput, provider: LLMProvider): Promise<GauntletReport> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const systemPrompt = formatForCliPrompt(mvpWorkflow, "mvp");
  const structuredSystem = `You are the MVP Planner in IdeaGauntlet.\n${systemPrompt}\n\nReturn a single valid JSON object only — no markdown fences, no extra text.`;

  const userMessage = `Product idea: ${idea.idea}\n\nReturn JSON with: coreHypothesis, riskiestAssumptions (array of {assumption, riskLevel}), nonGoals (array), mvpWedge (string), validationPlan (array of step strings), experimentBacklog (array), fakeDoorTest (string), conciergeTest (string), interviewScript (array of question strings), successMetrics (array of {metric, target}), killCriteria (array of strings), pivotOptions (array of strings), recommendedScope (string)`;

  let plan: MVPPlan = {
    goal: `Test the riskiest assumption`,
    scope: ["Fake-door landing page"],
    nonGoals: ["Auth", "Payments", "Mobile apps"],
    timeline: "14 days",
    metrics: ["Signup conversion > 10%", "5+ user interviews"],
  };

  let enhancedMvpPlan: EnhancedMVPPlan | undefined;

  try {
    const response = await provider.complete(userMessage, {
      system: structuredSystem,
      temperature: 0.4,
      maxTokens: 2048,
    });
    const parsed = JSON.parse(response);

    plan = {
      goal: parsed.coreHypothesis ?? plan.goal,
      scope: parsed.validationPlan ?? plan.scope,
      nonGoals: parsed.nonGoals ?? plan.nonGoals,
      timeline: "14 days",
      metrics: (parsed.successMetrics ?? []).map((m: any) => `${m.metric}: ${m.target}`),
    };

    enhancedMvpPlan = {
      coreHypothesis: parsed.coreHypothesis ?? "",
      riskiestAssumptions: parsed.riskiestAssumptions ?? [],
      nonGoals: parsed.nonGoals ?? [],
      mvpWedge: parsed.mvpWedge ?? "",
      validationPlan: parsed.validationPlan ?? [],
      experimentBacklog: parsed.experimentBacklog ?? [],
      fakeDoorTest: parsed.fakeDoorTest ?? "",
      conciergeTest: parsed.conciergeTest ?? "",
      interviewScript: parsed.interviewScript ?? [],
      successMetrics: parsed.successMetrics ?? [],
      killCriteria: parsed.killCriteria ?? [],
      pivotOptions: parsed.pivotOptions ?? [],
      recommendedScope: parsed.recommendedScope ?? "",
    };
  } catch {
    // Use defaults
  }

  const report: GauntletReport = {
    id, createdAt: now, mode: "mvp", input: idea,
    verdict: `MVP plan: ${plan.goal}` as Verdict,
    mvpPlan: plan,
    enhancedMvpPlan,
    nextActions: plan.scope,
    markdown: "",
  };
  report.markdown = buildReport(report);
  return report;
}
