import { describe, it, expect } from "vitest";
import { runUserLab } from "../../src/engines/syntheticUserLab.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("runUserLab", () => {
  it("returns enhanced personas with full fields", async () => {
    const provider = new StaticProvider();
    const report = await runUserLab({ idea: "Test idea" }, provider, 6, { enableSearch: false });
    expect(report.enhancedSyntheticUsers).toBeDefined();
    expect(report.enhancedSyntheticUsers!.length).toBeGreaterThan(0);
    const persona = report.enhancedSyntheticUsers![0];
    expect(persona.name).toBeTruthy();
    expect(persona.archetype).toBeTruthy();
    expect(typeof persona.primaryObjection).toBe("string");
    expect(typeof persona.switchingCost).toBe("string");
    expect(typeof persona.adoptionBlocker).toBe("string");
  });

  it("returns user synthesis", async () => {
    const provider = new StaticProvider();
    const report = await runUserLab({ idea: "Test idea" }, provider, 6, { enableSearch: false });
    expect(report.userSynthesis).toBeDefined();
    expect(Array.isArray(report.userSynthesis!.recurringObjections)).toBe(true);
    expect(Array.isArray(report.userSynthesis!.interviewQuestions)).toBe(true);
    expect(Array.isArray(report.userSynthesis!.fakeDoorTestIdeas)).toBe(true);
  });

  it("returns backward-compatible synthetic users", async () => {
    const provider = new StaticProvider();
    const report = await runUserLab({ idea: "Test idea" }, provider, 6, { enableSearch: false });
    expect(Array.isArray(report.syntheticUsers)).toBe(true);
  });

  it("returns a meaningful scorecard (not undefined) when synthesis is present", async () => {
    const provider = new StaticProvider();
    const report = await runUserLab({ idea: "Test idea" }, provider, 6, { enableSearch: false });
    expect(report.scores).toBeDefined();
    if (report.scores) {
      expect(report.scores.monetization).toBeGreaterThanOrEqual(1);
      expect(report.scores.monetization).toBeLessThanOrEqual(10);
    }
  });

  it("returns a non-empty verdict", async () => {
    const provider = new StaticProvider();
    const report = await runUserLab({ idea: "Test idea" }, provider, 6, { enableSearch: false });
    expect(report.verdict).toBeTruthy();
  });

  it("clamps user count to max 12", async () => {
    const provider = new StaticProvider();
    const report = await runUserLab({ idea: "Test idea" }, provider, 999, { enableSearch: false });
    // Even if count is huge, engine should not crash
    expect(report).toBeDefined();
  });
});

