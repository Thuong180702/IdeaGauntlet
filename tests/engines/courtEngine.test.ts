import { describe, it, expect } from "vitest";
import { runCourtEngine } from "../../src/engines/courtEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("runCourtEngine", () => {
  it("returns enhanced court debate with all 7 roles in roleArguments", async () => {
    const provider = new StaticProvider();
    const report = await runCourtEngine({ idea: "Test idea" }, provider, { enableSearch: false });
    expect(report.courtDebate).toBeDefined();
    // Multi-turn: roleArguments includes openings (6) + rebuttals (5) from verdict phase
    // But verdict phase returns its own roleArguments array with 7 entries
    expect(report.courtDebate!.roleArguments.length).toBeGreaterThanOrEqual(7);
    const roleNames = report.courtDebate!.roleArguments.map((r: any) => r.roleName);
    expect(roleNames).toContain("Market Skeptic");
    expect(roleNames).toContain("Distribution Skeptic");
    expect(roleNames).toContain("Product Skeptic");
    expect(roleNames).toContain("Technical Skeptic");
    expect(roleNames).toContain("Business Defender");
    expect(roleNames).toContain("User Advocate");
    expect(roleNames).toContain("Judge");
  });

  it("returns idea snapshot in enhanced debate", async () => {
    const provider = new StaticProvider();
    const report = await runCourtEngine({ idea: "Test idea" }, provider, { enableSearch: false });
    expect(report.courtDebate!.ideaSnapshot).toBeDefined();
    expect(typeof report.courtDebate!.ideaSnapshot.idea).toBe("string");
  });

  it("returns scoresDetailed array", async () => {
    const provider = new StaticProvider();
    const report = await runCourtEngine({ idea: "Test idea" }, provider, { enableSearch: false });
    expect(Array.isArray(report.courtDebate!.scoresDetailed)).toBe(true);
    expect(report.courtDebate!.scoresDetailed.length).toBe(10);
  });

  it("returns backward-compatible transcript", async () => {
    const provider = new StaticProvider();
    const report = await runCourtEngine({ idea: "Test idea" }, provider, { enableSearch: false });
    expect(report.court).toBeDefined();
    expect(report.court!.transcript.length).toBeGreaterThanOrEqual(5);
    expect(report.court!.transcript[0]).toHaveProperty("role");
    expect(report.court!.transcript[0]).toHaveProperty("argument");
  });
});
