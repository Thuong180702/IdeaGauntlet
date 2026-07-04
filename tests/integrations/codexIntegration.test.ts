import { describe, it, expect } from "vitest";
import { generateCodexConfig } from "../../src/integrations/codex/generateAgentsMd.js";

describe("Codex integration", () => {
  const files = generateCodexConfig();

  it("includes the agent-native no-CLI-first rule", () => {
    const agentsMd = files.find((f) => f.path === "AGENTS.md");
    expect(agentsMd).toBeDefined();
    expect(agentsMd!.content).toContain("Do not run the `idea-gauntlet` CLI first");
    expect(agentsMd!.content).toContain("execute the workflow natively");
  });

  it("includes all 7 court roles", () => {
    const agentsMd = files.find((f) => f.path === "AGENTS.md");
    expect(agentsMd!.content).toContain("Market Skeptic");
    expect(agentsMd!.content).toContain("Distribution Skeptic");
    expect(agentsMd!.content).toContain("Product Skeptic");
    expect(agentsMd!.content).toContain("Technical Skeptic");
    expect(agentsMd!.content).toContain("Business Defender");
    expect(agentsMd!.content).toContain("User Advocate");
    expect(agentsMd!.content).toContain("Judge");
  });

  it("handles the reported Codex failure case", () => {
    const agentsMd = files.find((f) => f.path === "AGENTS.md");
    // The user typed "idea-gauntlet court '...'" in Codex chat
    // The generated instructions should tell the model to treat it as analysis intent
    expect(agentsMd!.content).toContain("treat it as a request");
    expect(agentsMd!.content).not.toMatch(/Run `idea-gauntlet court/);
  });

  it("does NOT contain CLI-first instructions", () => {
    for (const file of files) {
      expect(file.content).not.toMatch(/run the CLI first/i);
      expect(file.content).not.toMatch(/shell command idea-gauntlet/i);
    }
  });

  it("includes all 5 workflow descriptions", () => {
    const agentsMd = files.find((f) => f.path === "AGENTS.md");
    expect(agentsMd!.content).toContain("Quick Critique");
    expect(agentsMd!.content).toContain("Court Mode");
    expect(agentsMd!.content).toContain("Synthetic Users");
    expect(agentsMd!.content).toContain("MVP Planning");
    expect(agentsMd!.content).toContain("Idea Comparison");
  });

  it("includes no-tool-required clarification", () => {
    const agentsMd = files.find((f) => f.path === "AGENTS.md");
    expect(agentsMd!.content).toContain("does not require a runtime tool named");
  });

  it("includes research role names", () => {
    const agentsMd = files.find((f) => f.path === "AGENTS.md");
    expect(agentsMd!.content).toContain("Market Researcher");
    expect(agentsMd!.content).toContain("Competitor Researcher");
    expect(agentsMd!.content).toContain("Distribution Researcher");
    expect(agentsMd!.content).toContain("User Behavior Researcher");
    expect(agentsMd!.content).toContain("Privacy / Trust Researcher");
  });

  it("includes research layer wording", () => {
    const agentsMd = files.find((f) => f.path === "AGENTS.md");
    expect(agentsMd!.content).toContain("If web/search tools are available");
    expect(agentsMd!.content).toContain("evidence scan");
    expect(agentsMd!.content).toContain("no live research was performed");
  });

  it("does NOT contain misleading tool-not-installed wording", () => {
    const agentsMd = files.find((f) => f.path === "AGENTS.md");
    expect(agentsMd!.content).not.toMatch(/tool is not installed/i);
    expect(agentsMd!.content).not.toMatch(/Không thấy tool IdeaGauntlet/i);
  });
});
