/**
 * Hacker News provider — searches via the Algolia HN Search API.
 * Zero-token, structured JSON results.
 *
 * HN discussions reveal real user complaints, feature requests,
 * and community sentiment about products — gold for niche detection.
 */

import type { WebSearchProvider, SearchResult } from "./types.js";

const HN_SEARCH_URL = "https://hn.algolia.com/api/v1/search";

export class HackerNewsProvider implements WebSearchProvider {
  kind = "custom" as const;

  async search(query: string, maxResults = 5): Promise<SearchResult[]> {
    try {
      const params = new URLSearchParams({
        query,
        tags: "story",
        hitsPerPage: String(Math.min(maxResults * 2, 20)),
      });

      const response = await fetch(`${HN_SEARCH_URL}?${params}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) return [];

      const data = (await response.json()) as any;
      const hits = data?.hits ?? [];

      return hits
        .filter((hit: any) => hit.title || hit.story_title)
        .slice(0, maxResults)
        .map((hit: any) => ({
          title: hit.title || hit.story_title || "",
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          snippet: `${hit.points ?? 0} points | ${hit.num_comments ?? 0} comments | ${hit.author ? "by " + hit.author : ""} | ${hit.created_at?.slice(0, 10) ?? ""}`,
        }));
    } catch {
      return [];
    }
  }
}
