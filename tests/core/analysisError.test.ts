import { describe, it, expect } from "vitest";
import { AnalysisFailedError, requireAnalysis, toAnalysisFailure, isEmptyAnalysis } from "../../src/core/analysisError.js";
import { runGTMEngine } from "../../src/engines/gtmEngine.js";
import { runCompetitiveIntelligenceEngine } from "../../src/engines/competitiveIntelligenceEngine.js";
import { runRevenueModelEngine } from "../../src/engines/revenueModelEngine.js";
import { runFounderMarketFitEngine } from "../../src/engines/founderMarketFitEngine.js";
import { runUserInterviewEngine } from "../../src/engines/userInterviewEngine.js";
import { runPitchGenerator } from "../../src/engines/pitchGenerator.js";
import { runEvolutionCoach } from "../../src/engines/evolutionCoach.js";
import { runComplianceScanner } from "../../src/engines/complianceScanner.js";
import { runImmuneEngine } from "../../src/engines/immuneEngine.js";
import { runMvpPlanner } from "../../src/engines/mvpPlanner.js";
import { runUserLab } from "../../src/engines/syntheticUserLab.js";
import { runCourtEngine } from "../../src/engines/courtEngine.js";
import type { IdeaInput, LLMProvider } from "../../src/core/types.js";

const IDEA: IdeaInput = { idea: "Inventory app for small cafes" };
const answering = (text: string): LLMProvider => ({ kind: "custom", complete: async () => text });

describe("requireAnalysis", () => {
  it("returns the parsed answer when the essential fields are present", () => {
    const parsed = { summary: "x", list: [1] };
    expect(requireAnalysis(parsed, "Test", ["summary", "list"])).toBe(parsed);
  });

  it("rejects null and empty objects", () => {
    expect(() => requireAnalysis(null, "Test", [])).toThrow(AnalysisFailedError);
    expect(() => requireAnalysis({}, "Test", [])).toThrow(/did not return a usable structured answer/);
    expect(isEmptyAnalysis({})).toBe(true);
    expect(isEmptyAnalysis({ a: 1 })).toBe(false);
  });

  it("names the missing essential fields", () => {
    expect(() => requireAnalysis({ summary: " ", list: [] }, "Test", ["summary", "list"])).toThrow(/missing summary, list/);
  });

  it("wraps provider errors without double-wrapping", () => {
    const first = toAnalysisFailure("Test", new Error("401 unauthorized"));
    expect(first.message).toContain("401 unauthorized");
    expect(first.message).toContain("Nothing was generated");
    expect(toAnalysisFailure("Other", first)).toBe(first);
  });
});

describe("deep-dive engines never fabricate a result", () => {
  const engines: Array<[string, (p: LLMProvider) => Promise<unknown>]> = [
    ["gtm", (p) => runGTMEngine(IDEA, p, { enableSearch: false })],
    ["compete", (p) => runCompetitiveIntelligenceEngine(IDEA, p, { enableSearch: false })],
    ["revenue", (p) => runRevenueModelEngine(IDEA, p, { enableSearch: false })],
    ["founder", (p) => runFounderMarketFitEngine(IDEA, p, "backend developer")],
    ["interview", (p) => runUserInterviewEngine(IDEA, p, {})],
    ["pitch", (p) => runPitchGenerator(IDEA, p, { enableSearch: false })],
    ["evolve", (p) => runEvolutionCoach(IDEA, p, { enableSearch: false })],
    ["compliance", (p) => runComplianceScanner(IDEA, p, { enableSearch: false })],
  ];

  for (const [name, run] of engines) {
    it(`${name}: rejects an empty JSON answer`, async () => {
      await expect(run(answering("{}"))).rejects.toThrow(AnalysisFailedError);
    });

    it(`${name}: rejects a non-JSON answer`, async () => {
      await expect(run(answering("Sorry, I cannot help with that."))).rejects.toThrow(AnalysisFailedError);
    });
  }
});

describe("core modes flag an empty answer as a partial report", () => {
  const modes: Array<[string, (p: LLMProvider) => Promise<{ partial?: boolean; warnings?: string[] }>]> = [
    ["quick", (p) => runImmuneEngine(IDEA, p, { enableSearch: false })],
    ["mvp", (p) => runMvpPlanner(IDEA, p, { enableSearch: false })],
    ["users", (p) => runUserLab(IDEA, p, 4, { enableSearch: false })],
    ["court", (p) => runCourtEngine(IDEA, p, { enableSearch: false })],
  ];

  for (const [name, run] of modes) {
    it(`${name}: '{}' is not treated as a successful analysis`, async () => {
      const report = await run(answering("{}"));
      expect(report.partial).toBe(true);
      expect(report.warnings?.length).toBeGreaterThan(0);
    });
  }
});
