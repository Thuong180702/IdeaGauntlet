import { randomUUID } from "node:crypto";
import type { LLMProvider, IdeaInput, GauntletReport, Risk, Assumption, KillTest, Verdict, Severity, Confidence, Scorecard, ScoreRubricEntry, EnhancedQuickReport } from "../core/types.js";
import { calculateScores, medianScore } from "../core/scoring.js";
import { quickWorkflow } from "../workflows/definitions/quick.js";
import { formatForCliPrompt } from "../workflows/formatters/formatForCliPrompt.js";
import { extractJSON, safeParseJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";
import { computeVerdict } from "../core/verdictMapping.js";

export async function runImmuneEngine(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: { enableSearch?: boolean; research?: ResearchBrief; onToken?: (chunk: string) => void; systemPromptExtra?: string },
): Promise<GauntletReport> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for quick mode.");
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  // Web research — always-on unless explicitly disabled
  let research: ResearchBrief | undefined;
  const warnings: string[] = [];
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress("Researching market", () => performResearch(idea, "quick"));
    } catch (err: any) {
      warnIfError("immuneEngine: web research failed", err);
      warnings.push("Web research failed — analysis based on LLM knowledge only.");
    }
  }

  const systemPrompt = formatForCliPrompt(quickWorkflow, "quick");
  const researchContext = research?.summary ?? "";
  const structuredSystem = `You are the Quick Critique analyst in IdeaGauntlet.\n${systemPrompt}\n\n${researchContext}\n\n${IDEA_INJECTION_SYSTEM}\n\nReturn a single valid JSON object only — no markdown fences, no extra text.`;

  const userMessage = buildSafeUserMessage(idea.idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    "",
    "Return JSON with keys: oneLineVerdict, topRisks (array of {title, severity, explanation, mitigation}), topAssumptions (array of {title, whyItMatters, howToTest, confidence}), bestCase, worstCase, distributionRisk, monetizationRisk, buildabilityRisk, fastestValidationTest ({description, method, timeline, successSignal}), competitorAnalysis ({competitors: [{name, url, type, pricing, features, weaknesses}], saturationLevel, analysisNote}) — use data from research brief, name real competitors, nicheOpportunities (array of {type, description, evidence, wedgeIdea, whyNow}) — at least 3 if market is saturated, scores ({clarity, pain, differentiation, buildability, distribution, monetization, evidence}), scoreRubric ({clarity:{evidence, sensitivity}, pain:{...}, differentiation:{...}, buildability:{...}, distribution:{...}, monetization:{...}, evidence:{...}}) — for EACH dimension: `evidence` = one concrete sentence grounding the score in the idea/competitors/research (not generic), `sensitivity` = one sentence stating what would raise it ~2 points and what would drop it ~2 points, brutalTakeaway (string — ONE punchy, quotable, brutally honest sentence a founder would screenshot; the single sharpest thing about this idea), nextStep",
  ]);

  let parsed: any = {};
  try {
    const response = await withProgress("Analyzing idea", () => provider.complete(userMessage, {
      system: options?.systemPromptExtra ? `${structuredSystem}\n\n${options.systemPromptExtra}` : structuredSystem,
      temperature: 0.4,
      maxTokens: 4096,
      onToken: options?.onToken,
    }));
    const extracted = extractJSON(response);
    parsed = extracted ?? {};
    if (!extracted) {
      warnings.push("LLM returned malformed JSON — falling back to default scores.");
    }
  } catch (err: any) {
    warnIfError("immuneEngine: LLM response failed", err);
    parsed = {};
    warnings.push("LLM response failed — report contains default/empty values.");
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
  const { evidenceStrength, hasEvidence } = assessEvidence(research);
  const { scores } = calculateScores({
    hasEvidence,
    evidenceStrength,
    overrides: scoreOverrides,
    llmEvidenceOverride: typeof parsed.scores?.evidence === "number" ? parsed.scores.evidence : undefined,
  });
  const scoreRubric = sanitizeRubric(parsed.scoreRubric);
  const verdict = computeVerdict({
    scores,
    evidenceScoreOverride: typeof parsed.scores?.evidence === "number" ? parsed.scores.evidence : undefined,
    llmVerdictText: parsed.oneLineVerdict,
  });

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
    scoreRubric,
    brutalTakeaway: typeof parsed.brutalTakeaway === "string" ? parsed.brutalTakeaway : undefined,
    coreInsight: parsed.oneLineVerdict ?? "Analysis complete.",
    strongestCase: parsed.bestCase ?? "",
    weakestAssumption: assumptions[0]?.title ?? "",
    risks,
    assumptions,
    killTests,
    quickReport,
    nextActions: parsed.nextStep ? [parsed.nextStep] : [],
    webResearch: research,
    partial: warnings.length > 0 || undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    markdown: "",
  };
}

/**
 * Derive an evidence signal from the web-research brief. Used as the fallback
 * evidence score when the model omits its own — grounded in what was actually
 * found rather than a hardcoded assumption.
 */
function assessEvidence(research?: ResearchBrief): {
  hasEvidence: boolean;
  evidenceStrength: "weak" | "medium" | "strong";
} {
  const results = research?.results?.length ?? 0;
  const competitors = research?.competitorLandscape?.competitors?.length ?? 0;
  const pages = research?.pageContents?.length ?? 0;
  const signal = results + competitors * 2 + pages * 2;
  if (signal === 0) return { hasEvidence: false, evidenceStrength: "weak" };
  if (signal >= 12) return { hasEvidence: true, evidenceStrength: "strong" };
  if (signal >= 5) return { hasEvidence: true, evidenceStrength: "medium" };
  return { hasEvidence: true, evidenceStrength: "weak" };
}

const RUBRIC_DIMENSIONS: (keyof Scorecard)[] = [
  "clarity", "pain", "differentiation", "buildability",
  "distribution", "monetization", "evidence",
];

/** Coerce loose LLM rubric output into typed entries; drop malformed dimensions. */
function sanitizeRubric(raw: any): Partial<Record<keyof Scorecard, ScoreRubricEntry>> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Partial<Record<keyof Scorecard, ScoreRubricEntry>> = {};
  for (const dim of RUBRIC_DIMENSIONS) {
    const e = raw[dim];
    if (e && typeof e === "object" && (e.evidence || e.sensitivity)) {
      out[dim] = {
        evidence: typeof e.evidence === "string" ? e.evidence : "",
        sensitivity: typeof e.sensitivity === "string" ? e.sensitivity : "",
      };
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
