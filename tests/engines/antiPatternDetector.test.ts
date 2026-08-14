import { describe, it, expect } from "vitest";
import { runAntiPatternDetector, STARTUP_ANTI_PATTERNS } from "../../src/engines/antiPatternDetector.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("antiPatternDetector", () => {
  it("defines standard startup anti-patterns", () => {
    expect(STARTUP_ANTI_PATTERNS.length).toBeGreaterThanOrEqual(10);
    const ids = STARTUP_ANTI_PATTERNS.map((p) => p.id);
    expect(ids).toContain("feature_not_product");
    expect(ids).toContain("vitamin_not_painkiller");
    expect(ids).toContain("solution_in_search_of_problem");
  });

  it("throws on empty idea", async () => {
    const provider = new StaticProvider();
    await expect(runAntiPatternDetector({ idea: "" }, provider)).rejects.toThrow("non-empty");
  });

  it("audits idea against anti-patterns and returns risk report", async () => {
    const provider = new StaticProvider();
    const result = await runAntiPatternDetector(
      { idea: "Focus room app for remote workers" },
      provider,
      { enableSearch: false },
    );

    expect(result.overallRiskLevel).toBe("medium");
    expect(Array.isArray(result.detectedPatterns)).toBe(true);
    expect(result.detectedPatterns.length).toBeGreaterThan(0);
    const matched = result.detectedPatterns.find((p) => p.matched);
    expect(matched).toBeDefined();
    expect(matched?.name).toBe("Feature Not a Product");
  });
});
