import { describe, it, expect } from "vitest";
import { runCompareEngine } from "../../src/engines/compareEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("runCompareEngine", () => {
  it("returns enhanced comparison with matrix", async () => {
    const provider = new StaticProvider();
    const ideas = [{ idea: "Focus Room App" }, { idea: "SaaS Inbox for Sellers" }];
    const report = await runCompareEngine(ideas, provider);
    expect(report.enhancedComparison).toBeDefined();
    expect(Array.isArray(report.enhancedComparison!.comparisonMatrix)).toBe(true);
    expect(report.enhancedComparison!.comparisonMatrix.length).toBe(2);
  });

  it("returns per-idea kill tests", async () => {
    const provider = new StaticProvider();
    const ideas = [{ idea: "Focus Room App" }, { idea: "SaaS Inbox for Sellers" }];
    const report = await runCompareEngine(ideas, provider);
    expect(Array.isArray(report.enhancedComparison!.killTestsPerIdea)).toBe(true);
  });

  it("returns recommendation with caveats", async () => {
    const provider = new StaticProvider();
    const ideas = [{ idea: "Focus Room App" }, { idea: "SaaS Inbox for Sellers" }];
    const report = await runCompareEngine(ideas, provider);
    expect(report.enhancedComparison!.recommendation.pick).toBeTruthy();
    expect(Array.isArray(report.enhancedComparison!.recommendation.caveats)).toBe(true);
  });

  it("returns backward-compatible comparison", async () => {
    const provider = new StaticProvider();
    const ideas = [{ idea: "Focus Room App" }, { idea: "SaaS Inbox for Sellers" }];
    const report = await runCompareEngine(ideas, provider);
    expect(report.comparison).toBeDefined();
    expect(Array.isArray(report.comparison!.ideas)).toBe(true);
  });
});
