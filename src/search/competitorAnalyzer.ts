import type { SearchResult, PageContent, CompetitorInfo, CompetitorLandscape } from "./types.js";

/**
 * Competitor analyzer — extracts structured competitor data from
 * search results + page contents.
 *
 * Heuristics:
 * - Name: extracted from page title or search result title (first meaningful words)
 * - Type: "direct" if title/snippet matches idea keywords closely, "indirect" otherwise
 * - Pricing: regex for $ amounts, "free", "subscription", "per month/year"
 * - Features: keywords near "features", "what we do", "how it works"
 * - Weaknesses: keywords near "cons", "missing", "frustrating", "hate", "wish"
 */

const PRICING_PATTERNS = [
  /\$(\d+(?:\.\d+)?)\s*(?:\/|per)\s*(?:mo|month|year|yr)/gi,
  /\$(\d+(?:\.\d+)?)\s*(?:\/|per)\s*user/gi,
  /\bfree\s*(?:trial|plan|tier|forever)/gi,
  /\bsubscription\b/gi,
  /\benterprise\b/gi,
  /\bstarts?\s+at\s+\$/gi,
  /\bpricing\s+starts?\s+at\b/gi,
];

const COMPLAINT_KEYWORDS = [
  "frustrating", "hate", "missing", "wish it could", "doesn't support",
  "no option", "can't do", "hard to", "confusing", "slow", "expensive",
  "overpriced", "lack of", "limitation", "drawback", "problem with",
  "not enough", "too complex", "too simple", "alternative to",
];

const FEATURE_KEYWORDS = [
  "features", "what we do", "how it works", "capabilities",
  "what you get", "includes", "functionality",
];

export function analyzeCompetitors(
  idea: string,
  searchResults: SearchResult[],
  pageContents?: PageContent[],
): CompetitorLandscape {
  const ideaLower = idea.toLowerCase();
  const ideaKeywords = extractKeywords(ideaLower);

  const competitors: CompetitorInfo[] = [];
  const seen = new Set<string>();

  // Process search results (titles + snippets)
  for (const result of searchResults) {
    const name = extractName(result.title);
    if (!name || seen.has(name.toLowerCase())) continue;
    if (isGenericSearchPage(result.url)) continue;

    seen.add(name.toLowerCase());

    const snippetText = result.snippet ?? "";
    const type = classifyCompetitor(ideaKeywords, result.title, snippetText);
    const pricing = extractPricing(snippetText);
    const features = extractFeatures(snippetText);
    const weaknesses = extractWeaknesses(snippetText);

    competitors.push({
      name,
      url: result.url,
      type,
      pricing,
      features: features.length > 0 ? features : undefined,
      weaknesses: weaknesses.length > 0 ? weaknesses : undefined,
      notes: snippetText.slice(0, 200),
    });
  }

  // Enrich with page content if available
  if (pageContents && pageContents.length > 0) {
    for (const page of pageContents) {
      // Try to match with existing competitor by URL domain
      const existing = competitors.find((c) => sameDomain(c.url, page.url));
      if (existing) {
        const fullText = page.text;
        if (!existing.pricing) existing.pricing = extractPricing(fullText);
        const pageFeatures = extractFeatures(fullText);
        if (pageFeatures.length > 0) {
          existing.features = [...new Set([...(existing.features ?? []), ...pageFeatures])].slice(0, 8);
        }
        const pageWeaknesses = extractWeaknesses(fullText);
        if (pageWeaknesses.length > 0) {
          existing.weaknesses = [...new Set([...(existing.weaknesses ?? []), ...pageWeaknesses])].slice(0, 5);
        }
      } else {
        // New competitor from page content
        const name = extractName(page.title);
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          competitors.push({
            name,
            url: page.url,
            type: classifyCompetitor(ideaKeywords, page.title, page.text.slice(0, 300)),
            pricing: extractPricing(page.text),
            features: extractFeatures(page.text).slice(0, 8),
            weaknesses: extractWeaknesses(page.text).slice(0, 5),
            notes: page.description ?? page.text.slice(0, 200),
          });
        }
      }
    }
  }

  const saturationLevel = assessSaturation(competitors);
  const analysisNote = buildAnalysisNote(competitors, saturationLevel, idea);

  return {
    competitors: competitors.slice(0, 15),
    saturationLevel,
    analysisNote,
  };
}

// ─── Helpers ──────────────────────────────────────────────────

