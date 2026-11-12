import { AnalysisFailedError } from "../../src/core/analysisError.js";
import { describe, it, expect } from "vitest";
import { runComplianceScanner, formatComplianceReport } from "../../src/engines/complianceScanner.js";
import { StaticProvider } from "../helpers/staticProvider.js";

const IDEA = { idea: "A focus-room app for remote workers that pairs people into silent 50-minute work sessions." };

describe("complianceScanner", () => {
  it("throws error for empty idea", async () => {
    await expect(runComplianceScanner({ idea: "" }, new StaticProvider())).rejects.toThrow("non-empty product idea is required");
  });

  it("scans regulatory and compliance requirements", async () => {
    const result = await runComplianceScanner(IDEA, new StaticProvider(), {
      regions: ["us", "eu"],
      enableSearch: false,
    });

    expect(result).toHaveProperty("overallRiskLevel");
    expect(result).toHaveProperty("applicableFrameworks");
    expect(result).toHaveProperty("requirements");
    expect(result).toHaveProperty("dataPrivacyChecklist");
    expect(result).toHaveProperty("estimatedComplianceTimeline");
    expect(result).toHaveProperty("summary");

    expect(Array.isArray(result.applicableFrameworks)).toBe(true);
    expect(result.applicableFrameworks.length).toBeGreaterThan(0);
    expect(Array.isArray(result.requirements)).toBe(true);
    expect(result.requirements.length).toBeGreaterThan(0);

    const firstReq = result.requirements[0];
    expect(firstReq).toHaveProperty("regulation");
    expect(firstReq).toHaveProperty("severity");
    expect(firstReq).toHaveProperty("requirements");
    expect(firstReq).toHaveProperty("recommendedAction");
  });

  it("formats compliance report as markdown", async () => {
    const result = await runComplianceScanner(IDEA, new StaticProvider(), { enableSearch: false });
    const formatted = formatComplianceReport(result);

    expect(formatted).toContain("Regulatory & Compliance Risk Report");
    expect(formatted).toContain("Overall Compliance Risk");
    expect(formatted).toContain("Regulatory Framework Audit");
    expect(formatted).toContain("Pre-Launch Data Privacy Checklist");
  });

  it("fails loudly on provider failure instead of returning placeholder analysis", async () => {
    class FailingProvider implements import("../../src/core/types.js").LLMProvider {
      kind = "custom" as const;
      async complete(): Promise<string> { throw new Error("Simulated LLM failure"); }
    }

    // A placeholder result would read as a real finding — the engine must refuse instead.
    await expect(runComplianceScanner(IDEA, new FailingProvider(), { enableSearch: false })).rejects.toThrow(AnalysisFailedError);
    await expect(runComplianceScanner(IDEA, new FailingProvider(), { enableSearch: false })).rejects.toThrow(/Simulated LLM failure[\s\S]*Nothing was generated/);
  });
});
