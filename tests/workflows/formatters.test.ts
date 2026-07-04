import { describe, it, expect } from "vitest";
import { formatForCliPrompt } from "../../src/workflows/formatters/formatForCliPrompt.js";
import { formatForAgentInstructions, AGENT_NATIVE_PREAMBLE } from "../../src/workflows/formatters/formatForAgentInstructions.js";
import { formatForMcpDescription, mcpToolDescriptions } from "../../src/workflows/formatters/formatForMcpDescription.js";
import { getWorkflow } from "../../src/workflows/definitions.js";

describe("formatForCliPrompt", () => {
  it("includes role names for court", () => {
    const court = getWorkflow("court");
    const prompt = formatForCliPrompt(court, "court");
    expect(prompt).toContain("Market Skeptic");
    expect(prompt).toContain("Distribution Skeptic");
    expect(prompt).toContain("Product Skeptic");
    expect(prompt).toContain("Technical Skeptic");
    expect(prompt).toContain("Business Defender");
    expect(prompt).toContain("User Advocate");
    expect(prompt).toContain("Judge");
  });

  it("includes scoring dimensions for court", () => {
    const court = getWorkflow("court");
    const prompt = formatForCliPrompt(court, "court");
    expect(prompt).toContain("Clarity");
    expect(prompt).toContain("Pain");
    expect(prompt).toContain("Evidence");
  });

  it("includes output rules", () => {
    const quick = getWorkflow("quick");
    const prompt = formatForCliPrompt(quick, "quick");
    expect(prompt).toContain("Rules");
  });

  it("does NOT include agent-native preamble", () => {
    const quick = getWorkflow("quick");
    const prompt = formatForCliPrompt(quick, "quick");
    expect(prompt).not.toContain("Do not run the `idea-gauntlet` CLI");
  });

  it("CLI court prompt does not claim live web browsing", () => {
    const court = getWorkflow("court");
    const prompt = formatForCliPrompt(court, "court");
    expect(prompt).not.toMatch(/browse the web/i);
    expect(prompt).not.toMatch(/live research/i);
    expect(prompt).not.toMatch(/web search/i);
  });

  it("CLI court prompt includes evidence-awareness line", () => {
    const court = getWorkflow("court");
    const prompt = formatForCliPrompt(court, "court");
    expect(prompt).toContain("separate evidence from assumptions");
    expect(prompt).toContain("Do not invent market facts");
  });
});

describe("formatForAgentInstructions", () => {
  it("includes the agent-native preamble", () => {
    const court = getWorkflow("court");
    const instructions = formatForAgentInstructions(court, "court");
    expect(instructions).toContain("Do not run the `idea-gauntlet` CLI first");
    expect(instructions).toContain("execute the workflow natively");
    expect(instructions).toContain("Direct CLI commands require a provider");
  });

  it("includes court roles", () => {
    const court = getWorkflow("court");
    const instructions = formatForAgentInstructions(court, "court");
    expect(instructions).toContain("Market Skeptic");
    expect(instructions).toContain("Judge");
  });

  it("includes required headings", () => {
    const quick = getWorkflow("quick");
    const instructions = formatForAgentInstructions(quick, "quick");
    expect(instructions).toContain("One-Line Verdict");
    expect(instructions).toContain("Top 5 Risks");
  });

  it("does NOT contain CLI-first patterns", () => {
    const court = getWorkflow("court");
    const instructions = formatForAgentInstructions(court, "court");
    expect(instructions).not.toMatch(/run the CLI first/i);
    expect(instructions).not.toMatch(/shell command idea-gauntlet/i);
  });

  it("court instructions include research layer", () => {
    const court = getWorkflow("court");
    const instructions = formatForAgentInstructions(court, "court");
    expect(instructions).toContain("Market Researcher");
    expect(instructions).toContain("Research Plan");
    expect(instructions).toContain("Evidence research");
    expect(instructions).toContain("Citation discipline");
  });
});

describe("formatForMcpDescription", () => {
  it("returns a compact description for each workflow", () => {
    for (const mode of ["quick", "court", "users", "mvp", "compare"] as const) {
      const def = getWorkflow(mode);
      const desc = formatForMcpDescription(def);
      expect(typeof desc).toBe("string");
      expect(desc.length).toBeGreaterThan(20);
      expect(desc.length).toBeLessThan(500);
    }
  });

  it("mcpToolDescriptions returns all 5 tools", () => {
    const descs = mcpToolDescriptions();
    expect(Object.keys(descs).sort()).toEqual([
      "compare_ideas",
      "generate_users",
      "plan_mvp",
      "quick_critique",
      "run_court",
    ]);
  });

  it("court description includes evidence-aware prefix", () => {
    const court = getWorkflow("court");
    const desc = formatForMcpDescription(court);
    expect(desc).toContain("Evidence-aware");
  });
});

describe("AGENT_NATIVE_PREAMBLE", () => {
  it("contains the no-CLI-first rule", () => {
    expect(AGENT_NATIVE_PREAMBLE).toContain("Do not run the `idea-gauntlet` CLI first");
    expect(AGENT_NATIVE_PREAMBLE).toContain("execute the workflow natively");
    expect(AGENT_NATIVE_PREAMBLE).toContain("treat it as a request");
    expect(AGENT_NATIVE_PREAMBLE).not.toContain("shell command");
  });
});
