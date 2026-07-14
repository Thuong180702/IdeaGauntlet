import type { PageContent } from "./types.js";

/**
 * Page content fetcher — retrieves text from URLs so the LLM has
 * real-world context beyond just search snippets.
 *
 * - fetch() with AbortController timeout
 * - HTML → text extraction (strip tags, grab main/article/p/h/li/td/span)
 * - Truncate to maxChars to avoid token explosion
 * - Silent fallback (return null on any error)
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_CHARS = 2_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// Tags whose text content we want to keep
const EXTRACT_TAGS = new Set([
  "main", "article", "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "li", "td", "th", "span", "div", "section", "blockquote", "pre",
]);

// Tags to completely remove (script, style, nav, footer, header)
const DISCARD_TAGS = new Set([
  "script", "style", "noscript", "nav", "footer", "header", "aside", "form", "svg", "iframe",
]);

export async function fetchPageContent(
  url: string,
  options?: { timeoutMs?: number; maxChars?: number },
): Promise<PageContent | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });

    if (!response.ok) return null;

    // Only process HTML responses
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return null;
    }

    const html = await response.text();
    clearTimeout(timer);

    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const text = extractText(html, maxChars);

    if (!text || text.length < 50) return null;

    return { url, title, text, description };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Fetch multiple page contents concurrently.
 * Limits concurrency to avoid overwhelming network.
 * Returns only successful results (nulls filtered out).
 */
export async function fetchPageContents(
  urls: string[],
  options?: { timeoutMs?: number; maxChars?: number; concurrency?: number },
): Promise<PageContent[]> {
  const concurrency = options?.concurrency ?? 3;
  const results: PageContent[] = [];
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < urls.length) {
      const currentIdx = index++;
      const content = await fetchPageContent(urls[currentIdx], options);
      if (content) results.push(content);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => runNext());
  await Promise.all(workers);

  return results;
}

// ─── HTML extraction helpers ──────────────────────────────────

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) return stripTags(titleMatch[1]).trim();

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) return stripTags(h1Match[1]).trim();

  return "";
}

function extractMetaDescription(html: string): string | undefined {
  const metaMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i);
  if (metaMatch) return metaMatch[1].trim();
  return undefined;
}

function extractText(html: string, maxChars: number): string {
  // Remove everything inside discard tags
  let cleaned = html;
  for (const tag of DISCARD_TAGS) {
    const regex = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi");
    cleaned = cleaned.replace(regex, " ");
  }

  // Collect text from extract tags
  const parts: string[] = [];
  for (const tag of EXTRACT_TAGS) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(cleaned)) !== null) {
      const text = stripTags(match[1]).trim();
      if (text.length > 20) parts.push(text);
    }
  }

  let text = parts.join("\n\n");

  // Fallback: if we got almost nothing, try extracting all text
  if (text.length < 100) {
    text = stripTags(cleaned).replace(/\s+/g, " ").trim();
  }

  return text.slice(0, maxChars);
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&hellip;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}
