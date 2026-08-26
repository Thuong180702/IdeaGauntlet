import type {
  CalibrationSummary,
  ScoreRubricEntry,
  Scorecard,
} from "./types.js";
import type { ResearchBrief } from "../search/types.js";

/**
 * Score provenance verification.
 *
 * A model asked "is this score evidence-backed?" will happily say yes, and will
 * happily invent a plausible-looking citation to prove it. That failure mode is
 * exactly the one IdeaGauntlet exists to avoid, so the model's claim is treated
 * as a hypothesis and checked against the research brief that was actually
 * retrieved. A citation that cannot be found in the brief does not silently
 * disappear — it is moved to `unverifiedCitations` and reported.
 *
 * The rule is deliberately one-directional: verification can only ever downgrade
 * `sourced` to `judgment`, never the reverse.
 */

/** Shortest citation fragment worth matching — below this, substrings match noise. */
const MIN_TOKEN_LENGTH = 4;

const RUBRIC_DIMENSIONS: (keyof Scorecard)[] = [
  "clarity", "pain", "differentiation", "buildability",
  "distribution", "monetization", "evidence",
];

/** Lowercase, collapse whitespace, drop punctuation that varies between citations. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9./:\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Reduce a URL to `host/path`, dropping scheme, `www.`, query, and trailing slash. */
function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const path = u.pathname.replace(/\/+$/, "");
    return path && path !== "/" ? `${host}${path}` : host;
  } catch {
    return null;
  }
}

function looksLikeUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim()) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(text.trim());
}

/** Everything the run actually retrieved, in a form citations can be matched against. */
interface SourceIndex {
  /** Normalized `host/path` for every retrieved URL. */
  urls: Set<string>;
  /** Bare hostnames, so a citation naming only the domain still matches. */
  hosts: Set<string>;
  /** Normalized titles, competitor names, and other retrieved labels. */
  labels: string[];
  /** True when nothing was retrieved at all. */
  empty: boolean;
}

export function buildSourceIndex(research?: ResearchBrief): SourceIndex {
  const urls = new Set<string>();
  const hosts = new Set<string>();
  const labels: string[] = [];

  const addUrl = (raw?: string) => {
    if (!raw) return;
    const n = normalizeUrl(raw);
    if (!n) return;
    urls.add(n);
    hosts.add(n.split("/")[0]);
  };
  const addLabel = (raw?: string) => {
    if (!raw) return;
    const n = normalize(raw);
    if (n.length >= MIN_TOKEN_LENGTH) labels.push(n);
  };

  for (const r of research?.results ?? []) {
    addUrl(r.url);
    addLabel(r.title);
  }
  for (const p of research?.pageContents ?? []) {
    addUrl(p.url);
    addLabel(p.title);
  }
  for (const c of research?.competitorLandscape?.competitors ?? []) {
    addUrl((c as { url?: string }).url);
    addLabel((c as { name?: string }).name);
  }

  return { urls, hosts, labels, empty: urls.size === 0 && labels.length === 0 };
}

/**
 * Does this claimed citation correspond to something actually retrieved?
 *
 * URLs must match on host (and path prefix when the citation gives one). Plain
 * text must overlap a retrieved title or competitor name in one direction or the
 * other, which tolerates a model shortening "Focusmate — Virtual Coworking" to
 * "Focusmate" without accepting arbitrary prose.
 */
export function isCitationSupported(citation: string, index: SourceIndex): boolean {
  const raw = citation.trim();
  if (raw.length < MIN_TOKEN_LENGTH) return false;

  if (looksLikeUrl(raw)) {
    const n = normalizeUrl(raw);
    if (!n) return false;
    if (index.urls.has(n)) return true;
    const host = n.split("/")[0];
    if (!index.hosts.has(host)) return false;
    // Host is known; accept when the cited path prefixes (or is prefixed by) a
    // retrieved path, so `example.com/pricing` matches `example.com/pricing/pro`.
    for (const known of index.urls) {
      if (known === host) return true;
      if (known.startsWith(n) || n.startsWith(known)) return true;
    }
    return false;
  }

  const n = normalize(raw);
  if (n.length < MIN_TOKEN_LENGTH) return false;
  return index.labels.some((label) => label.includes(n) || n.includes(label));
}

function toCitationArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

/**
 * Verify every dimension's claimed provenance against the research brief.
 *
 * Returns a new rubric — the input is not mutated — plus the calibration summary
 * that the report renders.
 */
export function verifyScoreProvenance(
  rubric: Partial<Record<keyof Scorecard, ScoreRubricEntry>> | undefined,
  research?: ResearchBrief,
  unassessed?: (keyof Scorecard)[],
): {
  rubric: Partial<Record<keyof Scorecard, ScoreRubricEntry>> | undefined;
  calibration: CalibrationSummary;
} {
  const index = buildSourceIndex(research);
  const skip = new Set(unassessed ?? []);
  const out: Partial<Record<keyof Scorecard, ScoreRubricEntry>> = {};

  let sourcedCount = 0;
  let judgmentCount = 0;
  let droppedCitationCount = 0;
  let assessedCount = 0;

  for (const dim of RUBRIC_DIMENSIONS) {
    const entry = rubric?.[dim];
    if (!entry) continue;
    if (skip.has(dim)) {
      out[dim] = { ...entry };
      continue;
    }

    assessedCount += 1;

    const claimed = toCitationArray((entry as { citations?: unknown }).citations);
    const verified: string[] = [];
    const unverified: string[] = [];

    for (const c of claimed) {
      if (isCitationSupported(c, index)) verified.push(c);
      else unverified.push(c);
    }
    droppedCitationCount += unverified.length;

    // A dimension is only `sourced` when a citation survived verification.
    // The model's own `basis` claim is never sufficient on its own.
    const basis = verified.length > 0 ? "sourced" : "judgment";
    if (basis === "sourced") sourcedCount += 1;
    else judgmentCount += 1;

    out[dim] = {
      evidence: entry.evidence,
      sensitivity: entry.sensitivity,
      basis,
      ...(verified.length > 0 ? { citations: verified } : {}),
      ...(unverified.length > 0 ? { unverifiedCitations: unverified } : {}),
    };
  }

  return {
    rubric: Object.keys(out).length > 0 ? out : undefined,
    calibration: {
      assessedCount,
      sourcedCount,
      judgmentCount,
      droppedCitationCount,
      researchUnavailable: index.empty,
      note: buildCalibrationNote({
        assessedCount,
        sourcedCount,
        judgmentCount,
        droppedCitationCount,
        researchUnavailable: index.empty,
      }),
    },
  };
}

function buildCalibrationNote(c: Omit<CalibrationSummary, "note">): string {
  if (c.assessedCount === 0) {
    return "No scored dimensions to calibrate.";
  }
  if (c.researchUnavailable) {
    return `No research was retrieved for this run, so all ${c.assessedCount} scored ` +
      "dimensions rest on model judgment. Treat them as a starting hypothesis, not evidence.";
  }

  const parts = [
    `${c.sourcedCount} of ${c.assessedCount} scored dimensions cite a source that was ` +
      `found in the research brief; ${c.judgmentCount} rest on model judgment alone.`,
  ];
  if (c.droppedCitationCount > 0) {
    const one = c.droppedCitationCount === 1;
    parts.push(
      `${c.droppedCitationCount} claimed citation${one ? "" : "s"} ` +
        `${one ? "was" : "were"} not found in the brief and ` +
        `${one ? "was" : "were"} not counted as evidence.`,
    );
  }
  if (c.sourcedCount === 0) {
    parts.push("Nothing here is grounded in retrieved evidence yet.");
  }
  return parts.join(" ");
}

/** Compact badge for the scorecard table. */
export function formatBasisBadge(entry?: ScoreRubricEntry): string {
  if (!entry?.basis) return "—";
  return entry.basis === "sourced" ? "sourced" : "judgment";
}
