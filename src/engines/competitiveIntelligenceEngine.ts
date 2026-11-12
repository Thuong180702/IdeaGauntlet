import type { LLMProvider, IdeaInput, CompetitiveIntelligence, CompetitorProfile } from "../core/types.js";
import { requireAnalysis, toAnalysisFailure } from "../core/analysisError.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

/**
 * Competitive Intelligence Deep Dive Engine
 * Goes beyond heuristic string matching to produce LLM-powered
 * competitor SWOT profiles, a positioning map, strategic windows,
 * attack vectors, and defensive strategies.
 */
export async function runCompetitiveIntelligenceEngine(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: { enableSearch?: boolean; research?: ResearchBrief; depth?: "quick" | "deep" },
): Promise<CompetitiveIntelligence> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for competitive intelligence.");
  }

  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress("Mapping competitor landscape", () => performResearch(idea, "quick"));
    } catch (err: any) {
      warnIfError("competitiveIntelligenceEngine: web research failed", err);
    }
  }

  // Extract known competitors from research to give the LLM real data
  const knownCompetitors = research?.competitorLandscape?.competitors ?? [];
  const competitorContext = knownCompetitors.length > 0
    ? `Known competitors from research:\n${knownCompetitors.map((c) => `- ${c.name} (${c.type}): ${c.pricing ?? "pricing unknown"} | ${c.features?.join(", ") ?? "features unknown"}`).join("\n")}`
    : "No pre-researched competitors found — infer from your training data.";

  const researchContext = research?.summary ?? "";

  const systemPrompt = `You are the Competitive Intelligence Director in IdeaGauntlet.
Your job is to produce a deep, structured competitive analysis for the product idea.
Use the research context and known competitor list below to ground your analysis.

${researchContext}

${competitorContext}

${IDEA_INJECTION_SYSTEM}

Return a single JSON object with these keys:

- competitors (array of up to 7 objects, ordered by competitive threat level: {
    name: string,
    url: string (if known, else null),
    type: "direct"|"indirect"|"substitut",
    estimatedARR: string (e.g. "$2M" or "Unknown"),
    fundingStatus: string (e.g. "Bootstrapped", "Series A $5M", "Unknown"),
    strengths: string[] (3-5 items),
    weaknesses: string[] (3-5 items, be honest about their real gaps),
    positioning: string (one sentence),
    pricing: string (if known),
    targetSegment: string
  })
- positioningMap: {
    xAxis: string (the competitive dimension on X, e.g. "Price: Low → High"),
    yAxis: string (the competitive dimension on Y, e.g. "Simplicity: Simple → Complex"),
    positions: Array<{ name: string, x: number (1-10), y: number (1-10) }>
    (include all competitors AND "Our Product" in positions)
  }
- strategicWindows (array of strings — timing advantages, market gaps, or shifts creating opportunity now)
- attackVectors (array of strings — concrete approaches to take share from incumbents)
- defensiveStrategies (array of strings — how to build defensibility against future entrants)
- marketTiming (string — assessment of whether market timing is good/bad and why)
- summary (string — 3-4 sentences: who wins, why, what's the realistic competitive position)

Return ONLY valid JSON.`;

  const userMessage = buildSafeUserMessage(idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    "",
    "Produce a deep competitive intelligence analysis as JSON.",
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.3,
      maxTokens: 4000,
    });
    const parsed = requireAnalysis(extractJSON<any>(response), "Competitive intelligence", ["summary"]);

    const competitors: CompetitorProfile[] = (parsed.competitors ?? []).map((c: any) => ({
      name: c.name ?? "Unknown",
      url: c.url ?? undefined,
      type: (c.type ?? "indirect") as CompetitorProfile["type"],
      estimatedARR: c.estimatedARR ?? "Unknown",
      fundingStatus: c.fundingStatus ?? "Unknown",
      strengths: Array.isArray(c.strengths) ? c.strengths : [],
      weaknesses: Array.isArray(c.weaknesses) ? c.weaknesses : [],
      positioning: c.positioning ?? "",
      pricing: c.pricing ?? undefined,
      targetSegment: c.targetSegment ?? undefined,
    }));

    return {
      competitors,
      positioningMap: {
        xAxis: parsed.positioningMap?.xAxis ?? "Price: Low → High",
        yAxis: parsed.positioningMap?.yAxis ?? "Feature Depth: Simple → Complex",
        positions: Array.isArray(parsed.positioningMap?.positions) ? parsed.positioningMap.positions : [],
      },
      strategicWindows: Array.isArray(parsed.strategicWindows) ? parsed.strategicWindows : [],
      attackVectors: Array.isArray(parsed.attackVectors) ? parsed.attackVectors : [],
      defensiveStrategies: Array.isArray(parsed.defensiveStrategies) ? parsed.defensiveStrategies : [],
      marketTiming: parsed.marketTiming ?? "Timing assessment requires more market data.",
      summary: parsed.summary ?? "Competitive intelligence analysis completed.",
    };
  } catch (err) {
    // No placeholder result: a made-up finding is worse than an explicit failure.
    throw toAnalysisFailure("Competitive intelligence", err);
  }
}

export function formatCompetitiveIntelligenceReport(result: CompetitiveIntelligence): string {
  const lines: string[] = [];
  lines.push("# Competitive Intelligence Report\n");
  lines.push(`**Market Timing:** ${result.marketTiming}\n`);
  lines.push(`${result.summary}\n`);

  if (result.competitors.length > 0) {
    lines.push("## Competitor Profiles\n");
    for (const c of result.competitors) {
      const threatIcon = c.type === "direct" ? "🔴" : c.type === "indirect" ? "🟡" : "🟢";
      lines.push(`### ${threatIcon} ${c.name} (${c.type})`);
      if (c.url) lines.push(`🔗 ${c.url}`);
      lines.push(`**Positioning:** ${c.positioning}`);
      if (c.pricing) lines.push(`**Pricing:** ${c.pricing}`);
      if (c.estimatedARR && c.estimatedARR !== "Unknown") lines.push(`**Est. ARR:** ${c.estimatedARR}`);
      if (c.fundingStatus && c.fundingStatus !== "Unknown") lines.push(`**Funding:** ${c.fundingStatus}`);
      lines.push(`\n✅ **Strengths:** ${c.strengths.join(" | ")}`);
      lines.push(`❌ **Weaknesses:** ${c.weaknesses.join(" | ")}\n`);
    }
  }

  lines.push("## Positioning Map\n");
  lines.push(`**X-axis:** ${result.positioningMap.xAxis}  |  **Y-axis:** ${result.positioningMap.yAxis}\n`);
  if (result.positioningMap.positions.length > 0) {
    lines.push("| Player | X (1-10) | Y (1-10) |");
    lines.push("|---|---|---|");
    for (const p of result.positioningMap.positions) {
      const icon = p.name === "Our Product" ? "⭐" : "";
      lines.push(`| ${icon} ${p.name} | ${p.x} | ${p.y} |`);
    }
    lines.push("");
  }

  lines.push("## Strategic Windows 🪟\n");
  for (const w of result.strategicWindows) lines.push(`- ${w}`);
  lines.push("");

  lines.push("## Attack Vectors ⚔️\n");
  for (const a of result.attackVectors) lines.push(`- ${a}`);
  lines.push("");

  lines.push("## Defensive Strategies 🛡️\n");
  for (const d of result.defensiveStrategies) lines.push(`- ${d}`);
  lines.push("\n---\n*Competitive intelligence by IdeaGauntlet*\n");
  return lines.join("\n");
}
