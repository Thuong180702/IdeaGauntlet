import type { LLMProvider, IdeaInput, GauntletReport, ComparisonResult, ComparedIdea, Verdict } from "../core/types.js";
import { buildReport } from "../core/report.js";
import { runImmuneEngine } from "./immuneEngine.js";

export async function runCompareEngine(ideas: IdeaInput[], provider: LLMProvider): Promise<GauntletReport> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const results: ComparedIdea[] = [];
  for (const idea of ideas) {
    const report = await runImmuneEngine(idea, provider);
    results.push({
      title: idea.title ?? idea.idea.slice(0, 40),
      verdict: report.verdict,
      score: report.scores ? Math.round((report.scores.clarity + report.scores.pain + report.scores.differentiation) / 3) : 5,
      riskiestAssumption: report.weakestAssumption || "Unknown",
      evidenceScore: report.scores?.evidence ?? 1,
    });
  }

  results.sort((a, b) => b.score - a.score);

  const comparison: ComparisonResult = {
    ideas: results,
    ranking: results.map((r) => r.title),
    fastestToValidate: results[0]?.title ?? "",
    highestUpside: results[0]?.title ?? "",
    recommendedPick: results[0]?.title ?? "",
  };

  const report: GauntletReport = {
    id, createdAt: now, mode: "compare", input: ideas[0],
    verdict: `Compared ${ideas.length} ideas. Top pick: ${comparison.recommendedPick}` as Verdict,
    comparison,
    nextActions: [`Validate "${comparison.recommendedPick}" first`],
    markdown: "",
  };
  report.markdown = buildReport(report);
  return report;
}
