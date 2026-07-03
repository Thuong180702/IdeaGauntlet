import { describe, it, expect } from "vitest";
import { runCourtEngine } from "../../src/engines/courtEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("runCourtEngine", () => {
  it("returns transcript with all court roles", async () => {
    const provider = new StaticProvider();
    const report = await runCourtEngine({ idea: "Test idea" }, provider);
    expect(report.court).toBeDefined();
    expect(report.court!.transcript.length).toBeGreaterThanOrEqual(5);
    expect(report.court!.transcript[0]).toHaveProperty("role");
    expect(report.court!.transcript[0]).toHaveProperty("argument");
  });

  it("returns a verdict string", async () => {
    const provider = new StaticProvider();
    const report = await runCourtEngine({ idea: "Test idea" }, provider);
    expect(report.verdict).toBeTruthy();
    expect(typeof report.verdict).toBe("string");
  });
});
