import type {
  WebSearchProvider,
  SearchResult,
  ResearchBrief,
  SearchConfig,
  PageContent,
} from "./types.js";
import { DEFAULT_SEARCH_CONFIG } from "./types.js";
import { DuckDuckGoProvider } from "./duckDuckGoProvider.js";
import { SerperProvider } from "./serperProvider.js";
import { ProductHuntProvider } from "./productHuntProvider.js";
import { GitHubProvider } from "./gitHubProvider.js";
import { HackerNewsProvider } from "./hackerNewsProvider.js";
import { fetchPageContent, fetchPageContents } from "./pageFetcher.js";
import { fetchPagesPlaywright } from "./playwrightFetcher.js";
import { checkLivenessBatch } from "./playwrightFetcher.js";
import { analyzeCompetitors } from "./competitorAnalyzer.js";
import { detectNiches } from "./nicheDetector.js";
import type { IdeaInput, GauntletMode } from "../core/types.js";
import { warnIfError } from "../utils/warn.js";
import { SearchCache, searchCacheKey, pageCacheKey } from "./cache.js";

/** Module-level cache — persists for CLI session lifetime. */
const _cache = new SearchCache();

/** Run async tasks with a concurrency limit. */
async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;
  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

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

  switch (provider) {
    case "producthunt":
      return new ProductHuntProvider();
    case "github":
      return new GitHubProvider();
    case "hackernews":
      return new HackerNewsProvider();
    case "serper":
      return new SerperProvider(apiKey ?? "");
    default:
      return new DuckDuckGoProvider();
  }
}

/**
 * Get supplementary providers for multi-source research.
 * Always returns GitHub + HackerNews + ProductHunt for tech/product ideas.
 * These run in parallel with the primary provider.
 */
function getSupplementaryProviders(): WebSearchProvider[] {
  return [new GitHubProvider(), new HackerNewsProvider(), new ProductHuntProvider()];
}

/**
 * Generate mode-specific search queries for an idea.
 * Each mode needs different research focus.
 * Deepened: pricing, complaints, underserved segments, niche queries.
 */
/**
 * Sanitize a search query — strip control chars, limit length, remove shell metacharacters.
 * Prevents query injection in search provider URLs.
 */
