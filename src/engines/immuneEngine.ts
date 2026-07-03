import type { LLMProvider, IdeaInput, GauntletReport, Risk, Assumption, KillTest, Verdict, Severity, Confidence } from "../core/types.js";
import { skeptic } from "../agents/skeptic.js";
import { calculateScores, medianScore } from "../core/scoring.js";

export async function runImmuneEngine(
  idea: IdeaInput,
  provider: LLMProvider,
): Promise<GauntletReport> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const skepticPrompt = skeptic(idea);
  let parsed: any = {};
  try {
    const response = await provider.complete(skepticPrompt.userMessage, {
      system: skepticPrompt.system,
      temperature: 0.4,
      maxTokens: 2048,
    });
    parsed = JSON.parse(response);
  } catch {
    parsed = {};
  }

  const risks: Risk[] = (parsed.risks ?? []).map((r: any) => ({
    title: r.title ?? "Unknown risk",
    severity: (r.severity ?? "medium") as Severity,
    explanation: r.explanation ?? "",
    mitigation: r.mitigation,
  }));

  const assumptions: Assumption[] = (parsed.assumptions ?? []).map((a: any) => ({
    title: a.title ?? "Unknown assumption",
    whyItMatters: a.whyItMatters ?? "",
    howToTest: a.howToTest ?? "",
    confidence: (a.confidence ?? "medium") as Confidence,
  }));

  const killTests: KillTest[] = (parsed.killTests ?? []).map((k: any) => ({
    title: k.title ?? "Unknown test",
    method: k.method ?? "",
    timeframe: k.timeframe ?? "",
    successSignal: k.successSignal ?? "",
    killSignal: k.killSignal ?? "",
  }));

  const scoreOverrides = parsed.scores ?? {};
  const scores = calculateScores({ hasEvidence: false, overrides: scoreOverrides });
  const verdict = determineVerdict(scores);

  return {
    id, createdAt: now, mode: "quick", input: idea,
    verdict,
    scores,
    coreInsight: parsed.coreInsight ?? "Analysis complete.",
    strongestCase: parsed.strongestCase ?? "",
    weakestAssumption: parsed.weakestAssumption ?? "",
    risks, assumptions, killTests,
    nextActions: parsed.nextActions ?? [],
    markdown: "",
  };
}

function determineVerdict(scores: ReturnType<typeof calculateScores>): Verdict {
  const median = medianScore(scores);
  if (median >= 8 && scores.evidence >= 5) return "strong";
  if (median >= 6) return "promising_but_risky";
  if (median >= 4) return "unclear";
  if (scores.evidence <= 1 && scores.clarity <= 3) return "pivot_recommended" as Verdict;
  if (scores.evidence <= 2 && median < 5) return "needs_real_evidence" as Verdict;
  return "weak";
}
