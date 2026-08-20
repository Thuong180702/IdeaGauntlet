import { describe, it, expect } from "vitest";
import { runRevenueModelEngine, formatRevenueModelReport } from "../../src/engines/revenueModelEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

const IDEA = { idea: "A focus-room app for remote workers that pairs people into silent 50-minute work sessions." };

describe("revenueModelEngine", () => {
  it("throws error for empty idea", async () => {
    await expect(runRevenueModelEngine({ idea: "" }, new StaticProvider())).rejects.toThrow("non-empty product idea is required");
  });

  it("returns structured revenue model analysis", async () => {
    const result = await runRevenueModelEngine(IDEA, new StaticProvider(), { enableSearch: false });

    expect(result).toHaveProperty("recommendedModel");
    expect(result).toHaveProperty("options");
    expect(result).toHaveProperty("monetizationTimeline");
    expect(result).toHaveProperty("pricingTiers");
    expect(result).toHaveProperty("keyRevenueRisks");
    expect(result).toHaveProperty("confidence");

    expect(Array.isArray(result.options)).toBe(true);
    expect(result.options.length).toBeGreaterThan(0);
    expect(Array.isArray(result.pricingTiers)).toBe(true);
    expect(result.pricingTiers.length).toBeGreaterThan(0);
  });

  it("formats revenue model report as markdown", async () => {
    const result = await runRevenueModelEngine(IDEA, new StaticProvider(), { enableSearch: false });
    const formatted = formatRevenueModelReport(result);

    expect(formatted).toContain("# Revenue Model Explorer");
    expect(formatted).toContain("Recommended Model");
    expect(formatted).toContain("Revenue Model Rankings");
    expect(formatted).toContain("Pricing Tiers");
    expect(formatted).toContain("Key Revenue Risks");
  });

  it("handles provider failure gracefully with fallback", async () => {
    class FailingProvider implements import("../../src/core/types.js").LLMProvider {
      kind = "custom" as const;
      async complete(): Promise<string> { throw new Error("Simulated LLM failure"); }
    }

    const result = await runRevenueModelEngine(IDEA, new FailingProvider(), { enableSearch: false });

    expect(result).toBeDefined();
    expect(result.recommendedModel).toBe("subscription_saas");
    expect(result.pricingTiers.length).toBeGreaterThan(0);
    expect(result.confidence).toBe("low");
  });
});