export function sanitizeQuery(query: string): string {
  return query
    // Remove control characters (incl. \n, \r, \t, null bytes)
    .replace(/[\x00-\x1f\x7f]/g, " ")
    // Remove shell metacharacters that could be dangerous in spawn contexts
    .replace(/[`$\\]/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export function generateQueries(idea: IdeaInput, mode: GauntletMode): string[] {
  const ideaText = sanitizeQuery(idea.idea);
  const market = sanitizeQuery(idea.market ?? "");
  const users = idea.targetUsers?.map(sanitizeQuery).join(", ") ?? "";

  switch (mode) {
    case "quick":
      return [
        `${ideaText} competitors alternatives`,
        `${ideaText} market size demand trends`,
        market ? `${ideaText} ${market} willingness to pay pricing` : `${ideaText} pricing model "per month" OR "per year" OR "free"`,
        `${ideaText} "I wish" OR "frustrating" OR "missing feature"`,
        `${ideaText} review pros cons`,
        market ? `${ideaText} ${market} underserved OR niche` : `${ideaText} underserved niche`,
        `${ideaText} alternatives for "small business" OR "startups" OR "individuals"`,
      ];

    case "court":
      return [
        `${ideaText} market size growth trends`,
        `${ideaText} competitors alternatives pricing`,
        `${ideaText} user complaints reviews problems`,
        users ? `${ideaText} ${users} needs behavior` : `${ideaText} target user behavior`,
        `${ideaText} privacy regulatory concerns`,
        `${ideaText} "I wish" OR "frustrating" OR "missing feature" OR "alternative to"`,
        `${ideaText} pricing "per month" OR "per year" OR "free plan"`,
        `${ideaText} underserved segment OR niche OR niche market`,
      ];

    case "users":
      return [
        `${ideaText} target user segments demographics`,
        `${ideaText} user pain points complaints`,
        users ? `${ideaText} ${users} needs behavior` : `${ideaText} user needs`,
        `${ideaText} current workarounds alternatives`,
        `${ideaText} "I wish" OR "frustrating" OR "hate" OR "missing"`,
        `${ideaText} alternatives for "small business" OR "freelancers" OR "students" OR "beginners"`,
      ];

    case "mvp":
      return [
        `${ideaText} minimum viable product features`,
        `${ideaText} validation test landing page`,
        `${ideaText} competitors MVP features`,
        `${ideaText} build vs buy technical feasibility`,
        `${ideaText} competitors pricing "per month" OR "free"`,
        `${ideaText} "frustrating" OR "missing feature" OR "alternative to"`,
        `${ideaText} niche OR underserved segment`,
      ];

    case "compare":
      return [
        `${ideaText} competitors comparison`,
        `${ideaText} market opportunity`,
        `${ideaText} which is better alternatives`,
        `${ideaText} pricing "per month" OR "free"`,
        `${ideaText} "frustrating" OR "missing" OR "I wish"`,
        `${ideaText} niche OR underserved`,
      ];

    default:
      return [`${ideaText} competitors`, `${ideaText} market`, `${ideaText} pricing`];
  }
}

/**
 * Fetch page content with 2-tier fallback:
 * 1. Cheap fetch() + HTML strip
 * 2. Playwright headless browser for JS-rendered sites
 *
 * Also runs liveness check before fetching to skip 404/paywalled pages.
 */
async function fetchPagesWithFallback(
  urls: string[],
  options?: { timeoutMs?: number; maxChars?: number; concurrency?: number },
): Promise<PageContent[]> {
  const maxChars = options?.maxChars ?? 8_000;
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const concurrency = options?.concurrency ?? 3;

  // Step 1: Liveness check — skip dead URLs
  const aliveUrls = await checkLivenessBatch(urls, 5_000);
  if (aliveUrls.length === 0) return [];

  // Check cache for already-fetched pages
  const cachedPages: PageContent[] = [];
  const uncachedUrls: string[] = [];
  for (const url of aliveUrls) {
    const cached = _cache.get<PageContent>(pageCacheKey(url));
    if (cached) {
      cachedPages.push(cached);
    } else {
      uncachedUrls.push(url);
    }
  }

  if (uncachedUrls.length === 0) return cachedPages;

  // Step 2: Try cheap fetch() first
  const cheapResults = await fetchPageContents(uncachedUrls, {
    timeoutMs,
    maxChars,
    concurrency,
  });

  // Cache fetched results
  for (const r of cheapResults) {
    _cache.set(pageCacheKey(r.url), r);
  }

  // If we got good results from most URLs, return them with cached
  const allCheap = [...cachedPages, ...cheapResults];
  if (cheapResults.length >= Math.ceil(uncachedUrls.length * 0.6)) {
    return allCheap;
  }

  // Step 3: For URLs where cheap fetch failed, try Playwright
  const fetchedUrls = new Set(cheapResults.map((r) => r.url));
  const missingUrls = uncachedUrls.filter((url) => !fetchedUrls.has(url));

  if (missingUrls.length === 0) return allCheap;

  const playwrightResults = await fetchPagesPlaywright(missingUrls, {
    timeoutMs,
    maxChars,
    concurrency,
  });

  // Cache Playwright results too
  for (const r of playwrightResults) {
    _cache.set(pageCacheKey(r.url), r);
  }

  // Merge results — cached + cheap + playwright
  return [...allCheap, ...playwrightResults];
}

/**
 * Perform web research for an idea in a given mode.
 * Uses multi-provider search (DuckDuckGo + GitHub + HN + ProductHunt),
 * then fetches page contents with Playwright fallback,
 * runs competitor analysis and niche detection.
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

  // Run primary provider queries
  const allResults: SearchResult[] = [];
  const perQueryResults: Record<string, SearchResult[]> = {};

  // Run primary provider queries with concurrency limit (4 at a time).
  // DuckDuckGo rate-limits internally (500ms between calls per provider instance).
  const queryTasks = queries.map((query) => async () => {
    try {
      const cacheKey = searchCacheKey(searchProvider.kind, query, cfg.maxResultsPerQuery);
      const results = await _cache.getOrCompute(cacheKey, () =>
        searchProvider.search(query, cfg.maxResultsPerQuery),
      );
      perQueryResults[query] = results;
      return results;
    } catch (err: any) {
      warnIfError(`searchOrchestrator: query "${query}" failed`, err);
      perQueryResults[query] = [];
      return [];
    }
  });

  const queryResults = await withConcurrency(queryTasks, 4);
  for (const results of queryResults) {
    allResults.push(...results);
  }

  // Run supplementary providers in parallel (GitHub, HN, ProductHunt)
  const supplementary = getSupplementaryProviders();
  const supplementaryQuery = sanitizeQuery(`${idea.idea} ${idea.market ?? ""}`.trim());

  const supplementaryResults = await Promise.all(
    supplementary.map(async (p) => {
      try {
        return await p.search(supplementaryQuery, 5);
      } catch (err: any) {
        warnIfError(`searchOrchestrator: supplementary provider "${p.kind}" failed`, err);
        return [];
      }
    }),
  );

  // Merge supplementary results
  for (const results of supplementaryResults) {
    allResults.push(...results);
  }
  perQueryResults["[supplementary: github+hackernews+producthunt]"] = supplementaryResults.flat();

  // Fetch page contents from top unique URLs (max 8 for deeper analysis)
  const urlsToFetch = [...new Set(allResults.map((r) => r.url))]
    .filter((url) => !isSocialMedia(url) && !isKnownApiUrl(url))
    .slice(0, 8);

  const pageContents = await fetchPagesWithFallback(urlsToFetch, {
    timeoutMs: 15_000,
    maxChars: 8_000,
    concurrency: 3,
  });

  // Competitor analysis
  const competitorLandscape = analyzeCompetitors(
    idea.idea,
    allResults,
    pageContents.length > 0 ? pageContents : undefined,
  );

  // Niche detection
  const nicheOpportunities = detectNiches(
    idea.idea,
    competitorLandscape,
    allResults,
    pageContents.length > 0 ? pageContents : undefined,
  );

  const summary = formatResearchBrief(
    queries,
    perQueryResults,
    pageContents,
    competitorLandscape,
    nicheOpportunities,
  );

  return {
    queries,
    results: allResults,
    summary,
    searchedAt: new Date().toISOString(),
    pageContents: pageContents.length > 0 ? pageContents : undefined,
    competitorLandscape,
    nicheOpportunities: nicheOpportunities.length > 0 ? nicheOpportunities : undefined,
  };
}

/**
 * Format search results + competitor + niche data into a text brief
 * for LLM system prompt injection.
 */
function formatResearchBrief(
  queries: string[],
  perQueryResults: Record<string, SearchResult[]>,
  pageContents: PageContent[],
  competitorLandscape: ResearchBrief["competitorLandscape"],
  nicheOpportunities: ResearchBrief["nicheOpportunities"],
): string {
  const lines: string[] = [
    "=== WEB RESEARCH BRIEF ===",
    "The following real-world information was gathered from web search (DuckDuckGo + GitHub + Hacker News + Product Hunt). You MUST ground your analysis in this evidence. Cite competitors by name. If no competitor data exists, explicitly state 'No competitor data found'.",
    "",
  ];

  // Standard search results
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

  // Supplementary provider results
  const suppResults = perQueryResults["[supplementary: github+hackernews+producthunt]"] ?? [];
  if (suppResults.length > 0) {
    lines.push("--- Supplementary Sources (GitHub + Hacker News + Product Hunt) ---");
    for (const r of suppResults) {
      lines.push(`• ${r.title}`);
      lines.push(`  URL: ${r.url}`);
      if (r.snippet) lines.push(`  ${r.snippet}`);
      lines.push("");
    }
  }

  // Competitor landscape
  if (competitorLandscape && competitorLandscape.competitors.length > 0) {
    lines.push("=== COMPETITOR LANDSCAPE ===");
    lines.push(`Saturation: ${competitorLandscape.saturationLevel} (${competitorLandscape.competitors.length} competitors found)`);
    lines.push(competitorLandscape.analysisNote);
    lines.push("");

    competitorLandscape.competitors.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name} (${c.type}) — ${c.url}`);
      if (c.pricing) lines.push(`   Pricing: ${c.pricing}`);
      if (c.features && c.features.length > 0) lines.push(`   Features: ${c.features.join(", ")}`);
      if (c.weaknesses && c.weaknesses.length > 0) lines.push(`   Weaknesses: ${c.weaknesses.join("; ")}`);
      if (c.notes) lines.push(`   Notes: ${c.notes}`);
      lines.push("");
    });
  } else {
    lines.push("=== COMPETITOR LANDSCAPE ===");
    lines.push("No direct competitors found in search results. This may indicate a blue ocean opportunity OR lack of market demand — investigate further.");
    lines.push("");
  }

  // Niche opportunities
  if (nicheOpportunities && nicheOpportunities.length > 0) {
    lines.push("=== NICHE OPPORTUNITIES ===");
    lines.push("If the market is saturated, consider these edge opportunities:");
    lines.push("");
    nicheOpportunities.forEach((n, i) => {
      lines.push(`${i + 1}. [${n.type}] ${n.description}`);
      lines.push(`   Evidence: ${n.evidence}`);
      lines.push(`   Wedge: ${n.wedgeIdea}`);
      lines.push(`   Why now: ${n.whyNow}`);
      lines.push("");
    });
  }

  // Deep page content excerpts (increased to 2000 chars per page for richer context)
  if (pageContents.length > 0) {
    lines.push("=== DEEP PAGE CONTENT ===");
    lines.push("Excerpts from competitor/relevant pages (up to 2000 chars each):");
    lines.push("");
    for (const page of pageContents.slice(0, 6)) {
      lines.push(`--- ${page.title} (${page.url}) ---`);
      if (page.description) lines.push(`Description: ${page.description}`);
      lines.push(page.text.slice(0, 2000));
      lines.push("");
    }
  }

  lines.push("=== END RESEARCH BRIEF ===");
  return lines.join("\n");
}

function isSocialMedia(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("reddit.com/") ||
    lower.includes("youtube.com/") ||
    lower.includes("twitter.com/") ||
    lower.includes("x.com/") ||
    lower.includes("facebook.com/") ||
    lower.includes("instagram.com/");
}

/**
 * Filter out API endpoints and known non-html URLs that would waste fetch budget.
 */
function isKnownApiUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("api.github.com/") ||
    lower.includes("hn.algolia.com/") ||
    lower.includes("producthunt.com/frontend/graphql") ||
    lower.includes("api.greenhouse.io/") ||
    lower.includes("api.ashbyhq.com/");
}
