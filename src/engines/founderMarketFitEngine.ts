import type { LLMProvider, IdeaInput, FounderMarketFit } from "../core/types.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { warnIfError } from "../utils/warn.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

/**
 * Founder-Market Fit Analysis Engine
 *
 * Evaluates the match between a founder's background/skills/network
 * and the demands of the specific product idea. Identifies unfair
 * advantages, expertise gaps, and co-founder profile recommendations.
 *
 * Note: This engine does NOT perform web research (no search needed).
 * It only needs the founder's self-reported background.
 */
export async function runFounderMarketFitEngine(
  idea: IdeaInput,
  provider: LLMProvider,
  founderBackground: string,
): Promise<FounderMarketFit> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for founder-market fit analysis.");
  }
  if (!founderBackground?.trim()) {
    throw new Error("Founder background is required. Describe experience, skills, domain knowledge, and network.");
  }

  const systemPrompt = `You are the Founder-Market Fit Analyst in IdeaGauntlet.
Your job is to objectively assess whether this founder's background, skills, network, and domain experience
give them an UNFAIR ADVANTAGE to build this specific product — or whether critical gaps exist.

Be direct and honest. Highlight genuine strengths, not generic compliments.
Point out specific gaps that would increase execution risk.

${IDEA_INJECTION_SYSTEM}

Return a single JSON object with these keys:

- backgroundSummary (string — 2 sentence summary of the founder's relevant background)
- domainExpertiseScore (number 1-10, where 10 = built something almost identical before, 1 = no relevant domain knowledge)
- networkAdvantageScore (number 1-10, where 10 = direct access to every target customer, 1 = no relevant network)
- executionRiskScore (number 1-10, where 10 = VERY HIGH execution risk / likely to fail from execution gap, 1 = very low risk)
- expertiseGaps (array of strings — specific skills, knowledge, or experience the founder lacks that matter for this idea)
- unfairAdvantages (array of strings — genuine, specific advantages this founder has over random competitors)
- recommendedCoFounderProfile (string — detailed description of the ideal co-founder to fill gaps)
- firstHireRecommendations (array of strings — first 3 hires and why, in order of priority)
- fitVerdict ("strong_fit" | "moderate_fit" | "weak_fit" | "needs_cofounder")
  - strong_fit: Founder has deep domain expertise AND network AND execution capability
  - moderate_fit: 1-2 key strengths, 1-2 manageable gaps
  - weak_fit: Founder lacks domain knowledge AND network in the target market
  - needs_cofounder: Critical gap that a co-founder could fill — not a blocker but high risk solo
- fitSummary (string — 3-4 sentences, honest assessment of fit and specific actions the founder should take)

Return ONLY valid JSON.`;

  const userMessage = buildSafeUserMessage(idea.idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    "",
    "FOUNDER BACKGROUND:",
    founderBackground,
    "",
    "Assess founder-market fit and return JSON.",
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.4,
      maxTokens: 2500,
    });
    const parsed = extractJSON<any>(response);
    if (!parsed) throw new Error("Failed to parse founder-market fit response");

    return {
      backgroundSummary: parsed.backgroundSummary ?? "Background summary unavailable",
      domainExpertiseScore: Number(parsed.domainExpertiseScore ?? 5),
      networkAdvantageScore: Number(parsed.networkAdvantageScore ?? 5),
      executionRiskScore: Number(parsed.executionRiskScore ?? 5),
      expertiseGaps: Array.isArray(parsed.expertiseGaps) ? parsed.expertiseGaps : [],
      unfairAdvantages: Array.isArray(parsed.unfairAdvantages) ? parsed.unfairAdvantages : [],
      recommendedCoFounderProfile: parsed.recommendedCoFounderProfile ?? "Co-founder profile analysis unavailable",
      firstHireRecommendations: Array.isArray(parsed.firstHireRecommendations) ? parsed.firstHireRecommendations : [],
      fitVerdict: (parsed.fitVerdict ?? "moderate_fit") as FounderMarketFit["fitVerdict"],
      fitSummary: parsed.fitSummary ?? "Founder-market fit analysis completed.",
    };
  } catch (err: any) {
    warnIfError("founderMarketFitEngine: analysis failed", err);
    return {
      backgroundSummary: "Analysis failed — could not assess founder background",
      domainExpertiseScore: 5,
      networkAdvantageScore: 5,
      executionRiskScore: 5,
      expertiseGaps: ["Unable to assess — analysis failed"],
      unfairAdvantages: ["Unable to assess — analysis failed"],
      recommendedCoFounderProfile: "Co-founder assessment failed — try again with a detailed background description",
      firstHireRecommendations: [],
      fitVerdict: "moderate_fit",
      fitSummary: "Founder-market fit analysis failed. Please provide a detailed background description and retry.",
    };
  }
}

