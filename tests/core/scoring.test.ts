import { describe, it, expect } from "vitest";
import { calculateScores, medianScore, formatScores } from "../../src/core/scoring.js";

describe("calculateScores", () => {
  it("returns low evidence score when no evidence provided", () => {
    const { scores } = calculateScores({ hasEvidence: false });
    expect(scores.evidence).toBeLessThanOrEqual(2);
  });

  it("returns higher evidence score with strong evidence", () => {
    const { scores } = calculateScores({ hasEvidence: true, evidenceStrength: "strong" });
    expect(scores.evidence).toBeGreaterThanOrEqual(6);
  });

  it("evidence score: weak=3, medium=5, strong=8", () => {
    const weak = calculateScores({ hasEvidence: true, evidenceStrength: "weak" });
    const medium = calculateScores({ hasEvidence: true, evidenceStrength: "medium" });
    const strong = calculateScores({ hasEvidence: true, evidenceStrength: "strong" });
    expect(weak.scores.evidence).toBe(3);
    expect(medium.scores.evidence).toBe(5);
    expect(strong.scores.evidence).toBe(8);
  });

  it("applies overrides over defaults", () => {
    const { scores } = calculateScores({
      hasEvidence: true,
      evidenceStrength: "strong",
      overrides: { pain: 9, monetization: 8 },
    });
    expect(scores.pain).toBe(9);
    expect(scores.monetization).toBe(8);
    expect(scores.evidence).toBe(8);
  });

  it("propagates reasons object", () => {
    const { reasons } = calculateScores({
      hasEvidence: false,
      reasons: { clarity: "Very clear idea" },
    });
    expect(reasons.clarity).toBe("Very clear idea");
  });

  it("defaults clarity to 6 and pain to 5", () => {
    const { scores } = calculateScores({ hasEvidence: false });
    expect(scores.clarity).toBe(6);
    expect(scores.pain).toBe(5);
  });
});

describe("medianScore", () => {
  it("returns the median of 7 scores", () => {
    const scores = { clarity: 9, pain: 1, differentiation: 3, buildability: 5, distribution: 7, monetization: 4, evidence: 2 };
    expect(medianScore(scores)).toBe(4);
  });

  it("returns middle of sorted values correctly", () => {
    // sorted: [1, 2, 3, 5, 7, 8, 9] => index 3 = 5
    const median = medianScore({
      clarity: 7,
      pain: 3,
      differentiation: 8,
      buildability: 5,
      distribution: 1,
      monetization: 2,
      evidence: 9,
    });
    expect(median).toBe(5);
  });

  it("returns correct value when all scores are equal", () => {
    const median = medianScore({
      clarity: 6, pain: 6, differentiation: 6,
      buildability: 6, distribution: 6, monetization: 6, evidence: 6,
    });
    expect(median).toBe(6);
  });
});

describe("formatScores", () => {
  it("includes all 7 dimensions and Overall line", () => {
    const text = formatScores({
      clarity: 8, pain: 7, differentiation: 6,
      buildability: 7, distribution: 5, monetization: 6, evidence: 4,
    });
    expect(text).toContain("Clarity:");
    expect(text).toContain("Pain:");
    expect(text).toContain("Differentiation:");
    expect(text).toContain("Buildability:");
    expect(text).toContain("Distribution:");
    expect(text).toContain("Monetization:");
    expect(text).toContain("Evidence:");
    expect(text).toContain("Overall:");
  });
});
