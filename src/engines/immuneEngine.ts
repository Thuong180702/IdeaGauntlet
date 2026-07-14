import { randomUUID } from "node:crypto";
import type { LLMProvider, IdeaInput, GauntletReport, Risk, Assumption, KillTest, Verdict, Severity, Confidence, Scorecard, EnhancedQuickReport } from "../core/types.js";
import { calculateScores, medianScore } from "../core/scoring.js";
import { quickWorkflow } from "../workflows/definitions/quick.js";
import { formatForCliPrompt } from "../workflows/formatters/formatForCliPrompt.js";
import { extractJSON, safeParseJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";

export async function runImmuneEngine(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: { enableSearch?: boolean; research?: ResearchBrief },
): Promise<GauntletReport> {
  const id = randomUUID();
  const now = new Date().toISOString();

  // Web research — always-on unless explicitly disabled
  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await performResearch(idea, "quick");
    } catch {
      // Silent fallback — proceed without web research
    }
  }

  const systemPrompt = formatForCliPrompt(quickWorkflow, "quick");
  const researchContext = research?.summary ?? "";
  const structuredSystem = `You are the Quick Critique analyst in IdeaGauntlet.\n${systemPrompt}\n\n${researchContext}\n\nReturn a single valid JSON object only — no markdown fences, no extra text.`;

  const userMessage = [
    `Product idea: ${idea.idea}`,
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    "",
    "Return JSON with keys: oneLineVerdict, topRisks (array of {title, severity, explanation, mitigation}), topAssumptions (array of {title, whyItMatters, howToTest, confidence}), bestCase, worstCase, distributionRisk, monetizationRisk, buildabilityRisk, fastestValidationTest ({description, method, timeline, successSignal}), competitorAnalysis ({competitors: [{name, url, type, pricing, features, weaknesses}], saturationLevel, analysisNote}) — use data from research brief, name real competitors, nicheOpportunities (array of {type, description, evidence, wedgeIdea, whyNow}) — at least 3 if market is saturated, scores ({clarity, pain, differentiation, buildability, distribution, monetization, evidence}), nextStep",
  ].filter(Boolean).join("\n");

  let parsed: any = {};
  try {
    const response = await provider.complete(userMessage, {
      system: structuredSystem,
      temperature: 0.4,
      maxTokens: 2048,
    });
    parsed = extractJSON(response) ?? {};
  } catch {
    parsed = {};
  }

  const risks: Risk[] = (parsed.topRisks ?? parsed.risks ?? []).map((r: any) => ({
    title: r.title ?? "Unknown risk",
    severity: (r.severity ?? "medium") as Severity,
    explanation: r.explanation ?? "",
    mitigation: r.mitigation,
  }));

  const assumptions: Assumption[] = (parsed.topAssumptions ?? parsed.assumptions ?? []).map((a: any) => ({
    title: a.title ?? "Unknown assumption",
    whyItMatters: a.whyItMatters ?? "",
    howToTest: a.howToTest ?? "",
    confidence: (a.confidence ?? "medium") as Confidence,
  }));

  const killTests: KillTest[] = ([] as any[]).concat(
    parsed.fastestValidationTest ? [{
      title: "Fastest validation test",
      method: parsed.fastestValidationTest.method ?? "",
      timeframe: parsed.fastestValidationTest.timeline ?? "",
      successSignal: parsed.fastestValidationTest.successSignal ?? "",
      killSignal: "",
    }] : [],
  );

  const scoreOverrides = parsed.scores ?? {};
  const { scores } = calculateScores({ hasEvidence: false, overrides: scoreOverrides });
  const verdict = determineVerdict(scores);

  const quickReport: EnhancedQuickReport = {
    oneLineVerdict: parsed.oneLineVerdict ?? "",
    topRisks: risks,
    topAssumptions: assumptions,
    bestCase: parsed.bestCase ?? "",
    worstCase: parsed.worstCase ?? "",
    distributionRisk: parsed.distributionRisk ?? "",
    monetizationRisk: parsed.monetizationRisk ?? "",
    buildabilityRisk: parsed.buildabilityRisk ?? "",
    fastestValidationTest: parsed.fastestValidationTest ?? { description: "", method: "", timeline: "", successSignal: "" },
    quickScores: scores,
    nextStep: parsed.nextStep ?? "",
    competitorAnalysis: parsed.competitorAnalysis,
    nicheOpportunities: parsed.nicheOpportunities,
  };

  return {
    id, createdAt: now, mode: "quick", input: idea,
    verdict,
    scores,
    coreInsight: parsed.oneLineVerdict ?? "Analysis complete.",
    strongestCase: parsed.bestCase ?? "",
    weakestAssumption: assumptions[0]?.title ?? "",
    risks,
    assumptions,
    killTests,
    quickReport,
    nextActions: parsed.nextStep ? [parsed.nextStep] : [],
    webResearch: research,
    markdown: "",
  };
}

function determineVerdict(scores: Scorecard): Verdict {
  const median = medianScore(scores);
  if (median >= 8 && scores.evidence >= 5) return "strong";
  if (median >= 6) return "promising_but_risky";
  if (median >= 4) return "unclear";
  if (scores.evidence <= 1 && scores.clarity <= 3) return "pivot_recommended" as Verdict;
  if (scores.evidence <= 2 && median < 5) return "needs_real_evidence" as Verdict;
  return "weak";
}
