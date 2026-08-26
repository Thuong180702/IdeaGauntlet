import type { Scorecard } from "./types.js";

export interface ScoreReasons {
  clarity?: string;
  pain?: string;
  differentiation?: string;
  buildability?: string;
  distribution?: string;
  monetization?: string;
  evidence?: string;
}

/**
 * P1-5: Calculate scores with optional LLM evidence override.
 * If the LLM provides its own evidence score (1-10), trust it over
 * the heuristic — the model has context the heuristic can't see.
 */
export function calculateScores(params: {
  hasEvidence: boolean;
  evidenceStrength?: "weak" | "medium" | "strong";
  overrides?: Partial<Scorecard>;
  reasons?: Partial<ScoreReasons>;
  /** P1-5: LLM-provided evidence score (1-10). Preferred over heuristic. */
  llmEvidenceOverride?: number;
}): { scores: Scorecard; reasons: Partial<ScoreReasons> } {
  const { hasEvidence, evidenceStrength, overrides, reasons, llmEvidenceOverride } = params;
  const evidenceVal = (typeof llmEvidenceOverride === "number" && llmEvidenceOverride >= 1 && llmEvidenceOverride <= 10)
    ? Math.round(llmEvidenceOverride)
    : evidenceScore(hasEvidence, evidenceStrength);
  const defaults = {
    clarity: 6,
    pain: 5,
    differentiation: 5,
    buildability: 6,
    distribution: 3,
    monetization: 3,
    evidence: evidenceVal,
  };
  return { 
    scores: { ...defaults, ...overrides },
    reasons: reasons ?? {},
  };
}

/**
 * Heuristic evidence score — fallback when the LLM doesn't provide one.
 * Thresholds calibrated against typical research brief depth:
 * - no evidence → 1 (idea is ungrounded)
 * - weak → 3 (few results, some signal)
 * - medium → 5 (decent results + some pages fetched)
 * - strong → 8 (many results + competitors + pages)
 * Upgrade: replace with ML model or learned weights when data available.
 */
function evidenceScore(hasEvidence: boolean, strength?: "weak" | "medium" | "strong"): number {
  if (!hasEvidence) return 1;
  switch (strength) {
    case "strong": return 8;
    case "medium": return 5;
    case "weak": return 3;
    default: return 2;
  }
}

export function medianScore(scores: Scorecard, unassessed?: (keyof Scorecard)[]): number {
  const skip = new Set(unassessed ?? []);
  const values = [
    "clarity", "pain", "differentiation",
    "buildability", "distribution", "monetization",
    "evidence",
  ]
    .filter((d) => !skip.has(d as keyof Scorecard))
    .map((d) => scores[d as keyof Scorecard])
    .sort((a, b) => a - b);
  if (values.length === 0) return 0;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? Math.round((values[mid - 1] + values[mid]) / 2)
    : values[mid];
}

/**
 * Overall = median over dimensions the mode actually assessed. Unassessed
 * dimensions are excluded so fake constants can't drag the overall up or down.
 */
export function overallScore(scores: Scorecard, unassessed?: (keyof Scorecard)[]): number {
  return medianScore(scores, unassessed);
}

/**
 * Render a scorecard as plain text.
 *
 * `unassessed` must be passed the same list the report carries, otherwise the
 * Overall printed here disagrees with the report's own overall — dimensions the
 * mode never assessed would silently drag the median.
 */
export function formatScores(
  scores: Scorecard,
  unassessed?: (keyof Scorecard)[],
): string {
  const skip = new Set(unassessed ?? []);
  const label = (dim: keyof Scorecard, text: string) =>
    skip.has(dim) ? `${text}n/a (not assessed)` : `${text}${scores[dim]}/10`;

  const rows = [
    label("clarity", "Clarity:         "),
    label("pain", "Pain:            "),
    label("differentiation", "Differentiation: "),
    label("buildability", "Buildability:    "),
    label("distribution", "Distribution:    "),
    label("monetization", "Monetization:    "),
    label("evidence", "Evidence:        "),
    "",
    `Overall:         ${overallScore(scores, unassessed)}/10 — Median score`,
  ];
  return rows.join("\n");
}
