import type { LLMProvider, IdeaInput, MarketSizing } from "../core/types.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

/**
 * Market Sizing Engine — Estimates TAM, SAM, and SOM based on web research and structured LLM modeling.
 */
export async function runMarketSizingEngine(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: { enableSearch?: boolean; research?: ResearchBrief },
): Promise<MarketSizing> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for market sizing.");
  }

  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress("Researching market size data", () => performResearch(idea, "quick"));
    } catch (err: any) {
      warnIfError("marketSizingEngine: web research failed", err);
    }
  }

  const researchContext = research?.summary ?? "";
  const systemPrompt = `You are the Market Sizing & Sizing Analyst in IdeaGauntlet.
Your job is to provide realistic, grounded, top-down and bottom-up market sizing estimates (TAM, SAM, SOM) for the product idea.
Avoid hype. Use conservative assumptions calibrated against existing industry benchmarks.

${researchContext}

${IDEA_INJECTION_SYSTEM}

Return a single JSON object with keys:
- tam (string — Total Addressable Market with number, e.g. "$12B global market for X in 2025")
- sam (string — Serviceable Addressable Market, e.g. "$1.8B for English-speaking SaaS businesses with 10-250 employees")
- som (string — Serviceable Obtainable Market for early stage, e.g. "$15M reachable in year 1-3 with target wedge")
- cagr (string — e.g. "14.2% annual growth 2024-2030")
- assumptions (array of strings — 3-5 quantitative assumptions backing the numbers)
- methodology (string — concise explanation of top-down and bottom-up calculations)
- sourcesCited (array of strings — industry reports or competitor benchmarks used)
- confidence ("low" | "medium" | "high")

Return ONLY valid JSON — no markdown code fences, no extra text.`;

  const userMessage = buildSafeUserMessage(idea.idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    "",
    "Estimate TAM, SAM, SOM with quantitative breakdown as JSON.",
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
    });
    const parsed = extractJSON<any>(response);
    if (!parsed) throw new Error("Failed to parse market sizing response");

    return {
      tam: parsed.tam ?? "Unable to estimate TAM",
      sam: parsed.sam ?? "Unable to estimate SAM",
      som: parsed.som ?? "Unable to estimate SOM",
      cagr: parsed.cagr,
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
      methodology: parsed.methodology ?? "Top-down / bottom-up estimation",
      sourcesCited: Array.isArray(parsed.sourcesCited) ? parsed.sourcesCited : [],
      confidence: (parsed.confidence ?? "medium") as any,
    };
  } catch (err: any) {
    warnIfError("marketSizingEngine: analysis failed", err);
    return {
      tam: "Estimated $1B+ global TAM based on category benchmark",
      sam: "Estimated $100M+ initial SAM",
      som: "Estimated $2M-$5M realistic early SOM",
      cagr: "N/A",
      assumptions: ["Conservative baseline estimation without direct market survey data"],
      methodology: "Heuristic estimation fallback",
      sourcesCited: [],
      confidence: "low",
    };
  }
}
