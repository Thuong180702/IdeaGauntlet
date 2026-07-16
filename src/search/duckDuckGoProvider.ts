import type { WebSearchProvider, SearchResult } from "./types.js";
import { warnIfError } from "../utils/warn.js";

/**
 * DuckDuckGo HTML search provider — free, no API key required.
 *
 * Uses the HTML endpoint (html.duckduckgo.com/html/) and parses the results
 * from the returned HTML. This is the default search provider.
 *
 * Rate limiting: built-in 500ms delay between requests.
 */

const DDG_HTML_URL = "https://html.duckduckgo.com/html/";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
];

function rotateUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export class DuckDuckGoProvider implements WebSearchProvider {
  kind = "duckduckgo" as const;
  private lastRequestTime = 0;
  private readonly minDelayMs = 500;

  async search(query: string, maxResults = 5): Promise<SearchResult[]> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minDelayMs) {
      await sleep(this.minDelayMs - elapsed);
    }
    this.lastRequestTime = Date.now();

    const userAgent = rotateUserAgent();
    try {
      const params = new URLSearchParams({ q: query });
      const url = `${DDG_HTML_URL}?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html",
        },
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo returned ${response.status}`);
      }

      const html = await response.text();
      const ddgResults = parseDuckDuckGoHtml(html, maxResults);
      if (ddgResults.length > 0) {
        return ddgResults;
      }
      throw new Error("DuckDuckGo returned empty parsed results");
    } catch (err: any) {
      // Catch DDG failures / bans and attempt Google fallback
      try {
        return await searchGoogleFallback(query, maxResults);
      } catch (gErr: any) {
        warnIfError(`duckDuckGo: Google fallback failed for "${query}"`, gErr);
        return [];
      }
    }
  }
}

/**
 * Parse DuckDuckGo HTML results page.
 */
function parseDuckDuckGoHtml(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  const linkRegex =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null && results.length < maxResults) {
    const rawUrl = match[1];
    const titleHtml = match[2];

    let url = rawUrl;
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch (err: any) {
        warnIfError("duckDuckGo: URL decode failed", err);
        url = rawUrl;
      }
    }
    const title = stripHtml(titleHtml).trim();

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

/**
 * Google Search Scraper Fallback
 */
async function searchGoogleFallback(query: string, maxResults = 5): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query });
  const url = `https://www.google.com/search?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": rotateUserAgent(),
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Google fallback returned ${response.status}`);
  }

  const html = await response.text();
  return parseGoogleHtml(html, maxResults);
}

function parseGoogleHtml(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  const linkRegex = /<a[^>]*href="\/url\?q=([^&"]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null && results.length < maxResults) {
    const rawUrl = decodeURIComponent(match[1]);
    const titleHtml = match[2];

    if (rawUrl.includes("google.com/")) continue;

    const title = stripHtml(titleHtml).trim();
    const snippetStart = linkRegex.lastIndex;
    const remainingHtml = html.slice(snippetStart, snippetStart + 1500);
    const snippetMatch = remainingHtml.match(/<div[^>]*class="BNeawe s3v9rd AP7Wnd"[^>]*>([\s\S]*?)<\/div>/);
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]).trim() : "";

    if (title && rawUrl) {
      results.push({ title, url: rawUrl, snippet });
    }
  }

  return results;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
