import type { WebSearchProvider, SearchResult } from "./types.js";

/**
 * DuckDuckGo HTML search provider — free, no API key required.
 *
 * Uses the HTML endpoint (html.duckduckgo.com/html/) and parses the results
 * from the returned HTML. This is the default search provider.
 *
 * Rate limiting: built-in 500ms delay between requests.
 */

const DDG_HTML_URL = "https://html.duckduckgo.com/html/";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export class DuckDuckGoProvider implements WebSearchProvider {
  kind = "duckduckgo" as const;
  private lastRequestTime = 0;
  private readonly minDelayMs = 500;

  async search(query: string, maxResults = 5): Promise<SearchResult[]> {
    // Rate limit
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minDelayMs) {
      await sleep(this.minDelayMs - elapsed);
    }
    this.lastRequestTime = Date.now();

    const params = new URLSearchParams({ q: query });
    const url = `${DDG_HTML_URL}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned ${response.status}`);
    }

    const html = await response.text();
    return parseDuckDuckGoHtml(html, maxResults);
  }
}

/**
 * Parse DuckDuckGo HTML results page.
 * DDG wraps results in `<a class="result__a" href="...">title</a>`
 * with snippets in `<a class="result__snippet">...</a>`.
 */
function parseDuckDuckGoHtml(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  // Match result links: <a class="result__a" href="...">Title text</a>
  const linkRegex =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null && results.length < maxResults) {
    const rawUrl = match[1];
    const titleHtml = match[2];

    // DDG wraps URLs in a redirect: //duckduckgo.com/l/?uddg=<encoded_url>
    let url = rawUrl;
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch {
        url = rawUrl;
      }
    }
    // Strip HTML tags from title
    const title = stripHtml(titleHtml).trim();

    // Find snippet — look for result__snippet near this position
    const snippetStart = linkRegex.lastIndex;
    const remainingHtml = html.slice(snippetStart, snippetStart + 2000);
    const snippetMatch = remainingHtml.match(
      /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/,
    );
    const snippet = snippetMatch
      ? stripHtml(snippetMatch[1]).trim()
      : "";

    if (title && url) {
      results.push({ title, url, snippet });
    }
  }

  return results;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
