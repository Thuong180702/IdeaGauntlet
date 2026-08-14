/**
 * P1-4: Unified verdict mapping — single source of truth.
 *
 * Previously 5 separate verdict functions existed across engines with
 * inconsistent thresholds. This module replaces all of them.
 */

import type { Verdict, Scorecard, GauntletMode } from "./types.js";
import { medianScore } from "./scoring.js";

export interface VerdictParams {
  scores: Scorecard;
  /** Dimensions this mode did not assess — excluded from median. */
  unassessed?: (keyof Scorecard)[];
  /** Mode-specific tuning (currently unused but reserved for future). */
  mode?: GauntletMode;
  /** LLM-provided evidence score override (1-10). Preferred over heuristic. */
  evidenceScoreOverride?: number;
  /** LLM verdict text — if it starts with a known verdict prefix, use it. */
  llmVerdictText?: string;
}

/**
 * Compute a Verdict from scores + optional LLM text.
 *
 * Priority:
 * 1. If llmVerdictText contains a recognized verdict prefix → use it.
 * 2. Otherwise, score-based mapping with consistent thresholds.
 *
 * Thresholds (ponytail: calibrated against the 1-10 score scale):
 * - median >= 8 AND evidence >= 5 → strong
 * - median >= 6 → promising_but_risky
 * - median >= 4 → unclear
 * - evidence <= 1 AND clarity <= 3 → pivot_recommended
 * - evidence <= 2 AND median < 5 → needs_real_evidence
 * - else → weak
 */
export function computeVerdict(params: VerdictParams): Verdict {
  // 1. LLM text override
  if (params.llmVerdictText) {
    const fromText = mapVerdictFromText(params.llmVerdictText);
    if (fromText) return fromText;
  }

  // 2. Score-based
  const { scores, unassessed } = params;
  const median = medianScore(scores, unassessed);
  const evidence = params.evidenceScoreOverride ?? scores.evidence;

  if (median >= 8 && evidence >= 5) return "strong";
  if (median >= 6) return "promising_but_risky";
  if (evidence <= 1 && scores.clarity <= 3) return "pivot_recommended";
  if (evidence <= 2 && median < 5) return "needs_real_evidence";
  if (median >= 4) return "unclear";
  return "weak";
}

/**
 * Map LLM verdict text to Verdict enum.
 * Returns undefined if no recognized prefix found.
 */
export function mapVerdictFromText(text: string): Verdict | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Strip leading formatting (markdown headers, quotes, "verdict:", etc.)
  const cleaned = lower
    .replace(/^(#+\s*|\*+\s*|>+\s*|verdict\s*:\s*|final verdict\s*:\s*)+/i, "")
    .trim();

  // 1. Check direct prefix matches
  if (/^strong\b/i.test(cleaned) && !/\b(risky|competition|competitor|objection)\b/i.test(cleaned.slice(0, 30))) {
    return "strong";
  }
  if (/^promising[_\s-]+(?:but[_\s-]+)?risky\b/i.test(cleaned) || (/^promising\b/i.test(cleaned) && /\brisky\b/i.test(cleaned))) {
    return "promising_but_risky";
  }
  if (/^pivot[_\s-]+(?:recommended)?\b/i.test(cleaned)) {
    return "pivot_recommended";
  }
  if (/^needs[_\s-]+(?:real[_\s-]+)?evidence\b/i.test(cleaned)) {
    return "needs_real_evidence";
  }
  if (/^weak\b/i.test(cleaned) && !/\b(signal|assumption)\b/i.test(cleaned.slice(0, 20))) {
    return "weak";
  }
  if (/^unclear\b/i.test(cleaned) || /^not clear\b/i.test(cleaned) || /^unknown\b/i.test(cleaned)) {
    return "unclear";
  }

  // 2. Explicit keyword phrases anywhere in text if clear verdict indicators
  if (/\bverdict\s*:\s*strong\b/i.test(lower) || /\b(rated as|classification is|verdict is)\s+strong\b/i.test(lower)) return "strong";
  if (/\bpromising[_\s-]+(?:but[_\s-]+)?risky\b/i.test(lower)) return "promising_but_risky";
  if (/\bpivot[_\s-]+recommended\b/i.test(lower)) return "pivot_recommended";
  if (/\bneeds[_\s-]+real[_\s-]+evidence\b/i.test(lower)) return "needs_real_evidence";
  if (/\bverdict\s*:\s*weak\b/i.test(lower) || /\b(rated as|classification is|verdict is)\s+weak\b/i.test(lower)) return "weak";
  if (/\bverdict\s*:\s*unclear\b/i.test(lower)) return "unclear";

  return undefined;
}
