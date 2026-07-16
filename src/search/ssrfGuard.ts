import { warnIfError } from "../utils/warn.js";

/**
 * SSRF guard — shared URL safety validation.
 * Rejects private/local IPs, non-http(s) protocols, and metadata endpoints.
 * Used by both pageFetcher.ts and playwrightFetcher.ts.
 */

/**
 * Check if a URL is safe to fetch.
 * Blocks: localhost, private IPs, link-local, metadata endpoints, non-http(s).
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      isPrivate172(host) ||
      host.startsWith("169.254.") ||
      // Cloud metadata endpoints
      host === "metadata.google.internal" ||
      host === "::1" ||
      host.startsWith("fe80:") ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }
    return true;
  } catch (err: any) {
    warnIfError(`ssrfGuard: URL parse failed for "${url}"`, err);
    return false;
  }
}

/**
 * Check if host is in the 172.16.0.0/12 private range.
 */
function isPrivate172(host: string): boolean {
  if (!host.startsWith("172.")) return false;
  const parts = host.split(".");
  if (parts.length < 2) return false;
  const second = parseInt(parts[1], 10);
  return second >= 16 && second <= 31;
}
