/**
 * JSON repair — strips markdown fences, handles trailing text, provides
 * safe partial parsing for LLM outputs.
 *
 * LLMs frequently return JSON wrapped in markdown fences (```json ... ```)
 * or with leading/trailing prose. This module extracts the first valid JSON
 * object from such responses.
 */

/**
 * Strip markdown code fences surrounding JSON content.
 * Handles ```json, ```JSON, ``` (no lang), and variations.
 */
export function stripMarkdownFences(raw: string): string {
  if (!raw) return raw;
  let s = raw.trim();

  // Match opening fence with optional language tag
  const opening = s.match(/^```(?:json|JSON)?\s*\n?/);
  if (opening) {
    s = s.slice(opening[0].length);
  }

  // Strip closing fence
  const closing = s.match(/\n?```\s*$/);
  if (closing) {
    s = s.slice(0, s.length - closing[0].length);
  }

  return s.trim();
}

/**
 * Extract the first valid JSON object or array from a string that may
 * contain leading prose or trailing text.
 *
 * Strategy:
 * 1. Strip markdown fences.
 * 2. Try parsing as-is (fast path).
 * 3. Find the first '{' or '[' and attempt balanced extraction.
 * 4. If all fails, return null.
 */
export function extractJSON<T = any>(raw: string): T | null {
  if (!raw) return null;

  const cleaned = stripMarkdownFences(raw);

  // Fast path
  const direct = tryParse<T>(cleaned);
  if (direct !== null) return direct;

  // Find first object or array start
  const startIdx = findFirstJsonStart(cleaned);
  if (startIdx === -1) return null;

  const jsonSubstr = balancedExtract(cleaned, startIdx);
  if (jsonSubstr === null) return null;

  return tryParse<T>(jsonSubstr);
}

/**
 * Attempt JSON.parse, returning null on failure instead of throwing.
 */
function tryParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/**
 * Find the index of the first '{' or '[' that could begin a JSON value.
 */
function findFirstJsonStart(s: string): number {
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{" || s[i] === "[") return i;
  }
  return -1;
}

/**
 * Balanced bracket extraction — finds the matching closing bracket.
 * Handles nested braces/brackets and string literals.
 */
function balancedExtract(s: string, start: number): string | null {
  const openChar = s[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }

  // Unbalanced — return what we have up to end
  return s.slice(start);
}

/**
 * Safe parse with fallback — returns a default value if extraction fails.
 */
export function safeParseJSON<T = any>(raw: string, fallback: T): T {
  const result = extractJSON<T>(raw);
  return result ?? fallback;
}
