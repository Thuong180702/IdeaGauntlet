import { describe, it, expect } from "vitest";
import { runMarketSizingEngine } from "../../src/engines/marketSizingEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("marketSizingEngine", () => {
  it("throws on empty idea", async () => {
    const provider = new StaticProvider();
    await expect(runMarketSizingEngine({ idea: "" }, provider)).rejects.toThrow("non-empty");
  });

  it("returns structured market sizing data", async () => {
    const provider = new StaticProvider();
    const result = await runMarketSizingEngine(
      { idea: "Focus room app for remote workers", market: "Productivity SaaS" },
      provider,
      { enableSearch: false },
    );

    expect(result.tam).toContain("$15B");
    expect(result.sam).toContain("$2.5B");
    expect(result.som).toContain("$25M");
    expect(result.cagr).toBe("12.5%");
    expect(Array.isArray(result.assumptions)).toBe(true);
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.confidence).toBe("medium");
  });
});
