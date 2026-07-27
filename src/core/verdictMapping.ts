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
  if (median >= 4) return "unclear";
  if (evidence <= 1 && scores.clarity <= 3) return "pivot_recommended";
  if (evidence <= 2 && median < 5) return "needs_real_evidence";
  return "weak";
}

/**
 * Map LLM verdict text to Verdict enum.
 * Returns undefined if no recognized prefix found.
 */
export function mapVerdictFromText(text: string): Verdict | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  if (lower.includes("strong") && !lower.includes("risky")) return "strong";
  if (lower.includes("promising") && lower.includes("risky")) return "promising_but_risky";
  if (lower.includes("pivot")) return "pivot_recommended";
  if (lower.includes("needs") && lower.includes("evidence")) return "needs_real_evidence";
  if (lower.includes("weak")) return "weak";
  if (lower.includes("unclear") || lower.includes("not clear") || lower.includes("unknown")) return "unclear";
  return undefined;
}
