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
  // Court reaches scores through debate, but the provenance rule is identical:
  // a judge citation that was never retrieved must not read as evidence.
  describe("score calibration", () => {
    const brief = {
      queries: ["test"],
      results: [{ title: "Focusmate — Virtual Coworking", url: "https://www.focusmate.com/", snippet: "" }],
      summary: "research summary",
      searchedAt: new Date().toISOString(),
    };

    it("maps every judge dimension into the rubric the report renders", async () => {
      const provider = new StaticProvider();
      const report = await runCourtEngine({ idea: "Test idea" }, provider, { enableSearch: false });

      expect(report.scores).toBeDefined();
      expect(report.scoreRubric).toBeDefined();
      expect(Object.keys(report.scoreRubric!).sort()).toEqual([
        "buildability", "clarity", "differentiation",
        "distribution", "evidence", "monetization", "pain",
      ]);
    });

    it("marks every dimension judgment when court ran without research", async () => {
      const provider = new StaticProvider();
      const report = await runCourtEngine({ idea: "Test idea" }, provider, { enableSearch: false });

      expect(report.calibration).toBeDefined();
      expect(report.calibration!.researchUnavailable).toBe(true);
      expect(report.calibration!.sourcedCount).toBe(0);
      expect(report.calibration!.assessedCount).toBe(7);
      expect(report.calibration!.judgmentCount).toBe(7);

      const bases = Object.values(report.scoreRubric!).map((e: any) => e?.basis);
      expect(bases).toHaveLength(7);
      expect(bases.every((b) => b === "judgment")).toBe(true);
    });

    it("carries the judge's reason into the rubric evidence cell", async () => {
      const provider = new StaticProvider();
      const report = await runCourtEngine({ idea: "Test idea" }, provider, { enableSearch: false });

      const detailed = report.courtDebate!.scoresDetailed;
      const withReason = detailed.find((d: any) => typeof d.reason === "string" && d.reason.length > 0);
      expect(withReason).toBeDefined();

      const key = withReason!.dimension.toLowerCase().trim() as keyof NonNullable<typeof report.scoreRubric>;
      expect(report.scoreRubric![key]!.evidence).toBe(withReason!.reason);
    });

    it("still refuses to promote a dimension the judge did not cite", async () => {
      const provider = new StaticProvider();
      // Research IS available here, so `judgment` cannot be blamed on a missing brief.
      const report = await runCourtEngine({ idea: "Test idea" }, provider, {
        enableSearch: true,
        research: brief as any,
      });

      expect(report.calibration!.researchUnavailable).toBe(false);
      expect(report.calibration!.sourcedCount).toBe(0);
      expect(report.calibration!.note).toContain("model judgment");
    });
  });
});
