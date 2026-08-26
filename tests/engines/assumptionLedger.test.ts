import { describe, it, expect } from "vitest";
import {
  runAssumptionLedger,
  formatAssumptionLedger,
  finalizeLedger,
  computeAssumptionPriority,
} from "../../src/engines/assumptionLedger.js";
import type { LLMProvider, IdeaInput, LedgerAssumption } from "../../src/core/types.js";

/** Returns whatever it was constructed with, so engine parsing can be tested alone. */
class ScriptedProvider implements LLMProvider {
  kind = "custom" as const;
  constructor(private response: string) {}
  async complete(): Promise<string> {
    return this.response;
  }
}

const idea: IdeaInput = { idea: "A focus room app for remote workers", mode: "quick" };

function payload(assumptions: unknown[], extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    assumptions,
    riskiestAssumption: "Model's own pick",
    summary: "Betting on demand.",
    ...extra,
  });
}

function assumption(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    statement: "Remote workers will pay $10/mo",
    criticality: "fatal",
    confidence: "low",
    whyItMatters: "No revenue otherwise",
    test: { method: "Fake-door landing page", timeboxDays: 3, costUsd: 50, sampleSize: "40 visitors" },
    killThreshold: "Fewer than 8 of 40 visitors leave an email",
    surviveSignal: "12+ emails",
    ...over,
  };
}

describe("computeAssumptionPriority", () => {
  it("ranks a fatal, uncertain, cheap assumption highest", () => {
    const top = computeAssumptionPriority({
      criticality: "fatal", confidence: "low",
      test: { timeboxDays: 2, costUsd: 0 },
    });
    const bottom = computeAssumptionPriority({
      criticality: "minor", confidence: "high",
      test: { timeboxDays: 30, costUsd: 5000 },
    });
    expect(top).toBeGreaterThan(bottom);
    expect(top).toBe(27);
    expect(bottom).toBe(1);
  });

  // The reason priority multiplies instead of adding.
  it("never lets a cheap minor test outrank a costlier fatal one", () => {
    const cheapMinor = computeAssumptionPriority({
      criticality: "minor", confidence: "low",
      test: { timeboxDays: 1, costUsd: 0 },
    });
    const costlyFatal = computeAssumptionPriority({
      criticality: "fatal", confidence: "low",
      test: { timeboxDays: 30, costUsd: 5000 },
    });
    expect(costlyFatal).toBeGreaterThanOrEqual(cheapMinor);
  });

  it("treats a resolved assumption as lower priority than an open one", () => {
    const known = computeAssumptionPriority({
      criticality: "fatal", confidence: "high", test: { timeboxDays: 3, costUsd: 0 },
    });
    const unknown = computeAssumptionPriority({
      criticality: "fatal", confidence: "low", test: { timeboxDays: 3, costUsd: 0 },
    });
    expect(unknown).toBeGreaterThan(known);
  });
});

describe("finalizeLedger", () => {
  const make = (over: Partial<LedgerAssumption>): LedgerAssumption => ({
    id: "x", statement: "s", criticality: "major", confidence: "medium",
    whyItMatters: "", test: { method: "m", timeboxDays: 5, costUsd: 100 },
    killThreshold: "k", surviveSignal: "", priority: 0,
    ...over,
  });

  it("orders by priority, highest first", () => {
    const ledger = finalizeLedger(
      [
        make({ id: "low", priority: 2 }),
        make({ id: "high", priority: 18 }),
        make({ id: "mid", priority: 8 }),
      ],
      "", "",
    );
    expect(ledger.testOrder).toEqual(["high", "mid", "low"]);
  });

  it("breaks priority ties by cheaper test first", () => {
    const ledger = finalizeLedger(
      [
        make({ id: "expensive", priority: 6, test: { method: "m", timeboxDays: 20, costUsd: 900 } }),
        make({ id: "cheap", priority: 6, test: { method: "m", timeboxDays: 1, costUsd: 0 } }),
      ],
      "", "",
    );
    expect(ledger.testOrder).toEqual(["cheap", "expensive"]);
  });

  // The riskiest assumption is computed, not echoed from the model.
  it("picks the highest-priority fatal assumption over the model's own claim", () => {
    const ledger = finalizeLedger(
      [
        make({ id: "minor", statement: "Minor thing", criticality: "minor", priority: 30 }),
        make({ id: "fatal", statement: "The real bet", criticality: "fatal", priority: 12 }),
      ],
      "Model's own pick", "",
    );
    expect(ledger.riskiestAssumption).toBe("The real bet");
  });

  it("falls back to the top-priority assumption when nothing is fatal", () => {
    const ledger = finalizeLedger(
      [make({ id: "a", statement: "Top one", criticality: "major", priority: 9 })],
      "Model's own pick", "",
    );
    expect(ledger.riskiestAssumption).toBe("Top one");
  });

  it("totals the full ledger and the fatal subset separately", () => {
    const ledger = finalizeLedger(
      [
        make({ id: "f", criticality: "fatal", test: { method: "m", timeboxDays: 3, costUsd: 50 } }),
        make({ id: "m", criticality: "minor", test: { method: "m", timeboxDays: 10, costUsd: 500 } }),
      ],
      "", "",
    );
    expect(ledger.totalTimeboxDays).toBe(13);
    expect(ledger.totalCostUsd).toBe(550);
    expect(ledger.fatalTimeboxDays).toBe(3);
    expect(ledger.fatalCostUsd).toBe(50);
  });
});

