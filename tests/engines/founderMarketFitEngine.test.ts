import { describe, it, expect } from "vitest";
import { runFounderMarketFitEngine, formatFounderMarketFitReport } from "../../src/engines/founderMarketFitEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

const IDEA = { idea: "A focus-room app for remote workers that pairs people into silent 50-minute work sessions." };
const BACKGROUND = "8 years as fullstack developer, 3 years remote team lead, built WebRTC apps previously";

describe("founderMarketFitEngine", () => {
  it("throws error for empty idea", async () => {
    await expect(runFounderMarketFitEngine({ idea: "" }, new StaticProvider(), BACKGROUND)).rejects.toThrow("non-empty product idea is required");
  });

  it("throws error for empty founder background", async () => {
    await expect(runFounderMarketFitEngine(IDEA, new StaticProvider(), "")).rejects.toThrow("Founder background is required");
  });

  it("returns structured founder-market fit assessment", async () => {
    const result = await runFounderMarketFitEngine(IDEA, new StaticProvider(), BACKGROUND);

    expect(result).toHaveProperty("backgroundSummary");
    expect(result).toHaveProperty("domainExpertiseScore");
    expect(result).toHaveProperty("networkAdvantageScore");
    expect(result).toHaveProperty("executionRiskScore");
    expect(result).toHaveProperty("expertiseGaps");
    expect(result).toHaveProperty("unfairAdvantages");
    expect(result).toHaveProperty("recommendedCoFounderProfile");
    expect(result).toHaveProperty("firstHireRecommendations");
    expect(result).toHaveProperty("fitVerdict");
    expect(result).toHaveProperty("fitSummary");

    expect(typeof result.domainExpertiseScore).toBe("number");
    expect(typeof result.networkAdvantageScore).toBe("number");
    expect(typeof result.executionRiskScore).toBe("number");
    expect(Array.isArray(result.expertiseGaps)).toBe(true);
    expect(Array.isArray(result.unfairAdvantages)).toBe(true);
  });

  it("formats founder-market fit report as markdown", async () => {
    const result = await runFounderMarketFitEngine(IDEA, new StaticProvider(), BACKGROUND);
    const formatted = formatFounderMarketFitReport(result);

    expect(formatted).toContain("# Founder-Market Fit Report");
    expect(formatted).toContain("Verdict:");
    expect(formatted).toContain("Fit Scorecard");
    expect(formatted).toContain("Domain Expertise");
    expect(formatted).toContain("Unfair Advantages");
    expect(formatted).toContain("Expertise Gaps");
    expect(formatted).toContain("Recommended Co-Founder Profile");
  });

  it("handles provider failure gracefully with fallback", async () => {
    class FailingProvider implements import("../../src/core/types.js").LLMProvider {
      kind = "custom" as const;
      async complete(): Promise<string> { throw new Error("Simulated LLM failure"); }
    }

    const result = await runFounderMarketFitEngine(IDEA, new FailingProvider(), BACKGROUND);

    expect(result).toBeDefined();
    expect(result.domainExpertiseScore).toBe(5);
    expect(result.fitVerdict).toBe("moderate_fit");
  });
});
