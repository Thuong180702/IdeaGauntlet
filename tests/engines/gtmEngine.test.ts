import { AnalysisFailedError } from "../../src/core/analysisError.js";
import { describe, it, expect } from "vitest";
import { runGTMEngine, formatGTMReport } from "../../src/engines/gtmEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

const IDEA = { idea: "A focus-room app for remote workers that pairs people into silent 50-minute work sessions." };

describe("gtmEngine", () => {
  it("throws error for empty idea", async () => {
    await expect(runGTMEngine({ idea: "" }, new StaticProvider())).rejects.toThrow("non-empty product idea is required");
  });

  it("returns structured GTM strategy", async () => {
    const result = await runGTMEngine(IDEA, new StaticProvider(), { enableSearch: false });

    expect(result).toHaveProperty("targetSegment");
    expect(result).toHaveProperty("positioningStatement");
    expect(result).toHaveProperty("channels");
    expect(result).toHaveProperty("first100CustomersStrategy");
    expect(result).toHaveProperty("launchPlaybook");
    expect(result).toHaveProperty("budgetAllocation");
    expect(result).toHaveProperty("keyMetrics");
    expect(result).toHaveProperty("biggestGTMRisk");
    expect(result).toHaveProperty("confidence");

    expect(Array.isArray(result.channels)).toBe(true);
    expect(result.channels.length).toBeGreaterThan(0);
    expect(Array.isArray(result.launchPlaybook)).toBe(true);
    expect(result.launchPlaybook.length).toBeGreaterThan(0);
  });

  it("formats GTM report as markdown", async () => {
    const result = await runGTMEngine(IDEA, new StaticProvider(), { enableSearch: false });
    const formatted = formatGTMReport(result);

    expect(formatted).toContain("# GTM Strategy Report");
    expect(formatted).toContain("Target Segment");
    expect(formatted).toContain("Channel Priority Matrix");
    expect(formatted).toContain("First 100 Customers Strategy");
    expect(formatted).toContain("Launch Playbook");
    expect(formatted).toContain("Biggest GTM Risk");
  });

  it("fails loudly on provider failure instead of returning placeholder analysis", async () => {
    class FailingProvider implements import("../../src/core/types.js").LLMProvider {
      kind = "custom" as const;
      async complete(): Promise<string> { throw new Error("Simulated LLM failure"); }
    }

    // A placeholder result would read as a real finding — the engine must refuse instead.
    await expect(runGTMEngine(IDEA, new FailingProvider(), { enableSearch: false })).rejects.toThrow(AnalysisFailedError);
    await expect(runGTMEngine(IDEA, new FailingProvider(), { enableSearch: false })).rejects.toThrow(/Simulated LLM failure[\s\S]*Nothing was generated/);
  });
});
