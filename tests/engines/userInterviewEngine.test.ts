import { describe, it, expect } from "vitest";
import { runUserInterviewEngine, formatUserInterviewReport } from "../../src/engines/userInterviewEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

const IDEA = { idea: "A focus-room app for remote workers that pairs people into silent 50-minute work sessions." };

describe("userInterviewEngine", () => {
  it("throws error for empty idea", async () => {
    await expect(runUserInterviewEngine({ idea: "" }, new StaticProvider())).rejects.toThrow("non-empty product idea is required");
  });

  it("returns structured user interview session", async () => {
    const result = await runUserInterviewEngine(IDEA, new StaticProvider(), {
      personaArchetype: "Distracted Remote Engineer",
    });

    expect(result).toHaveProperty("persona");
    expect(result).toHaveProperty("dialogue");
    expect(result).toHaveProperty("keyInsights");
    expect(result).toHaveProperty("uncoveredNeeds");
    expect(result).toHaveProperty("objectionAnalysis");
    expect(result).toHaveProperty("wouldBuyVerdict");
    expect(result).toHaveProperty("maxWillingnessToPay");
    expect(result).toHaveProperty("goldenQuote");

    expect(result.persona).toHaveProperty("name");
    expect(result.persona).toHaveProperty("role");
    expect(Array.isArray(result.dialogue)).toBe(true);
    expect(result.dialogue.length).toBeGreaterThan(0);
    expect(Array.isArray(result.keyInsights)).toBe(true);
  });

  it("formats user interview report as markdown", async () => {
    const result = await runUserInterviewEngine(IDEA, new StaticProvider());
    const formatted = formatUserInterviewReport(result);

    expect(formatted).toContain("Customer Discovery Interview Session");
    expect(formatted).toContain("Interview Transcript");
    expect(formatted).toContain("Golden Quote");
    expect(formatted).toContain("Willingness to Buy");
    expect(formatted).toContain("Key Behavioral Insights");
  });

  it("handles provider failure gracefully with fallback dialogue", async () => {
    class FailingProvider implements import("../../src/core/types.js").LLMProvider {
      kind = "custom" as const;
      async complete(): Promise<string> { throw new Error("Simulated LLM failure"); }
    }

    const result = await runUserInterviewEngine(IDEA, new FailingProvider());

    expect(result).toBeDefined();
    expect(result.dialogue.length).toBeGreaterThan(0);
    expect(result.keyInsights.length).toBeGreaterThan(0);
  });
});
