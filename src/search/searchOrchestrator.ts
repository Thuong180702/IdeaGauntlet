import type {
  WebSearchProvider,
  SearchResult,
  ResearchBrief,
  SearchConfig,
} from "./types.js";
import { DEFAULT_SEARCH_CONFIG } from "./types.js";
import { DuckDuckGoProvider } from "./duckDuckGoProvider.js";
import { SerperProvider } from "./serperProvider.js";
import type { IdeaInput, GauntletMode } from "../core/types.js";

/**
 * Resolves the search provider based on env vars and config.
 *
 * Priority:
 * 1. IDEAGAUNTLET_SEARCH_API_KEY + IDEAGAUNTLET_SEARCH_PROVIDER=serper → SerperProvider
 * 2. Default → DuckDuckGoProvider (free, no key needed)
 */
export function resolveSearchProvider(
  config?: Partial<SearchConfig>,
): WebSearchProvider {
  const apiKey = process.env.IDEAGAUNTLET_SEARCH_API_KEY;
  const provider = process.env.IDEAGAUNTLET_SEARCH_PROVIDER ?? config?.provider;

  if (apiKey && (provider === "serper" || !provider)) {
    return new SerperProvider(apiKey);
  }

  return new DuckDuckGoProvider();
}

/**
 * Generate mode-specific search queries for an idea.
 * Each mode needs different research focus.
 */
export function generateQueries(idea: IdeaInput, mode: GauntletMode): string[] {
  const ideaText = idea.idea;
  const market = idea.market ?? "";
  const users = idea.targetUsers?.join(", ") ?? "";

  switch (mode) {
    case "quick":
      return [
        `${ideaText} competitors alternatives`,
        `${ideaText} market size demand trends`,
        market ? `${ideaText} ${market} willingness to pay pricing` : `${ideaText} pricing model`,
      ];

    case "court":
      return [
        `${ideaText} market size growth trends`,
        `${ideaText} competitors alternatives pricing`,
        `${ideaText} user complaints reviews problems`,
        users ? `${ideaText} ${users} needs behavior` : `${ideaText} target user behavior`,
        `${ideaText} privacy regulatory concerns`,
      ];

    case "users":
      return [
        `${ideaText} target user segments demographics`,
        `${ideaText} user pain points complaints`,
        users ? `${ideaText} ${users} needs behavior` : `${ideaText} user needs`,
        `${ideaText} current workarounds alternatives`,
      ];

    case "mvp":
      return [
        `${ideaText} minimum viable product features`,
        `${ideaText} validation test landing page`,
        `${ideaText} competitors MVP features`,
        `${ideaText} build vs buy technical feasibility`,
      ];

    case "compare":
      return [
        `${ideaText} competitors comparison`,
        `${ideaText} market opportunity`,
        `${ideaText} which is better alternatives`,
      ];

    default:
      return [`${ideaText} competitors`, `${ideaText} market`];
  }
}

/**
 * Perform web research for an idea in a given mode.
 * Calls the search provider, aggregates results, and returns a brief
 * formatted for injection into the LLM system prompt.
 */
export async function performResearch(
  idea: IdeaInput,
  mode: GauntletMode,
  config?: Partial<SearchConfig>,
  provider?: WebSearchProvider,
): Promise<ResearchBrief> {
  const cfg = { ...DEFAULT_SEARCH_CONFIG, ...config };
  const searchProvider = provider ?? resolveSearchProvider(cfg);
  const queries = generateQueries(idea, mode).slice(0, cfg.maxQueries);

  const allResults: SearchResult[] = [];
  const perQueryResults: Record<string, SearchResult[]> = {};

  for (const query of queries) {
    try {
      const results = await searchProvider.search(query, cfg.maxResultsPerQuery);
      perQueryResults[query] = results;
      allResults.push(...results);
    } catch {
      // Silently skip failed queries
      perQueryResults[query] = [];
    }
  }

  const summary = formatResearchBrief(queries, perQueryResults);

  return {
    queries,
    results: allResults,
    summary,
    searchedAt: new Date().toISOString(),
  };
}

/**
 * Format search results into a text brief for LLM system prompt injection.
 * Includes source URLs so the LLM can cite real evidence.
 */
function formatResearchBrief(
  queries: string[],
  perQueryResults: Record<string, SearchResult[]>,
): string {
  const lines: string[] = [
    "=== WEB RESEARCH BRIEF ===",
    "The following real-world information was gathered from web search. Use this evidence to ground your analysis. Cite sources where relevant.",
    "",
  ];

  for (const query of queries) {
    const results = perQueryResults[query] ?? [];
    if (results.length === 0) continue;

    lines.push(`--- Query: "${query}" ---`);
    for (const r of results) {
      lines.push(`• ${r.title}`);
      lines.push(`  URL: ${r.url}`);
      if (r.snippet) lines.push(`  ${r.snippet}`);
      lines.push("");
    }
  }

  if (lines.length <= 3) {
    return "=== WEB RESEARCH BRIEF ===\nNo search results found. Proceed with analysis based on your knowledge.";
  }

  return lines.join("\n");
}
