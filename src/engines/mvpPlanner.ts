import type { LLMProvider, IdeaInput, GauntletReport, MVPPlan, Verdict, EnhancedMVPPlan } from "../core/types.js";
import { mvpWorkflow } from "../workflows/definitions/mvp.js";
import { formatForCliPrompt } from "../workflows/formatters/formatForCliPrompt.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";

const DEFAULT_PLAN: MVPPlan = {
  goal: "Test the riskiest assumption",
  scope: ["Fake-door landing page"],
  nonGoals: ["Auth", "Payments", "Mobile apps"],
  timeline: "14 days",
  metrics: ["Signup conversion > 10%", "5+ user interviews"],
};

export async function runMvpPlanner(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: { enableSearch?: boolean; research?: ResearchBrief },
): Promise<GauntletReport> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Web research — always-on unless explicitly disabled
  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await performResearch(idea, "mvp");
    } catch {
      // Silent fallback
    }
  }

  const systemPrompt = formatForCliPrompt(mvpWorkflow, "mvp");
  const researchContext = research?.summary ?? "";
  const structuredSystem = `You are the MVP Planner in IdeaGauntlet.\n${systemPrompt}\n\n${researchContext}\n\nReturn a single valid JSON object only — no markdown fences, no extra text.`;

  const userMessage = `Product idea: ${idea.idea}\n\nReturn JSON with: coreHypothesis, riskiestAssumptions (array of {assumption, riskLevel}), nonGoals (array), mvpWedge (string), validationPlan (array of step strings), experimentBacklog (array), fakeDoorTest (string), conciergeTest (string), interviewScript (array of question strings), successMetrics (array of {metric, target}), killCriteria (array of strings), pivotOptions (array of strings), recommendedScope (string)`;

  let plan: MVPPlan = { ...DEFAULT_PLAN };
  let enhancedMvpPlan: EnhancedMVPPlan | undefined;
  let verdict: Verdict = "needs_real_evidence";

  try {
    const response = await provider.complete(userMessage, {
      system: structuredSystem,
      temperature: 0.4,
      maxTokens: 2048,
    });
    const parsed = extractJSON<any>(response);

    if (!parsed) throw new Error("Failed to parse MVP response");

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

    // Verdict reflects MVP plan readiness (Bug C fix)
    const hasKillCriteria = (parsed.killCriteria ?? []).length > 0;
    const hasPivotOptions = (parsed.pivotOptions ?? []).length > 0;
    if (hasKillCriteria && hasPivotOptions) {
      verdict = "promising_but_risky";
    } else if (hasKillCriteria) {
      verdict = "needs_real_evidence";
    } else {
      verdict = "weak";
    }
  } catch {
    // Use defaults — verdict stays "needs_real_evidence"
  }

  const report: GauntletReport = {
    id, createdAt: now, mode: "mvp", input: idea,
    verdict,
    mvpPlan: plan,
    enhancedMvpPlan,
    nextActions: plan.scope,
    webResearch: research,
    markdown: "",
  };
  return report;
}
