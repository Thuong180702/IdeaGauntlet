import { AnalysisFailedError } from "../../src/core/analysisError.js";
import { describe, it, expect } from "vitest";
import { runCompetitiveIntelligenceEngine, formatCompetitiveIntelligenceReport } from "../../src/engines/competitiveIntelligenceEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

const IDEA = { idea: "A focus-room app for remote workers that pairs people into silent 50-minute work sessions." };

describe("competitiveIntelligenceEngine", () => {
  it("throws error for empty idea", async () => {
    await expect(runCompetitiveIntelligenceEngine({ idea: "" }, new StaticProvider())).rejects.toThrow("non-empty product idea is required");
  });

  it("returns structured competitive intelligence data", async () => {
    const result = await runCompetitiveIntelligenceEngine(IDEA, new StaticProvider(), { enableSearch: false });

    expect(result).toHaveProperty("competitors");
    expect(result).toHaveProperty("positioningMap");
    expect(result).toHaveProperty("strategicWindows");
    expect(result).toHaveProperty("attackVectors");
    expect(result).toHaveProperty("defensiveStrategies");
    expect(result).toHaveProperty("marketTiming");
    expect(result).toHaveProperty("summary");

    expect(Array.isArray(result.competitors)).toBe(true);
    expect(result.competitors.length).toBeGreaterThan(0);
    expect(result.positioningMap).toHaveProperty("positions");
    expect(Array.isArray(result.positioningMap.positions)).toBe(true);
  });

  it("formats competitive intelligence report as markdown", async () => {
    const result = await runCompetitiveIntelligenceEngine(IDEA, new StaticProvider(), { enableSearch: false });
    const formatted = formatCompetitiveIntelligenceReport(result);

    expect(formatted).toContain("# Competitive Intelligence Report");
    expect(formatted).toContain("Competitor Profiles");
    expect(formatted).toContain("Positioning Map");
    expect(formatted).toContain("Strategic Windows");
    expect(formatted).toContain("Attack Vectors");
    expect(formatted).toContain("Defensive Strategies");
  });

  it("fails loudly on provider failure instead of returning placeholder analysis", async () => {
    class FailingProvider implements import("../../src/core/types.js").LLMProvider {
      kind = "custom" as const;
      async complete(): Promise<string> { throw new Error("Simulated LLM failure"); }
    }

    // A placeholder result would read as a real finding — the engine must refuse instead.
    await expect(runCompetitiveIntelligenceEngine(IDEA, new FailingProvider(), { enableSearch: false })).rejects.toThrow(AnalysisFailedError);
    await expect(runCompetitiveIntelligenceEngine(IDEA, new FailingProvider(), { enableSearch: false })).rejects.toThrow(/Simulated LLM failure[\s\S]*Nothing was generated/);
  });
});
