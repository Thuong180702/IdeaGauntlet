import { describe, it, expect } from "vitest";
import { runMvpPlanner } from "../../src/engines/mvpPlanner.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("runMvpPlanner", () => {
  it("returns enhanced MVP plan with kill criteria", async () => {
    const provider = new StaticProvider();
    const report = await runMvpPlanner({ idea: "Test idea" }, provider);
    expect(report.enhancedMvpPlan).toBeDefined();
    expect(Array.isArray(report.enhancedMvpPlan!.killCriteria)).toBe(true);
    expect(report.enhancedMvpPlan!.killCriteria.length).toBeGreaterThan(0);
  });

  it("returns pivot options", async () => {
    const provider = new StaticProvider();
    const report = await runMvpPlanner({ idea: "Test idea" }, provider);
    expect(Array.isArray(report.enhancedMvpPlan!.pivotOptions)).toBe(true);
  });

  it("returns success metrics with targets", async () => {
    const provider = new StaticProvider();
    const report = await runMvpPlanner({ idea: "Test idea" }, provider);
    expect(Array.isArray(report.enhancedMvpPlan!.successMetrics)).toBe(true);
    if (report.enhancedMvpPlan!.successMetrics.length > 0) {
      expect(typeof report.enhancedMvpPlan!.successMetrics[0].target).toBe("string");
    }
  });

  it("returns backward-compatible MVP plan", async () => {
    const provider = new StaticProvider();
    const report = await runMvpPlanner({ idea: "Test idea" }, provider);
    expect(report.mvpPlan).toBeDefined();
    expect(typeof report.mvpPlan!.goal).toBe("string");
  });
});
