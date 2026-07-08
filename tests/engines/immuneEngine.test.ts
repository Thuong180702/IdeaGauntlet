import { describe, it, expect } from "vitest";
import { runImmuneEngine } from "../../src/engines/immuneEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("runImmuneEngine", () => {
  it("returns enhanced quick report", async () => {
    const provider = new StaticProvider();
    const report = await runImmuneEngine({ idea: "Test idea" }, provider, { enableSearch: false });
    expect(report.quickReport).toBeDefined();
    expect(typeof report.quickReport!.oneLineVerdict).toBe("string");
    expect(report.quickReport!.oneLineVerdict.length).toBeGreaterThan(0);
  });

  it("returns best-case and worst-case scenarios", async () => {
    const provider = new StaticProvider();
    const report = await runImmuneEngine({ idea: "Test idea" }, provider, { enableSearch: false });
    expect(typeof report.quickReport!.bestCase).toBe("string");
    expect(typeof report.quickReport!.worstCase).toBe("string");
  });

  it("returns risk breakdown", async () => {
    const provider = new StaticProvider();
    const report = await runImmuneEngine({ idea: "Test idea" }, provider, { enableSearch: false });
    expect(typeof report.quickReport!.distributionRisk).toBe("string");
    expect(typeof report.quickReport!.monetizationRisk).toBe("string");
    expect(typeof report.quickReport!.buildabilityRisk).toBe("string");
  });

  it("returns backward-compatible risks and scores", async () => {
    const provider = new StaticProvider();
    const report = await runImmuneEngine({ idea: "Test idea" }, provider, { enableSearch: false });
    expect(Array.isArray(report.risks)).toBe(true);
    expect(report.scores).toBeDefined();
    expect(typeof report.scores!.clarity).toBe("number");
  });
});