function extractKeywords(text: string): string[] {
  const stopWords = new Set(["a", "an", "the", "for", "and", "or", "but", "is", "are", "to", "in", "of", "with", "that", "this", "it", "app", "tool", "platform", "service", "software"]);
  return text
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 8);
}

function extractName(title: string): string {
  if (!title) return "";
  // Clean and take first meaningful chunk
  const cleaned = title
    .replace(/\s*[-|–—]\s*.*$/, "") // Remove everything after dash/pipe (site names)
    .replace(/\s*\|.*$/, "")
    .trim();
  return cleaned.slice(0, 60) || title.slice(0, 60);
}

function isGenericSearchPage(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("reddit.com/") ||
    lower.includes("quora.com/") ||
    lower.includes("youtube.com/") ||
    lower.includes("wikipedia.org/") ||
    lower.includes("linkedin.com/") ||
    lower.includes("facebook.com/");
}

function classifyCompetitor(
  ideaKeywords: string[],
  title: string,
  snippet: string,
): "direct" | "indirect" {
  const text = (title + " " + snippet).toLowerCase();
  let matchCount = 0;
  for (const kw of ideaKeywords) {
    if (text.includes(kw)) matchCount++;
  }
  // If >50% of idea keywords appear in title/snippet → likely direct
  return matchCount >= Math.max(2, Math.ceil(ideaKeywords.length / 2))
    ? "direct"
    : "indirect";
}

function extractPricing(text: string): string | undefined {
  for (const pattern of PRICING_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      // Get surrounding context
      const idx = match.index ?? 0;
      const start = Math.max(0, idx - 30);
      const end = Math.min(text.length, idx + match[0].length + 30);
      return text.slice(start, end).trim();
    }
  }
  return undefined;
}

function extractFeatures(text: string): string[] {
  const features: string[] = [];
  const textLower = text.toLowerCase();

  for (const keyword of FEATURE_KEYWORDS) {
    const idx = textLower.indexOf(keyword);
    if (idx !== -1) {
      // Extract the following ~300 chars
      const chunk = text.slice(idx, idx + 300);
      // Split into individual features by bullets, numbered lists, or sentences
      const items = chunk
        .split(/(?:^|\n)\s*[-•*]\s*|\n\d+\.\s*|\.\s+(?=[A-Z])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10 && s.length < 100);
      features.push(...items.slice(0, 5));
    }
  }

  return [...new Set(features)].slice(0, 8);
}

function extractWeaknesses(text: string): string[] {
  const weaknesses: string[] = [];
  const textLower = text.toLowerCase();

  for (const keyword of COMPLAINT_KEYWORDS) {
    const idx = textLower.indexOf(keyword);
    if (idx !== -1) {
      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + 100);
      const snippet = text.slice(start, end).trim();
      if (snippet.length > 10) weaknesses.push(snippet);
    }
  }

  return [...new Set(weaknesses)].slice(0, 5);
}

function assessSaturation(competitors: CompetitorInfo[]): CompetitorLandscape["saturationLevel"] {
  const directCount = competitors.filter((c) => c.type === "direct").length;
  if (directCount >= 5) return "high";
  if (directCount >= 3) return "medium";
  if (directCount >= 1) return "low";
  return "unknown";
}

function buildAnalysisNote(
  competitors: CompetitorInfo[],
  saturation: CompetitorLandscape["saturationLevel"],
  idea: string,
): string {
  const directCount = competitors.filter((c) => c.type === "direct").length;
  const indirectCount = competitors.length - directCount;

  const parts: string[] = [
    `Found ${directCount} direct and ${indirectCount} indirect competitor(s) for "${idea.slice(0, 60)}".`,
    `Market saturation: ${saturation}.`,
  ];

  if (saturation === "high") {
    parts.push("Market appears saturated — a direct entry will face strong competition. Consider niche strategies.");
  } else if (saturation === "medium") {
    parts.push("Market has notable competitors but is not fully saturated. Differentiation is critical.");
  } else if (saturation === "low") {
    parts.push("Few direct competitors found. Opportunity exists but validate demand first.");
  } else {
    parts.push("No direct competitors found. This could mean blue ocean or lack of demand.");
  }

  return parts.join(" ");
}

function sameDomain(url1: string, url2: string): boolean {
  try {
    const d1 = new URL(url1).hostname.replace(/^www\./, "");
    const d2 = new URL(url2).hostname.replace(/^www\./, "");
    return d1 === d2;
  } catch {
    return false;
  }
}
