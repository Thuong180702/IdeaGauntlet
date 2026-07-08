import { randomUUID } from "node:crypto";
import type { LLMProvider, IdeaInput, GauntletReport, ComparisonResult, ComparedIdea, Verdict, EnhancedComparisonResult } from "../core/types.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { compareWorkflow } from "../workflows/definitions/compare.js";
import { formatForCliPrompt } from "../workflows/formatters/formatForCliPrompt.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";

export async function runCompareEngine(
  ideas: IdeaInput[],
  provider: LLMProvider,
  options?: { enableSearch?: boolean; research?: ResearchBrief },
): Promise<GauntletReport> {
  const id = randomUUID();
  const now = new Date().toISOString();

  // Web research — always-on unless explicitly disabled
  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await performResearch(ideas[0], "compare");
    } catch {
      // Silent fallback
    }
  }

  const systemPrompt = formatForCliPrompt(compareWorkflow, "compare");
  const researchContext = research?.summary ?? "";
  const structuredSystem = `You are the Comparison Analyst in IdeaGauntlet.\n${systemPrompt}\n\n${researchContext}\n\nReturn a single valid JSON object only — no markdown fences, no extra text.`;

  const ideasText = ideas.map((idea, i) =>
    `Idea ${i + 1}: ${idea.title ?? idea.idea.slice(0, 60)}\nDescription: ${idea.idea}`
  ).join("\n\n");

  const userMessage = `${ideasText}\n\nCompare these ideas. Return JSON with: comparisonMatrix (array of {ideaTitle, criteria: {clarity, pain, urgency, marketAccessibility, distribution, monetization, differentiation, buildComplexity, timeToValidate, evidence}}), perIdeaStrengths (array of {ideaTitle, strengths}), perIdeaRisks (array of {ideaTitle, risks}), bestForFastValidation ({ideaTitle, reasoning}), bestForLongTermUpside ({ideaTitle, reasoning}), killTestsPerIdea (array of {ideaTitle, killTests}), recommendation ({pick, caveats, reasoning})`;

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
        const clarity = scores.clarity ?? 5;
        const pain = scores.pain ?? 5;
        const diff = scores.differentiation ?? 5;
        const evidence = scores.evidence ?? 1;
        results.push({
          title: row.ideaTitle ?? "Unknown",
          verdict: "unclear" as Verdict,
          score: Math.round((clarity + pain + diff) / 3),
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
    };
  } catch {
    // Minimal fallback
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

  const comparison: ComparisonResult = {
    ideas: results,
    ranking: results.map((r) => r.title),
    fastestToValidate: enhancedComparison?.bestForFastValidation?.ideaTitle ?? results[0]?.title ?? "",
    highestUpside: enhancedComparison?.bestForLongTermUpside?.ideaTitle ?? results[0]?.title ?? "",
    recommendedPick: enhancedComparison?.recommendation?.pick ?? results[0]?.title ?? "",
  };

  const report: GauntletReport = {
    id, createdAt: now, mode: "compare", input: ideas[0],
    verdict: "unclear" as Verdict,
    comparison,
    enhancedComparison,
    nextActions: [`Validate "${comparison.recommendedPick}" first`],
    webResearch: research,
    markdown: "",
  };
  return report;
}
