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
}

export interface WebSearchProvider {
  kind: "duckduckgo" | "serper" | "custom";
  search(query: string, maxResults?: number): Promise<SearchResult[]>;
}

export interface SearchConfig {
  provider: "duckduckgo" | "serper";
  apiKey?: string;
  maxResultsPerQuery: number;
  maxQueries: number;
  timeoutMs: number;
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  provider: "duckduckgo",
  apiKey: undefined,
  maxResultsPerQuery: 5,
  maxQueries: 5,
  timeoutMs: 15000,
};
