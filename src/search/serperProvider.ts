import type { WebSearchProvider, SearchResult } from "./types.js";

/**
 * SerperAPI search provider — uses google.serper.dev.
 * Requires API key via IDEAGAUNTLET_SEARCH_API_KEY.
 * Higher quality results than DuckDuckGo, faster, but costs money.
 *
 * Get a free key (2,500 searches/month) at https://serper.dev
 */

const SERPER_URL = "https://google.serper.dev/search";

export class SerperProvider implements WebSearchProvider {
  kind = "serper" as const;
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("SerperProvider requires an API key");
    this.apiKey = apiKey;
  }

  async search(query: string, maxResults = 5): Promise<SearchResult[]> {
    const response = await fetch(SERPER_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: maxResults }),
    });

    if (!response.ok) {
      throw new Error(`SerperAPI returned ${response.status}`);
    }

    const data = await response.json() as any;
    const organic = data.organic ?? [];

    return organic.slice(0, maxResults).map((r: any) => ({
      title: r.title ?? "",
      url: r.link ?? "",
      snippet: r.snippet ?? "",
    }));
  }
}
