import { warnIfError } from "../utils/warn.js";
import { lookup as dnsLookup } from "node:dns/promises";

/**
 * SSRF guard — shared URL safety validation.
 * Rejects private/local IPs, non-http(s) protocols, and metadata endpoints.
 * Used by both pageFetcher.ts and playwrightFetcher.ts.
 */

/**
 * Check if a hostname string is obviously unsafe (string-level checks).
 * This is the fast-path synchronous check. For full safety, callers should
 * also call `resolveAndCheckHost()` to verify DNS doesn't resolve to private IPs.
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
      host.endsWith(".internal") ||
      // Block alternate IP formats that bypass string checks
      isAlternateIpFormat(host)
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
 * Resolve hostname via DNS and verify no resolved IP is private/metadata.
 * Returns true if all resolved IPs are safe, false if any is private.
 * Callers should use this after isSafeUrl() for full protection against
 * DNS rebinding and domains pointing to internal IPs.
 */
export async function isSafeUrlAsync(url: string): Promise<boolean> {
  if (!isSafeUrl(url)) return false;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

    // Skip DNS for IP literals — already checked by isSafeUrl
    if (isIpLiteral(host)) return true;

    const addresses = await dnsLookup(host, { all: true, family: 0 });
    for (const addr of addresses) {
      const ip = addr.address;
      if (isPrivateIp(ip)) {
        warnIfError(`ssrfGuard: DNS resolved "${host}" to private IP "${ip}"`, undefined);
        return false;
      }
    }
    return true;
  } catch (err: any) {
    warnIfError(`ssrfGuard: DNS resolution failed for "${url}"`, err);
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

/**
 * Check if a resolved IP address is private, loopback, link-local, or metadata.
 */
function isPrivateIp(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "localhost" ||
    lower === "::1" ||
    lower === "0.0.0.0" ||
    lower.startsWith("127.") ||
    lower.startsWith("10.") ||
    lower.startsWith("192.168.") ||
    isPrivate172(lower) ||
    lower.startsWith("169.254.") ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    // IPv6 loopback/link-local
    lower === "::" ||
    lower.startsWith("::ffff:") && (
      // IPv4-mapped IPv6 — extract IPv4 part
      isPrivateIp(lower.replace("::ffff:", ""))
    )
  );
}

/**
 * Detect alternate IP address formats that bypass string-based prefix checks.
 * Examples: 0x7f000001 (hex), 2130706433 (decimal), 017700000001 (octal).
 */
function isAlternateIpFormat(host: string): boolean {
  // Hex IPv4: 0x7f.0.0.1 or 0x7f000001
  if (/^0x[0-9a-f]+(\.[0-9a-f]+)*$/i.test(host)) return true;
  // Pure decimal integer (could be IPv4 as single number): 2130706433
  if (/^\d{8,}$/.test(host) && parseInt(host, 10) > 0) return true;
  // Octal: starts with 0 followed by digits, contains dots
  if (/^0[0-7]*(\.[0-7]+)+$/.test(host)) return true;
  return false;
}

/**
 * Check if host is an IP literal (IPv4 or IPv6), not a domain name.
 * IP literals are already validated by isSafeUrl's string checks.
 */
function isIpLiteral(host: string): boolean {
  // IPv4: x.x.x.x
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  // IPv6: contains colon
  if (host.includes(":")) return true;
  return false;
}
