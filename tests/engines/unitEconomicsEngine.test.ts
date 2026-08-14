import { describe, it, expect } from "vitest";
import { runUnitEconomicsEngine } from "../../src/engines/unitEconomicsEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("unitEconomicsEngine", () => {
  it("throws on empty idea", async () => {
    const provider = new StaticProvider();
    await expect(runUnitEconomicsEngine({ idea: "" }, provider)).rejects.toThrow("non-empty");
  });

  it("returns structured unit economics metrics", async () => {
    const provider = new StaticProvider();
    const result = await runUnitEconomicsEngine(
      { idea: "Focus room app for remote workers", market: "Productivity SaaS" },
      provider,
      { enableSearch: false },
    );

    expect(result.cacEstimate).toContain("$150");
    expect(result.ltvEstimate).toContain("$900");
    expect(result.ltvToCacRatio).toBe("4.5x");
    expect(result.paybackPeriodMonths).toBe("5 months");
    expect(result.grossMarginEstimate).toBe("82%");
    expect(result.sustainabilityVerdict).toBe("healthy");
    expect(Array.isArray(result.keyRisks)).toBe(true);
  });
});
