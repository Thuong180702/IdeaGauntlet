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
 *
 * Performance: fetchPagesPlaywright() now shares a SINGLE browser instance
 * across all URLs. Individual fetchPagePlaywright() also reuses a module-level
 * singleton browser so repeated single-URL calls don't each spin up a browser.
 */

import type { PageContent } from "./types.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const HYDRATION_WAIT_MS = 2_000;
const DEFAULT_MAX_CHARS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// Lazy-load playwright so the dependency is optional at runtime.
let _chromium: typeof import("playwright").chromium | null = null;

async function getChromium() {
  if (!_chromium) {
    const pw = await import("playwright");
    _chromium = pw.chromium;
  }
  return _chromium;
}

/**
 * Module-level browser singleton for single-URL fetches.
 * Avoids spinning up a fresh browser for every call to fetchPagePlaywright().
 */
let _singletonBrowser: import("playwright").Browser | null = null;
let _singletonBrowserClosing = false;

async function getSingletonBrowser(): Promise<import("playwright").Browser> {
  if (_singletonBrowser && _singletonBrowser.isConnected() && !_singletonBrowserClosing) {
    return _singletonBrowser;
  }
  const chromium = await getChromium();
  _singletonBrowser = await chromium.launch({ headless: true });
  _singletonBrowserClosing = false;
  return _singletonBrowser;
}

/** Shutdown the singleton browser — call at process exit if needed. */
export async function closeSingletonBrowser(): Promise<void> {
  if (_singletonBrowser) {
    _singletonBrowserClosing = true;
    await _singletonBrowser.close().catch(() => undefined);
    _singletonBrowser = null;
  }
}

// Tokens to check in text for liveness
const MIN_TEXT_LENGTH = 50;

/**
 * Extract visible text from a Playwright page.
 * Runs inside the browser context.
 */
async function extractPageContent(
  page: import("playwright").Page,
  url: string,
  maxChars: number,
): Promise<PageContent | null> {
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

  if (!result.text || result.text.length < MIN_TEXT_LENGTH) return null;

  return {
    url,
    title: result.title,
    text: result.text,
    description: result.description,
  };
}

/**
 * Fetch page content using Playwright headless Chromium.
 * Renders JS, waits for hydration, then extracts visible text.
 *
 * Fix: reuses the module-level singleton browser instance instead of creating
 * a new browser for every call — dramatically reduces startup overhead.
 */
export async function fetchPagePlaywright(
  url: string,
  options?: { timeoutMs?: number; maxChars?: number },
): Promise<PageContent | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;

  if (!isSafeUrl(url)) return null;

  let context: import("playwright").BrowserContext | null = null;
  let page: import("playwright").Page | null = null;

  try {
    const browser = await getSingletonBrowser();
    context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });

    if (!response || !response.ok()) {
      return null;
    }

    // Wait for JS hydration
    await page.waitForTimeout(HYDRATION_WAIT_MS);

    return await extractPageContent(page, url, maxChars);
  } catch {
    return null;
  } finally {
    // Close only the page context, not the shared browser.
    if (page) await page.close().catch(() => undefined);
    if (context) await context.close().catch(() => undefined);
  }
}

/**
 * Fetch multiple pages concurrently with Playwright.
 * Fix: Uses a SINGLE shared browser instance for all URLs in the batch,
 * opening one context+page per URL. This avoids per-URL browser startup cost.
 */
export async function fetchPagesPlaywright(
  urls: string[],
  options?: { timeoutMs?: number; maxChars?: number; concurrency?: number },
): Promise<PageContent[]> {
  const concurrency = options?.concurrency ?? 3;
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Filter unsafe URLs upfront
  const safeUrls = urls.filter(isSafeUrl);
  if (safeUrls.length === 0) return [];

  // Launch a single shared browser for this batch.
  let browser: import("playwright").Browser | null = null;
  try {
    const chromium = await getChromium();
    browser = await chromium.launch({ headless: true });
  } catch {
    return [];
  }

  const results: PageContent[] = [];
  let index = 0;

  const runNext = async (): Promise<void> => {
    while (index < safeUrls.length) {
      const currentIdx = index++;
      const url = safeUrls[currentIdx];
      let context: import("playwright").BrowserContext | null = null;
      let page: import("playwright").Page | null = null;

      try {
        context = await browser!.newContext({
          userAgent: USER_AGENT,
          viewport: { width: 1280, height: 720 },
        });
        page = await context.newPage();

        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });

        if (response && response.ok()) {
          await page.waitForTimeout(HYDRATION_WAIT_MS);
          const content = await extractPageContent(page, url, maxChars);
          if (content) results.push(content);
        }
      } catch {
        // Silent failure — skip this URL
      } finally {
        if (page) await page.close().catch(() => undefined);
        if (context) await context.close().catch(() => undefined);
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, safeUrls.length) }, () => runNext());
  await Promise.all(workers);

  // Close the batch browser (separate from singleton)
  await browser.close().catch(() => undefined);

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
      // 172.16.0.0/12 block — more concisely handled via numeric comparison
      isPrivate172(host) ||
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
 * Check if host is in the 172.16.0.0/12 private range.
 * Replaces the 16 separate startsWith checks.
 */
function isPrivate172(host: string): boolean {
  if (!host.startsWith("172.")) return false;
  const parts = host.split(".");
  if (parts.length < 2) return false;
  const second = parseInt(parts[1], 10);
  return second >= 16 && second <= 31;
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
