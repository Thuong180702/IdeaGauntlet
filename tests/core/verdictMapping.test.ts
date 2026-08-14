import { describe, it, expect } from "vitest";
import { computeVerdict, mapVerdictFromText } from "../../src/core/verdictMapping.js";

describe("verdictMapping", () => {
  describe("mapVerdictFromText", () => {
    it("maps clean prefix verdicts correctly", () => {
      expect(mapVerdictFromText("strong")).toBe("strong");
      expect(mapVerdictFromText("promising but risky")).toBe("promising_but_risky");
      expect(mapVerdictFromText("pivot recommended")).toBe("pivot_recommended");
      expect(mapVerdictFromText("needs real evidence")).toBe("needs_real_evidence");
      expect(mapVerdictFromText("weak")).toBe("weak");
      expect(mapVerdictFromText("unclear")).toBe("unclear");
    });

    it("handles headers and formatting prefixes", () => {
      expect(mapVerdictFromText("### Verdict: Strong")).toBe("strong");
      expect(mapVerdictFromText("> Verdict: Promising but risky")).toBe("promising_but_risky");
      expect(mapVerdictFromText("**Verdict:** Weak")).toBe("weak");
    });

    it("does not false-positive on 'strongest competitor' or 'strong competition'", () => {
      expect(mapVerdictFromText("The strongest competitor in this market is Notion")).toBeUndefined();
      expect(mapVerdictFromText("Strong competition makes this market difficult")).toBeUndefined();
    });

    it("returns undefined on empty or unrecognized text", () => {
      expect(mapVerdictFromText("")).toBeUndefined();
      expect(mapVerdictFromText("Just some generic description without a verdict")).toBeUndefined();
    });
  });

  describe("computeVerdict", () => {
    it("computes strong verdict on high median and high evidence", () => {
      const verdict = computeVerdict({
        scores: { clarity: 9, pain: 8, differentiation: 8, buildability: 8, distribution: 8, monetization: 8, evidence: 8 },
      });
      expect(verdict).toBe("strong");
    });

    it("computes promising_but_risky for median >= 6", () => {
      const verdict = computeVerdict({
        scores: { clarity: 6, pain: 6, differentiation: 6, buildability: 6, distribution: 6, monetization: 6, evidence: 6 },
      });
      expect(verdict).toBe("promising_but_risky");
    });

    it("computes needs_real_evidence on low evidence and low median", () => {
      const verdict = computeVerdict({
        scores: { clarity: 4, pain: 4, differentiation: 4, buildability: 4, distribution: 4, monetization: 4, evidence: 1 },
      });
      expect(verdict).toBe("needs_real_evidence");
    });
  });
});
