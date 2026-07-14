/**
 * Web search types for IdeaGauntlet.
 *
 * Every engine calls `performResearch()` before sending the prompt to the LLM.
 * The research brief is injected into the system prompt so the LLM has real-world context.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// ─── Page content (fetched from URLs) ───────────────────────────

export interface PageContent {
  url: string;
  title: string;
  text: string;
  description?: string;
}

// ─── Competitor analysis ───────────────────────────────────────

export interface CompetitorInfo {
  name: string;
  url: string;
  type: "direct" | "indirect";
  pricing?: string;
  features?: string[];
  weaknesses?: string[];
  notes?: string;
}

export interface CompetitorLandscape {
  competitors: CompetitorInfo[];
  saturationLevel: "low" | "medium" | "high" | "unknown";
  analysisNote: string;
}

// ─── Niche opportunities ───────────────────────────────────────

export type NicheType =
  | "underserved_segment"
  | "feature_gap"
  | "pricing_gap"
  | "use_case_gap"
  | "geographic_gap"
  | "integration_gap"
  | "workflow_gap"
  | "industry_vertical_gap";

export interface NicheOpportunity {
  type: NicheType;
  description: string;
  evidence: string;
  wedgeIdea: string;
  whyNow: string;
}

// ─── Research brief (aggregated) ───────────────────────────────

export interface ResearchBrief {
  /** The search queries that were executed. */
  queries: string[];
  /** Aggregated results from all queries. */
  results: SearchResult[];
  /** Text summary formatted for injection into LLM system prompt. */
  summary: string;
  /** Which research role generated this brief (court mode). */
  role?: string;
  /** Timestamp of research. */
  searchedAt: string;
  /** Full page contents fetched from top result URLs. */
  pageContents?: PageContent[];
  /** Structured competitor landscape. */
  competitorLandscape?: CompetitorLandscape;
  /** Detected niche / edge opportunities. */
  nicheOpportunities?: NicheOpportunity[];
}

export interface WebSearchProvider {
  kind: "duckduckgo" | "serper" | "producthunt" | "github" | "hackernews" | "custom";
  search(query: string, maxResults?: number): Promise<SearchResult[]>;
}

export interface SearchConfig {
  provider: "duckduckgo" | "serper" | "producthunt" | "github" | "hackernews";
  apiKey?: string;
  maxResultsPerQuery: number;
  maxQueries: number;
  timeoutMs: number;
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  provider: "duckduckgo",
  apiKey: undefined,
  maxResultsPerQuery: 5,
  maxQueries: 8,
  timeoutMs: 15000,
};
