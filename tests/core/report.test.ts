import { describe, it, expect } from "vitest";
import { buildReport } from "../../src/core/report.js";
import type { GauntletReport } from "../../src/core/types.js";

describe("buildReport", () => {
  it("includes verdict section in output", () => {
    const report: GauntletReport = {
      id: "test-1", createdAt: "2026-07-03T12:00:00Z", mode: "quick",
      input: { idea: "Test idea" }, verdict: "unclear",
      coreInsight: "Test insight", nextActions: ["Test action"], markdown: "",
    };
    const md = buildReport(report);
    expect(md).toContain("# IdeaGauntlet Report");
    expect(md).toContain("## Verdict");
    expect(md).toContain("unclear");
  });

  it("includes scorecard when scores provided", () => {
    const report: GauntletReport = {
      id: "test-2", createdAt: "2026-07-03T12:00:00Z", mode: "quick",
      input: { idea: "Test" }, verdict: "unclear",
      scores: { clarity: 6, pain: 5, differentiation: 4, buildability: 7, distribution: 3, monetization: 2, evidence: 1 },
      markdown: "",
    };
    const md = buildReport(report);
    expect(md).toContain("Clarity");
    expect(md).toContain("6/10");
  });

  it("includes synthetic user disclaimer when synthetic users present", () => {
    const report: GauntletReport = {
      id: "test-3", createdAt: "2026-07-03T12:00:00Z", mode: "users",
      input: { idea: "Test" }, verdict: "unclear",
      syntheticUsers: [{
        name: "Test User", archetype: "Tester", goal: "Test",
        currentWorkaround: "Manual testing", triggerToTry: "New tool",
        primaryObjection: "Time", willingnessToPay: "low",
        likelyChurnReason: "No value", quote: "Maybe",
        interviewQuestion: "What would make you stay?",
      }],
      markdown: "",
    };
    const md = buildReport(report);
    expect(md).toContain("Synthetic users are fictional archetypes");
  });
});
