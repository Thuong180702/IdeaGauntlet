import { randomUUID } from "node:crypto";
import type { LLMProvider, IdeaInput, GauntletReport, ComparisonResult, ComparedIdea, Verdict, EnhancedComparisonResult } from "../core/types.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { compareWorkflow } from "../workflows/definitions/compare.js";
import { formatForCliPrompt } from "../workflows/formatters/formatForCliPrompt.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";

export async function runCompareEngine(
  ideas: IdeaInput[],
  provider: LLMProvider,
  options?: { enableSearch?: boolean; research?: ResearchBrief },
): Promise<GauntletReport> {
  if (!ideas || ideas.length === 0) {
    throw new Error("At least one idea is required for compare mode.");
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  // Web research — run for ALL ideas in parallel and merge the summaries.
  // Previously only researched ideas[0], missing context for subsequent ideas.
  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      if (options?.research) {
        research = options.research;
      } else {
        // Run research for each idea in parallel and merge results.
        const researchResults = await Promise.all(
          ideas.map((idea) => performResearch(idea, "compare").catch((err: any) => { warnIfError(`compareEngine: research for "${idea.idea.slice(0, 40)}" failed`, err); return null; })),
        );
        const validResults = researchResults.filter((r): r is ResearchBrief => r !== null);
        if (validResults.length > 0) {
          // Merge: combine all search results and summaries.
          const mergedSummary = validResults.map((r, i) =>
            `=== Research for Idea ${i + 1}: ${ideas[i].idea.slice(0, 60)} ===\n${r.summary}`
          ).join("\n\n");

          const allCompetitors = validResults.flatMap((r) => r.competitorLandscape?.competitors ?? []);
          const allNiches = validResults.flatMap((r) => r.nicheOpportunities ?? []);
          
          const levels = validResults.map((r) => r.competitorLandscape?.saturationLevel ?? "unknown");
          let saturationLevel: import("../search/types.js").CompetitorLandscape["saturationLevel"] = "unknown";
          if (levels.includes("high")) saturationLevel = "high";
          else if (levels.includes("medium")) saturationLevel = "medium";
          else if (levels.includes("low")) saturationLevel = "low";

          const mergedAnalysisNote = validResults
            .map((r, i) => `Idea ${i + 1}: ${r.competitorLandscape?.analysisNote ?? "No competitor data."}`)
            .join(" ");

          research = {
            queries: validResults.flatMap((r) => r.queries),
            results: validResults.flatMap((r) => r.results),
            summary: mergedSummary,
            searchedAt: new Date().toISOString(),
            pageContents: validResults.flatMap((r) => r.pageContents ?? []),
            competitorLandscape: {
              competitors: allCompetitors,
              saturationLevel,
              analysisNote: mergedAnalysisNote,
            },
            nicheOpportunities: allNiches.length > 0 ? allNiches : undefined,
          };
        }
      }
    } catch (err: any) {
      warnIfError("compareEngine: parallel research failed", err);
    }
  }

  const systemPrompt = formatForCliPrompt(compareWorkflow, "compare");
  const researchContext = research?.summary ?? "";
  const structuredSystem = `You are the Comparison Analyst in IdeaGauntlet.\n${systemPrompt}\n\n${researchContext}\n\nReturn a single valid JSON object only — no markdown fences, no extra text.`;

  const ideasText = ideas.map((idea, i) =>
    `Idea ${i + 1}: ${idea.title ?? idea.idea.slice(0, 60)}\nDescription: ${idea.idea}`
  ).join("\n\n");

  const userMessage = `${ideasText}\n\nCompare these ideas. Return JSON with: comparisonMatrix (array of {ideaTitle, criteria: {clarity, pain, urgency, marketAccessibility, distribution, monetization, differentiation, buildComplexity, timeToValidate, evidence, competitiveAdvantage, nichePotential}}), perIdeaStrengths (array of {ideaTitle, strengths}), perIdeaRisks (array of {ideaTitle, risks}), bestForFastValidation ({ideaTitle, reasoning}), bestForLongTermUpside ({ideaTitle, reasoning}), killTestsPerIdea (array of {ideaTitle, killTests}), competitorLandscapePerIdea (array of {ideaTitle, landscape: {competitors: [{name, url, type, pricing, features, weaknesses}], saturationLevel, analysisNote}}) — name real competitors for each idea, nicheOpportunitiesPerIdea (array of {ideaTitle, niches: [{type, description, evidence, wedgeIdea, whyNow}]}) — 3-5 niches per idea if market saturated, recommendation ({pick, caveats, reasoning})`;

  const results: ComparedIdea[] = [];
  let enhancedComparison: EnhancedComparisonResult | undefined;

  try {
    const response = await provider.complete(userMessage, {
      system: structuredSystem,
      temperature: 0.4,
      maxTokens: 4096,
    });
    const parsed = extractJSON<any>(response);
    if (!parsed) throw new Error("Failed to parse comparison response");

    // Build ComparedIdea[] for backward compat
    if (parsed.comparisonMatrix) {
      for (const row of parsed.comparisonMatrix) {
        const scores = row.criteria ?? {};
        const evidence = scores.evidence ?? 1;
        // BUG-03: Average ALL available numeric criteria, not just 3 out of 12+.
        const numericValues = Object.values(scores).filter((v: any) => typeof v === "number" && !isNaN(v)) as number[];
        const avg = numericValues.length > 0
          ? Math.round(numericValues.reduce((a, b) => a + b, 0) / numericValues.length)
          : 5;
        // Determine per-idea verdict from aggregate score
        const ideaVerdict = computeIdeaVerdict(avg, evidence);
        results.push({
          title: row.ideaTitle ?? "Unknown",
          verdict: ideaVerdict,
          score: avg,
          riskiestAssumption: "",
          evidenceScore: evidence,
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    enhancedComparison = {
      comparisonMatrix: parsed.comparisonMatrix ?? [],
      perIdeaStrengths: parsed.perIdeaStrengths ?? [],
      perIdeaRisks: parsed.perIdeaRisks ?? [],
      bestForFastValidation: parsed.bestForFastValidation ?? { ideaTitle: "", reasoning: "" },
      bestForLongTermUpside: parsed.bestForLongTermUpside ?? { ideaTitle: "", reasoning: "" },
      killTestsPerIdea: parsed.killTestsPerIdea ?? [],
      recommendation: parsed.recommendation ?? { pick: "", caveats: [], reasoning: "" },
      competitorLandscapePerIdea: parsed.competitorLandscapePerIdea,
      nicheOpportunitiesPerIdea: parsed.nicheOpportunitiesPerIdea,
    };
  } catch (err: any) {
    // Minimal fallback
    warnIfError("compareEngine: LLM response failed", err);
    for (const idea of ideas) {
      results.push({
        title: idea.title ?? idea.idea.slice(0, 40),
        verdict: "unclear" as Verdict,
        score: 5,
        riskiestAssumption: "",
        evidenceScore: 1,
      });
    }
  }

  // Overall report verdict: use top-ranked idea's verdict.
  const overallVerdict: Verdict = results.length > 0 ? results[0].verdict : "unclear";

  const comparison: ComparisonResult = {
    ideas: results,
    ranking: results.map((r) => r.title),
    fastestToValidate: enhancedComparison?.bestForFastValidation?.ideaTitle ?? results[0]?.title ?? "",
    highestUpside: enhancedComparison?.bestForLongTermUpside?.ideaTitle ?? results[0]?.title ?? "",
    recommendedPick: enhancedComparison?.recommendation?.pick ?? results[0]?.title ?? "",
  };

  const report: GauntletReport = {
    id, createdAt: now, mode: "compare", input: ideas[0],
    verdict: overallVerdict,
    comparison,
    enhancedComparison,
    nextActions: [`Validate "${comparison.recommendedPick}" first`],
    webResearch: research,
    markdown: "",
  };
  return report;
}

/**
 * Compute a meaningful Verdict for a single idea from its aggregate score and evidence score.
 */
function computeIdeaVerdict(score: number, evidenceScore: number): Verdict {
  if (score >= 8 && evidenceScore >= 5) return "strong";
  if (score >= 7) return "promising_but_risky";
  if (score >= 5) return "unclear";
  if (evidenceScore <= 2 && score < 5) return "needs_real_evidence";
  return "weak";
}