export function formatFounderMarketFitReport(result: FounderMarketFit): string {
  const lines: string[] = [];
  lines.push("# Founder-Market Fit Report\n");

  const verdictLabel: Record<FounderMarketFit["fitVerdict"], string> = {
    strong_fit: "✅ Strong Fit",
    moderate_fit: "🟡 Moderate Fit",
    weak_fit: "❌ Weak Fit",
    needs_cofounder: "⚠️ Needs Co-Founder",
  };
  lines.push(`**Verdict: ${verdictLabel[result.fitVerdict]}**\n`);
  lines.push(`${result.backgroundSummary}\n`);
  lines.push(`${result.fitSummary}\n`);

  lines.push("## Fit Scorecard\n");
  lines.push("| Dimension | Score | Rating |");
  lines.push("|---|---|---|");

  const scoreBar = (s: number) => "█".repeat(Math.round(s / 2)) + "░".repeat(5 - Math.round(s / 2));
  const domainRating = result.domainExpertiseScore >= 7 ? "🟢 Strong" : result.domainExpertiseScore >= 4 ? "🟡 Moderate" : "🔴 Weak";
  const networkRating = result.networkAdvantageScore >= 7 ? "🟢 Strong" : result.networkAdvantageScore >= 4 ? "🟡 Moderate" : "🔴 Weak";
  const execRisk = result.executionRiskScore >= 7 ? "🔴 High" : result.executionRiskScore >= 4 ? "🟡 Medium" : "🟢 Low";
  lines.push(`| Domain Expertise | ${result.domainExpertiseScore}/10 ${scoreBar(result.domainExpertiseScore)} | ${domainRating} |`);
  lines.push(`| Network Advantage | ${result.networkAdvantageScore}/10 ${scoreBar(result.networkAdvantageScore)} | ${networkRating} |`);
  lines.push(`| Execution Risk | ${result.executionRiskScore}/10 ${scoreBar(result.executionRiskScore)} | ${execRisk} |`);
  lines.push("");

  if (result.unfairAdvantages.length > 0) {
    lines.push("## 💪 Unfair Advantages\n");
    for (const a of result.unfairAdvantages) lines.push(`- ${a}`);
    lines.push("");
  }

  if (result.expertiseGaps.length > 0) {
    lines.push("## 🚨 Expertise Gaps\n");
    for (const g of result.expertiseGaps) lines.push(`- ${g}`);
    lines.push("");
  }

  lines.push("## 🤝 Recommended Co-Founder Profile\n");
  lines.push(result.recommendedCoFounderProfile + "\n");

  if (result.firstHireRecommendations.length > 0) {
    lines.push("## 👥 First Hire Recommendations\n");
    for (let i = 0; i < result.firstHireRecommendations.length; i++) {
      lines.push(`${i + 1}. ${result.firstHireRecommendations[i]}`);
    }
    lines.push("");
  }

  lines.push("---\n*Founder-market fit analysis by IdeaGauntlet*\n");
  return lines.join("\n");
}
