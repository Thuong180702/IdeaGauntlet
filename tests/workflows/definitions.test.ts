import { describe, it, expect } from "vitest";
import { workflowRegistry, getWorkflow } from "../../src/workflows/definitions.js";
import type { WorkflowMode, WorkflowDefinition, WorkflowRole } from "../../src/workflows/types.js";

const ALL_MODES: WorkflowMode[] = ["quick", "court", "users", "mvp", "compare"];

describe("workflow definitions", () => {
  it("registers all 5 workflow modes", () => {
    expect(Object.keys(workflowRegistry).sort()).toEqual(ALL_MODES.sort());
  });

  it("each workflow has required fields", () => {
    for (const mode of ALL_MODES) {
      const def = getWorkflow(mode);
      expect(def.id).toBe(mode);
      expect(typeof def.name).toBe("string");
      expect(def.name.length).toBeGreaterThan(0);
      expect(typeof def.purpose).toBe("string");
      expect(def.purpose.length).toBeGreaterThan(0);
      expect(Array.isArray(def.roles)).toBe(true);
      expect(Array.isArray(def.sections)).toBe(true);
      expect(Array.isArray(def.requiredHeadings)).toBe(true);
      expect(Array.isArray(def.outputRules)).toBe(true);
    }
  });

  it("court workflow has exactly 8 roles with correct IDs", () => {
    const court = getWorkflow("court");
    const roleIds = court.roles.map((r: WorkflowRole) => r.id);
    expect(roleIds).toContain("market-skeptic");
    expect(roleIds).toContain("distribution-skeptic");
    expect(roleIds).toContain("product-skeptic");
    expect(roleIds).toContain("technical-skeptic");
    expect(roleIds).toContain("business-defender");
    expect(roleIds).toContain("user-advocate");
    expect(roleIds).toContain("competitor-analyst");
    expect(roleIds).toContain("judge");
    expect(court.roles.length).toBe(8);
  });

  it("court workflow has 12 phases", () => {
    const court = getWorkflow("court");
    expect(court.phases).toBeDefined();
    expect(court.phases!.length).toBe(12);
  });

  it("court workflow has all required headings", () => {
    const court = getWorkflow("court");
    const requiredCourtHeadings = [
      "Idea Snapshot",
      "Assumptions Map",
      "Market Skeptic Case",
      "Distribution Skeptic Case",
      "Product Skeptic Case",
      "Technical Skeptic Case",
      "Business Defender Case",
      "User Advocate Case",
      "Cross-Examination",
      "Evidence Audit",
      "Kill Tests",
      "Scores",
      "Verdict",
      "Next Actions",
    ];
    for (const h of requiredCourtHeadings) {
      expect(court.requiredHeadings).toContain(h);
    }
  });

  it("court has 10 scoring dimensions", () => {
    const court = getWorkflow("court");
    expect(court.scoringDimensions.length).toBe(10);
  });

  it("court workflow has 5 research roles", () => {
    const court = getWorkflow("court");
    expect(court.researchRoles).toBeDefined();
    expect(court.researchRoles!.length).toBe(5);
    const researchIds = court.researchRoles!.map((r) => r.id);
    expect(researchIds).toContain("market-researcher");
    expect(researchIds).toContain("competitor-researcher");
    expect(researchIds).toContain("distribution-researcher");
    expect(researchIds).toContain("user-behavior-researcher");
    expect(researchIds).toContain("privacy-researcher");
  });

  it("court workflow has 7 research phases", () => {
    const court = getWorkflow("court");
    expect(court.researchPhases).toBeDefined();
    expect(court.researchPhases!.length).toBe(7);
    const phaseNames = court.researchPhases!.map((p) => p.name);
    expect(phaseNames).toContain("Research Plan");
    expect(phaseNames).toContain("Market Evidence Scan");
    expect(phaseNames).toContain("Competitor Evidence Scan");
    expect(phaseNames).toContain("Distribution Evidence Scan");
    expect(phaseNames).toContain("User Behavior Evidence Scan");
    expect(phaseNames).toContain("Privacy / Trust Evidence Scan");
    expect(phaseNames).toContain("Research Brief");
  });

  it("court required headings include research sections", () => {
    const court = getWorkflow("court");
    expect(court.requiredHeadings).toContain("Research Brief");
    expect(court.requiredHeadings).toContain("Market Evidence");
    expect(court.requiredHeadings).toContain("Competitor Landscape");
    expect(court.requiredHeadings).toContain("Distribution Evidence");
    expect(court.requiredHeadings).toContain("User Behavior Evidence");
    expect(court.requiredHeadings).toContain("Privacy / Trust Evidence");
    expect(court.requiredHeadings).toContain("Source Notes");
    expect(court.requiredHeadings).toContain("Evidence Gaps");
  });

  // Verify that roles.length is still 8 and phases.length is still 12
  it("court workflow still has exactly 8 debate roles", () => {
    const court = getWorkflow("court");
    expect(court.roles.length).toBe(8);
  });

  it("court workflow still has exactly 12 debate phases", () => {
    const court = getWorkflow("court");
    expect(court.phases).toBeDefined();
    expect(court.phases!.length).toBe(12);
  });

  it("quick workflow has required headings", () => {
    const quick = getWorkflow("quick");
    expect(quick.requiredHeadings).toContain("One-Line Verdict");
    expect(quick.requiredHeadings).toContain("Top 5 Risks");
    expect(quick.requiredHeadings).toContain("Top 5 Assumptions");
    expect(quick.requiredHeadings).toContain("Best-Case Version");
    expect(quick.requiredHeadings).toContain("Worst-Case Failure Path");
    expect(quick.requiredHeadings).toContain("Fastest Validation Test");
    expect(quick.requiredHeadings).toContain("Scores");
    expect(quick.requiredHeadings).toContain("Next Step");
  });

  it("users workflow includes synthesis section", () => {
    const users = getWorkflow("users");
    const sectionHeadings = users.sections.map((s) => s.heading);
    expect(sectionHeadings).toContain("Synthesis");
    expect(sectionHeadings).toContain("Synthetic Personas");
  });

  it("mvp workflow includes kill criteria and pivot options", () => {
    const mvp = getWorkflow("mvp");
    expect(mvp.requiredHeadings).toContain("Kill Criteria");
    expect(mvp.requiredHeadings).toContain("Pivot Options");
    expect(mvp.requiredHeadings).toContain("Concierge Test");
    expect(mvp.requiredHeadings).toContain("Interview Script");
  });

  it("compare workflow has 12 scoring dimensions", () => {
    const compare = getWorkflow("compare");
    expect(compare.scoringDimensions.length).toBe(12);
    expect(compare.requiredHeadings).toContain("Comparison Matrix");
    expect(compare.requiredHeadings).toContain("Per-Idea Strengths");
    expect(compare.requiredHeadings).toContain("Kill Tests Per Idea");
    expect(compare.requiredHeadings).toContain("Recommendation");
  });

  it("each role has required fields", () => {
    for (const mode of ALL_MODES) {
      const def = getWorkflow(mode);
      for (const role of def.roles) {
        expect(typeof role.id).toBe("string");
        expect(role.id.length).toBeGreaterThan(0);
        expect(typeof role.name).toBe("string");
        expect(typeof role.mandate).toBe("string");
        expect(Array.isArray(role.mustAddress)).toBe(true);
        expect(["skeptic", "defender", "judge", "user", "planner", "analyst"]).toContain(role.stance);
      }
    }
  });

  it("each section has required fields", () => {
    for (const mode of ALL_MODES) {
      const def = getWorkflow(mode);
      for (const section of def.sections) {
        expect(typeof section.heading).toBe("string");
        expect(section.heading.length).toBeGreaterThan(0);
        expect(typeof section.purpose).toBe("string");
        expect(Array.isArray(section.required)).toBe(true);
      }
    }
  });
});
