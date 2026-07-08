import { describe, it, expect } from "vitest";
import { calculateScores, medianScore } from "../../src/core/scoring.js";

describe("calculateScores", () => {
  it("returns low evidence score when no evidence provided", () => {
    const { scores } = calculateScores({ hasEvidence: false });
    expect(scores.evidence).toBeLessThanOrEqual(2);
  });

  it("returns higher evidence score with strong evidence", () => {
    const { scores } = calculateScores({ hasEvidence: true, evidenceStrength: "strong" });
    expect(scores.evidence).toBeGreaterThanOrEqual(6);
  });
});

describe("medianScore", () => {
  it("returns the median of 7 scores", () => {
    const scores = { clarity: 9, pain: 1, differentiation: 3, buildability: 5, distribution: 7, monetization: 4, evidence: 2 };
    expect(medianScore(scores)).toBe(4);
  });
});