describe("runAssumptionLedger", () => {
  it("parses a well-formed response into an ordered ledger", async () => {
    const provider = new ScriptedProvider(payload([
      assumption({ statement: "Cheap fatal bet", test: { method: "Landing page", timeboxDays: 2, costUsd: 0 } }),
      assumption({ statement: "Minor polish", criticality: "minor", confidence: "high",
        test: { method: "Survey", timeboxDays: 20, costUsd: 800 } }),
    ]));

    const ledger = await runAssumptionLedger(idea, provider, { enableSearch: false });

    expect(ledger.assumptions).toHaveLength(2);
    expect(ledger.assumptions[0].statement).toBe("Cheap fatal bet");
    expect(ledger.riskiestAssumption).toBe("Cheap fatal bet");
    expect(ledger.testOrder[0]).toBe(ledger.assumptions[0].id);
    expect(ledger.fatalCostUsd).toBe(0);
    expect(ledger.totalCostUsd).toBe(800);
  });

  it("assigns stable, unique ids derived from the statement", async () => {
    const provider = new ScriptedProvider(payload([
      assumption({ statement: "Remote workers will pay ten dollars monthly" }),
      assumption({ statement: "Remote workers will pay ten dollars monthly" }),
    ]));
    const ledger = await runAssumptionLedger(idea, provider, { enableSearch: false });
    const ids = ledger.assumptions.map((a) => a.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toMatch(/^a\d+-remote-workers/);
  });

  // An unlabelled assumption must not be silently treated as harmless.
  it("defaults unknown criticality to major and unknown confidence to low", async () => {
    const provider = new ScriptedProvider(payload([
      assumption({ criticality: "somewhat risky", confidence: "unsure" }),
    ]));
    const ledger = await runAssumptionLedger(idea, provider, { enableSearch: false });
    expect(ledger.assumptions[0].criticality).toBe("major");
    expect(ledger.assumptions[0].confidence).toBe("low");
  });

  it("flags an assumption that arrived without a kill threshold", async () => {
    const provider = new ScriptedProvider(payload([assumption({ killThreshold: "  " })]));
    const ledger = await runAssumptionLedger(idea, provider, { enableSearch: false });
    expect(ledger.assumptions[0].killThreshold).toContain("not yet falsifiable");
  });

  it("coerces malformed test numbers instead of producing NaN totals", async () => {
    const provider = new ScriptedProvider(payload([
      assumption({ test: { method: "m", timeboxDays: "soon", costUsd: -5 } }),
    ]));
    const ledger = await runAssumptionLedger(idea, provider, { enableSearch: false });
    expect(ledger.assumptions[0].test.timeboxDays).toBe(7);
    expect(ledger.assumptions[0].test.costUsd).toBe(0);
    expect(Number.isFinite(ledger.totalTimeboxDays)).toBe(true);
  });

  it("caps the ledger at the requested size", async () => {
    const provider = new ScriptedProvider(payload(
      Array.from({ length: 9 }, (_, i) => assumption({ statement: `Bet number ${i}` })),
    ));
    const ledger = await runAssumptionLedger(idea, provider, { enableSearch: false, maxAssumptions: 4 });
    expect(ledger.assumptions).toHaveLength(4);
  });

  // A ledger of invented thresholds is worse than no ledger.
  it("throws rather than fabricating a ledger when the response is unusable", async () => {
    const provider = new ScriptedProvider("not json at all");
    await expect(runAssumptionLedger(idea, provider, { enableSearch: false }))
      .rejects.toThrow(/Could not build an assumption ledger/);
  });

  it("throws when the response contains no assumptions", async () => {
    const provider = new ScriptedProvider(payload([]));
    await expect(runAssumptionLedger(idea, provider, { enableSearch: false }))
      .rejects.toThrow(/Could not build an assumption ledger/);
  });

  it("rejects an empty idea", async () => {
    const provider = new ScriptedProvider(payload([assumption()]));
    await expect(runAssumptionLedger({ idea: "  ", mode: "quick" }, provider, { enableSearch: false }))
      .rejects.toThrow(/non-empty product idea/);
  });
});

describe("formatAssumptionLedger", () => {
  it("renders thresholds, costs, and the de-risk budget", async () => {
    const provider = new ScriptedProvider(payload([
      assumption({ statement: "Remote workers will pay $10/mo" }),
      assumption({ statement: "IT teams will allow it", criticality: "minor", confidence: "medium",
        test: { method: "5 IT interviews", timeboxDays: 7, costUsd: 0 } }),
    ]));
    const ledger = await runAssumptionLedger(idea, provider, { enableSearch: false });
    const md = formatAssumptionLedger(ledger);

    expect(md).toContain("Assumption Ledger");
    expect(md).toContain("Remote workers will pay $10/mo");
    expect(md).toContain("Kill threshold");
    expect(md).toContain("Fewer than 8 of 40 visitors leave an email");
    expect(md).toContain("Fake-door landing page");
    expect(md).toContain("Budget to de-risk");
    expect(md).toContain("$0");
    // Ordering is visible in the rendered output, not just the data.
    expect(md.indexOf("Remote workers will pay $10/mo"))
      .toBeLessThan(md.indexOf("IT teams will allow it"));
  });
});
