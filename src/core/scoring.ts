import type { Scorecard } from "./types.js";

export function calculateScores(params: {
  hasEvidence: boolean;
  evidenceStrength?: "weak" | "medium" | "strong";
  overrides?: Partial<Scorecard>;
}): Scorecard {
  const { hasEvidence, evidenceStrength, overrides } = params;
  const defaults = {
    clarity: 6,
    pain: 5,
    differentiation: 5,
    buildability: 6,
    distribution: 3,
    monetization: 3,
    evidence: evidenceScore(hasEvidence, evidenceStrength),
  };
  return { ...defaults, ...overrides };
}

function evidenceScore(hasEvidence: boolean, strength?: "weak" | "medium" | "strong"): number {
  if (!hasEvidence) return 1;
  switch (strength) {
    case "strong": return 8;
    case "medium": return 5;
    case "weak": return 3;
    default: return 2;
  }
}

export function medianScore(scores: Scorecard): number {
  const values = [
    scores.clarity, scores.pain, scores.differentiation,
    scores.buildability, scores.distribution, scores.monetization,
    scores.evidence,
  ].sort((a, b) => a - b);
  return values[3]; // middle of 7
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
