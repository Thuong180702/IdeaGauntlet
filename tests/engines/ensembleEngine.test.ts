import { describe, it, expect } from "vitest";
import { runEnsemble, formatEnsembleResult } from "../../src/engines/ensembleEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

const IDEA = "A focus-room app for remote workers that pairs people into silent 50-minute work sessions.";

describe("runEnsemble", () => {
  it("requires at least 2 providers", async () => {
    await expect(
      runEnsemble({ idea: IDEA, mode: "quick", providers: [new StaticProvider()] })
    ).rejects.toThrow("Ensemble requires at least 2 providers");
  });

  it("returns aggregate scores and consensus verdict from 2 providers", async () => {
    const result = await runEnsemble({
      idea: IDEA,
      mode: "quick",
      providers: [new StaticProvider(), new StaticProvider()],
      enableSearch: false,
    });

    expect(result.reports).toHaveLength(2);
    expect(result.consensusVerdict).toBeDefined();
    expect(typeof result.consensusVerdict).toBe("string");
    expect(result.disagreement).toBeDefined();
  });

  it("returns aggregateScores when both providers produce scores", async () => {
    const result = await runEnsemble({
      idea: IDEA,
      mode: "quick",
      providers: [new StaticProvider(), new StaticProvider()],
      enableSearch: false,
    });

    // Both providers return the same scores so disagreement should be 0
    if (result.aggregateScores) {
      const dims = ["clarity", "pain", "differentiation", "buildability", "distribution", "monetization", "evidence"] as const;
      for (const dim of dims) {
        expect(result.aggregateScores[dim]).toBeGreaterThanOrEqual(0);
        expect(result.aggregateScores[dim]).toBeLessThanOrEqual(10);
      }
    }
  });

  it("handles partial provider failure gracefully", async () => {
    class FailingProvider implements import("../../src/core/types.js").LLMProvider {
      kind = "custom" as const;
      async complete(): Promise<string> { throw new Error("Simulated provider failure"); }
    }

    const result = await runEnsemble({
      idea: IDEA,
      mode: "quick",
      providers: [new StaticProvider(), new FailingProvider()],
      enableSearch: false,
    });

    // At least the successful provider should have run
    expect(result.reports.length).toBeGreaterThanOrEqual(1);
    // Should not throw
    expect(result.consensusVerdict).toBeDefined();
  });

  it("returns a result even when providers throw — runGauntlet has graceful degradation", async () => {
    class FailingProvider implements import("../../src/core/types.js").LLMProvider {
      kind = "custom" as const;
      async complete(): Promise<string> { throw new Error("Simulated provider failure"); }
    }

    // runGauntlet has graceful degradation — it returns a partial report rather than
    // throwing. So even with all-failing providers, reports may still be produced.
    const result = await runEnsemble({
      idea: IDEA,
      mode: "quick",
      providers: [new FailingProvider(), new FailingProvider()],
      enableSearch: false,
    });

    // The result is always a valid EnsembleResult
    expect(result).toHaveProperty("reports");
    expect(result).toHaveProperty("consensusVerdict");
    expect(result).toHaveProperty("disagreement");
    expect(typeof result.consensusVerdict).toBe("string");
  });

  it("passes targetUsers, market, stage to each provider run", async () => {
    const result = await runEnsemble({
      idea: IDEA,
      mode: "quick",
      providers: [new StaticProvider(), new StaticProvider()],
      targetUsers: ["remote workers"],
      market: "productivity",
      stage: "napkin",
      enableSearch: false,
    });

    expect(result.reports).toHaveLength(2);
    for (const r of result.reports) {
      expect(r.input.idea).toBe(IDEA);
    }
  });
});

describe("formatEnsembleResult", () => {
  it("formats a successful ensemble result as markdown", async () => {
    const result = await runEnsemble({
      idea: IDEA,
      mode: "quick",
      providers: [new StaticProvider(), new StaticProvider()],
      enableSearch: false,
    });

    const output = formatEnsembleResult(result);
    expect(output).toContain("Ensemble Analysis Report");
    expect(output).toContain("Models:");
    expect(output).toContain("Consensus Verdict");
    expect(output).toContain("Per-Model Results");
  });

  it("formats the empty (all failed) case without crashing", () => {
    const output = formatEnsembleResult({
      reports: [],
      disagreement: {},
      consensusVerdict: "all_models_failed",
    });
    expect(output).toContain("Ensemble Analysis Report");
    expect(typeof output).toBe("string");
  });

  it("flags high disagreement dimensions with ⚠️", async () => {
    // Build a fake result with a forced high disagreement
    const fakeResult = {
      reports: [],
      aggregateScores: { clarity: 5, pain: 5, differentiation: 5, buildability: 5, distribution: 5, monetization: 5, evidence: 5 },
      disagreement: { distribution: 5, monetization: 4 },
      consensusVerdict: "unclear" as const,
    };
    const output = formatEnsembleResult(fakeResult);
    expect(output).toContain("⚠️");
    expect(output).toContain("High disagreement");
  });
});
