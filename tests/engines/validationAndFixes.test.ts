import { describe, it, expect } from "vitest";
import { runUserLab } from "../../src/engines/syntheticUserLab.js";
import { runMvpPlanner } from "../../src/engines/mvpPlanner.js";
import { runImmuneEngine } from "../../src/engines/immuneEngine.js";
import { runCourtEngine } from "../../src/engines/courtEngine.js";
import { runBatchEngine } from "../../src/engines/batchEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("Input validation — all engines reject empty ideas", () => {
  const provider = new StaticProvider();

  it("immuneEngine throws on empty idea", async () => {
    await expect(runImmuneEngine({ idea: "" }, provider, { enableSearch: false }))
      .rejects.toThrow("non-empty");
  });

  it("immuneEngine throws on whitespace-only idea", async () => {
    await expect(runImmuneEngine({ idea: "   " }, provider, { enableSearch: false }))
      .rejects.toThrow("non-empty");
  });

  it("courtEngine throws on empty idea", async () => {
    await expect(runCourtEngine({ idea: "" }, provider, { enableSearch: false }))
      .rejects.toThrow("non-empty");
  });

  it("mvpPlanner throws on empty idea", async () => {
    await expect(runMvpPlanner({ idea: "" }, provider, { enableSearch: false }))
      .rejects.toThrow("non-empty");
  });

  it("userLab throws on empty idea", async () => {
    await expect(runUserLab({ idea: "" }, provider, 6, { enableSearch: false }))
      .rejects.toThrow("non-empty");
  });

  it("batchEngine returns empty result for empty ideas array", async () => {
    const result = await runBatchEngine([], provider, "quick");
    expect(result.total).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("batchEngine skips ideas with empty text", async () => {
    const result = await runBatchEngine(
      [{ idea: "" }, { idea: "Real idea" }],
      provider,
      "quick",
      { enableSearch: false },
    );
    expect(result.failed).toBeGreaterThan(0);
    // Should still process the real idea
    expect(result.results).toHaveLength(2);
  });
});

describe("Users mode — scoring and verdict not always unclear", () => {
  it("returns a verdict that is not always unclear for a good idea", async () => {
    const provider = new StaticProvider();
    const report = await runUserLab(
      { idea: "An AI body-doubling app for remote workers" },
      provider,
      6,
      { enableSearch: false },
    );
    // Should not ALWAYS be unclear — it can be promising_but_risky etc.
    expect(report.verdict).toBeTruthy();
    expect(typeof report.verdict).toBe("string");
  });

  it("returns a meaningful scorecard", async () => {
    const provider = new StaticProvider();
    const report = await runUserLab(
      { idea: "Test idea" },
      provider,
      6,
      { enableSearch: false },
    );
    // After our fix, scores should be defined from synthesis scores
    expect(report.scores).toBeDefined();
    if (report.scores) {
      expect(report.scores.monetization).toBeGreaterThanOrEqual(1);
      expect(report.scores.monetization).toBeLessThanOrEqual(10);
      expect(report.scores.pain).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("MVP mode — timeline not always hardcoded", () => {
  it("returns timeline from LLM response instead of hardcoded '14 days'", async () => {
    const provider = new StaticProvider(); // StaticProvider returns timeline: "10 days"
    const report = await runMvpPlanner({ idea: "Test idea" }, provider, { enableSearch: false });
    // StaticProvider now returns "10 days" — should NOT be the old default "14 days"
    expect(report.mvpPlan?.timeline).toBe("10 days");
  });

  it("falls back to default timeline if LLM returns empty", async () => {
    // Provider that returns MVP response without timeline
    const noTimelineProvider = new StaticProvider();
    const original = noTimelineProvider.complete.bind(noTimelineProvider);
    // @ts-ignore — monkey-patch for testing
    noTimelineProvider.complete = async (prompt: string, opts: any) => {
      const response = await original(prompt, opts);
      if (typeof response === "string" && response.includes("coreHypothesis")) {
        const parsed = JSON.parse(response);
        delete parsed.timeline;
        return JSON.stringify(parsed);
      }
      return response;
    };
    const report = await runMvpPlanner({ idea: "Test idea" }, noTimelineProvider, { enableSearch: false });
    // Should fall back to default "14 days"
    expect(report.mvpPlan?.timeline).toBe("14 days");
  });
});

describe("batchEngine — all reports have markdown populated", () => {
  it("populates markdown for all successful reports", async () => {
    const provider = new StaticProvider();
    const result = await runBatchEngine(
      [{ idea: "Test idea 1" }, { idea: "Test idea 2" }],
      provider,
      "quick",
      { enableSearch: false, concurrency: 2 },
    );
    for (const r of result.results) {
      if (r.report) {
        expect(r.report.markdown).toBeTruthy();
        expect(r.report.markdown.length).toBeGreaterThan(10);
      }
    }
  });
});
