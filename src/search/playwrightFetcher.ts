/**
 * Playwright-based page content fetcher.
 *
 * Renders pages with headless Chromium for full JS support,
 * then extracts clean text via DOM queries (not regex).
 *
 * - Headless Chromium with realistic UA
 * - Hydration wait for SPA content
 * - DOM-based text extraction (main, article, p, h1-h6, li, td, blockquote, pre)
 * - Compact text output (whitespace-collapsed, length-capped)
 * - SSRF guard: rejects private/local IPs
 * - Silent fallback (returns null on any error)
 */

import type { PageContent } from "./types.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const HYDRATION_WAIT_MS = 2_000;
const DEFAULT_MAX_CHARS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// Lazy-load playwright so the dependency is optional at runtime
let _chromium: typeof import("playwright").chromium | null = null;

async function getChromium() {
  if (!_chromium) {
    const pw = await import("playwright");
    _chromium = pw.chromium;
  }
  return _chromium;
}

// Tokens to check in text for liveness
const MIN_TEXT_LENGTH = 50;

/**
 * Fetch page content using Playwright headless Chromium.
 * Renders JS, waits for hydration, then extracts visible text.
 */
export async function fetchPagePlaywright(
  url: string,
  options?: { timeoutMs?: number; maxChars?: number },
): Promise<PageContent | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;

  if (!isSafeUrl(url)) return null;

  try {
    const chromium = await getChromium();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });

    if (!response || !response.ok()) {
      await browser.close();
      return null;
    }

    // Wait for JS hydration
    await page.waitForTimeout(HYDRATION_WAIT_MS);

    // Extract text via DOM evaluation (runs in browser context)
    const result = (await page.evaluate((cap: number) => {
      const doc = (globalThis as any).document;
      if (!doc) return { title: "", description: undefined as string | undefined, text: "" };

      const getStructuredText = (): string => {
        // Remove script, style, nav, footer, header, aside
        const discard = ["script", "style", "noscript", "nav", "footer", "header", "aside", "svg", "iframe"];
        for (const tag of discard) {
          doc.querySelectorAll(tag).forEach((el: any) => el.remove());
        }

        // Collect text from content tags
        const collect = ["main", "article", "section", "p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "blockquote", "pre"];
        const parts: string[] = [];
        for (const tag of collect) {
          doc.querySelectorAll(tag).forEach((el: any) => {
            const text = (el.innerText || el.textContent || "").trim();
            if (text.length > 15) parts.push(text);
          });
        }

        let text = parts.join("\n\n");

        // Fallback: body innerText if too little
        if (text.length < 100) {
          text = (doc.body?.innerText || doc.body?.textContent || "").trim();
        }

        // Collapse whitespace
        text = text.replace(/[ \t\xa0]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

        return text.length > cap ? text.slice(0, cap) + "…" : text;
      };

      const title = doc.title || doc.querySelector("h1")?.textContent?.trim() || "";
      const description =
        doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
        doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
        "";
      const text = getStructuredText();

      return { title: title.slice(0, 300), description: description?.trim() || undefined, text };
    }, maxChars)) as { title: string; description?: string; text: string };

    await browser.close();

    if (!result.text || result.text.length < MIN_TEXT_LENGTH) return null;

    return {
      url,
      title: result.title,
      text: result.text,
      description: result.description,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch multiple pages concurrently with Playwright.
 * Uses a single browser instance with multiple pages for efficiency.
 */
export async function fetchPagesPlaywright(
  urls: string[],
  options?: { timeoutMs?: number; maxChars?: number; concurrency?: number },
): Promise<PageContent[]> {
  const concurrency = options?.concurrency ?? 3;
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const results: PageContent[] = [];

  // Filter unsafe URLs upfront
  const safeUrls = urls.filter(isSafeUrl);
  if (safeUrls.length === 0) return results;

  let index = 0;

  async function runNext(): Promise<void> {
    while (index < safeUrls.length) {
      const currentIdx = index++;
      const content = await fetchPagePlaywright(safeUrls[currentIdx], { timeoutMs, maxChars });
      if (content) results.push(content);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, safeUrls.length) }, () => runNext());
  await Promise.all(workers);

  return results;
}

/**
 * SSRF guard: reject private/local IPs and non-http(s) protocols.
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    // Reject localhost, private IPs, link-local
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("172.16.") ||
      host.startsWith("172.17.") ||
      host.startsWith("172.18.") ||
      host.startsWith("172.19.") ||
      host.startsWith("172.20.") ||
      host.startsWith("172.21.") ||
      host.startsWith("172.22.") ||
      host.startsWith("172.23.") ||
      host.startsWith("172.24.") ||
      host.startsWith("172.25.") ||
      host.startsWith("172.26.") ||
      host.startsWith("172.27.") ||
      host.startsWith("172.28.") ||
      host.startsWith("172.29.") ||
      host.startsWith("172.30.") ||
      host.startsWith("172.31.") ||
      host.startsWith("169.254.") ||
      host === "::1" ||
      host.startsWith("fe80:") ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Liveness check: HEAD request before expensive full fetch.
 * Returns true if URL responds with 2xx/3xx.
 */
export async function checkLiveness(url: string, timeoutMs = 5_000): Promise<boolean> {
  if (!isSafeUrl(url)) return false;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return response.ok || (response.status >= 300 && response.status < 400);
  } catch {
    clearTimeout(timer);
    return false;
  }
}

/**
 * Batch liveness check.
 */
export async function checkLivenessBatch(urls: string[], timeoutMs = 5_000): Promise<string[]> {
  const results = await Promise.all(
    urls.map(async (url) => ({
      url,
      alive: await checkLiveness(url, timeoutMs),
    })),
  );
  return results.filter((r) => r.alive).map((r) => r.url);
}
