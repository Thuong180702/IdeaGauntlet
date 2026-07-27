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
 * pon ytail: If the LLM provides its own evidence score (1-10), trust it over
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
 * ponytail: Heuristic evidence score — fallback when LLM doesn't provide one.
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

const ALL_DIMENSIONS: (keyof Scorecard)[] = [
  "clarity", "pain", "differentiation", "buildability",
  "distribution", "monetization", "evidence",
];

/**
 * Overall = median over dimensions the mode actually assessed. Unassessed
 * dimensions are excluded so fake constants can't drag the overall up or down.
 */
export function overallScore(scores: Scorecard, unassessed?: (keyof Scorecard)[]): number {
  const skip = new Set(unassessed ?? []);
  const values = ALL_DIMENSIONS
    .filter((d) => !skip.has(d))
    .map((d) => scores[d])
    .sort((a, b) => a - b);
  if (values.length === 0) return 0;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? Math.round((values[mid - 1] + values[mid]) / 2)
    : values[mid];
}

export function formatScores(scores: Scorecard): string {
  const rows = [
    `Clarity:        ${scores.clarity}/10`,
    `Pain:           ${scores.pain}/10`,
    `Differentiation: ${scores.differentiation}/10`,
    `Buildability:   ${scores.buildability}/10`,
    `Distribution:   ${scores.distribution}/10`,
    `Monetization:   ${scores.monetization}/10`,
    `Evidence:       ${scores.evidence}/10`,
    "",
    `Overall:        ${medianScore(scores)}/10 — Median score`,
  ];
  return rows.join("\n");
}
