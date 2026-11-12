import { AnalysisFailedError } from "../../src/core/analysisError.js";
import { describe, it, expect } from "vitest";
import { runEvolutionCoach, formatIdeaEvolutionReport } from "../../src/engines/evolutionCoach.js";
import { StaticProvider } from "../helpers/staticProvider.js";

const IDEA = { idea: "A focus-room app for remote workers that pairs people into silent 50-minute work sessions." };

describe("evolutionCoach", () => {
  it("throws error for empty idea", async () => {
    await expect(runEvolutionCoach({ idea: "" }, new StaticProvider())).rejects.toThrow("non-empty product idea is required");
  });

  it("diagnoses bottlenecks and generates 3 structured variants", async () => {
    const result = await runEvolutionCoach(IDEA, new StaticProvider(), {
      focusDimension: "monetization",
      enableSearch: false,
    });

    expect(result).toHaveProperty("originalIdea");
    expect(result).toHaveProperty("primaryBottleneck");
    expect(result).toHaveProperty("oneBigChangeRecommendation");
    expect(result).toHaveProperty("variants");
    expect(result).toHaveProperty("suggestedExperiment");

    expect(Array.isArray(result.variants)).toBe(true);
    expect(result.variants.length).toBe(3);

    for (const v of result.variants) {
      expect(v).toHaveProperty("variantName");
      expect(v).toHaveProperty("angle");
      expect(v).toHaveProperty("oneSentencePitch");
      expect(v).toHaveProperty("coreChange");
      expect(v).toHaveProperty("whyThisWorksBetter");
      expect(v).toHaveProperty("estimatedScoreDeltas");
      expect(v).toHaveProperty("newTargetCustomer");
      expect(Array.isArray(v.risks)).toBe(true);
    }
  });

  it("formats idea evolution report as markdown", async () => {
    const result = await runEvolutionCoach(IDEA, new StaticProvider(), { enableSearch: false });
    const formatted = formatIdeaEvolutionReport(result);

    expect(formatted).toContain("Idea Evolution & Pivot Strategy Report");
    expect(formatted).toContain("Primary Bottleneck");
    expect(formatted).toContain("The #1 Change to Make");
    expect(formatted).toContain("Evolved Idea Variants");
    expect(formatted).toContain("48-Hour Validation Experiment");
  });

  it("fails loudly on provider failure instead of returning placeholder analysis", async () => {
    class FailingProvider implements import("../../src/core/types.js").LLMProvider {
      kind = "custom" as const;
      async complete(): Promise<string> { throw new Error("Simulated LLM failure"); }
    }

    // A placeholder result would read as a real finding — the engine must refuse instead.
    await expect(runEvolutionCoach(IDEA, new FailingProvider(), { enableSearch: false })).rejects.toThrow(AnalysisFailedError);
    await expect(runEvolutionCoach(IDEA, new FailingProvider(), { enableSearch: false })).rejects.toThrow(/Simulated LLM failure[\s\S]*Nothing was generated/);
  });
});
