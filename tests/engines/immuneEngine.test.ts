import { describe, it, expect } from "vitest";
import { runImmuneEngine } from "../../src/engines/immuneEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("runImmuneEngine", () => {
  it("returns a report with verdict and risks from a provider", async () => {
    const provider = new StaticProvider();
    const report = await runImmuneEngine({ idea: "Test idea" }, provider);
    expect(report.verdict).toBeTruthy();
    expect(report.risks).toBeDefined();
    expect(report.risks!.length).toBeGreaterThan(0);
    expect(report.assumptions!.length).toBeGreaterThan(0);
    expect(report.killTests!.length).toBeGreaterThan(0);
  });
});
