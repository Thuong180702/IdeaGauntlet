import { describe, it, expect } from "vitest";
import { generateClaudeMd } from "../../src/integrations/claude/generateClaudeMd.js";
import { generateClaudeSkills } from "../../src/integrations/claude/generateSkills.js";
import { generateClaudeAgents } from "../../src/integrations/claude/generateAgents.js";
import { generateClaudeCommands } from "../../src/integrations/claude/generateCommands.js";

describe("Claude integration files", () => {
  describe("generateClaudeMd", () => {
    const files = generateClaudeMd();

    it("includes the agent-native no-CLI-first rule", () => {
      const content = files[0].content;
      expect(content).toContain("Do not run the `idea-gauntlet` CLI first");
      expect(content).toContain("execute the workflow natively");
    });

    it("does NOT contain CLI-first examples", () => {
      const content = files[0].content;
      // It may mention CLI as optional/advanced, but not as the default path
      expect(content).not.toMatch(/Run `idea-gauntlet court/);
    });

    it("includes no-tool-required clarification", () => {
      const content = files[0].content;
      expect(content).toContain("does not require a runtime tool named");
    });

    it("includes court research layer wording", () => {
      const content = files[0].content;
      expect(content).toContain("evidence scan");
      expect(content).toContain("research brief");
    });
  });

  describe("generateClaudeSkills", () => {
    const files = generateClaudeSkills();

    it("all skills include the agent-native preamble", () => {
      for (const file of files) {
        expect(file.content).toContain("Do not run the `idea-gauntlet` CLI first");
      }
    });

    it("court skill includes all 7 roles", () => {
      const courtSkill = files.find((f) => f.path.includes("gauntlet-court"));
      expect(courtSkill).toBeDefined();
      expect(courtSkill!.content).toContain("Market Skeptic");
      expect(courtSkill!.content).toContain("Distribution Skeptic");
      expect(courtSkill!.content).toContain("Product Skeptic");
      expect(courtSkill!.content).toContain("Technical Skeptic");
      expect(courtSkill!.content).toContain("Business Defender");
      expect(courtSkill!.content).toContain("User Advocate");
      expect(courtSkill!.content).toContain("Judge");
    });

    it("quick skill includes required headings", () => {
      const quickSkill = files.find((f) => f.path.includes("gauntlet-quick"));
      expect(quickSkill).toBeDefined();
      expect(quickSkill!.content).toContain("One-Line Verdict");
      expect(quickSkill!.content).toContain("Top 5 Risks");
    });
  });

  describe("generateClaudeAgents", () => {
    const files = generateClaudeAgents();

    it("generates agents for all court roles", () => {
      const agentPaths = files.map((f) => f.path);
      expect(agentPaths).toContain(".claude/agents/market-skeptic.md");
      expect(agentPaths).toContain(".claude/agents/judge.md");
    });

    it("each agent includes the agent-native preamble", () => {
      for (const file of files) {
        expect(file.content).toContain("Do not run the `idea-gauntlet` CLI first");
      }
    });

    it("no agent tells the model to run CLI", () => {
      for (const file of files) {
        expect(file.content).not.toMatch(/run `idea-gauntlet/);
      }
    });
  });

  describe("generateClaudeCommands", () => {
    const files = generateClaudeCommands();

    it("all commands include the agent-native preamble", () => {
      for (const file of files) {
        expect(file.content).toContain("Do not run the `idea-gauntlet` CLI first");
      }
    });

    it("includes compare command", () => {
      const compareCmd = files.find((f) => f.path.includes("gauntlet-compare"));
      expect(compareCmd).toBeDefined();
    });

    it("court command includes research layer note", () => {
      const courtCmd = files.find((f) => f.path.includes("gauntlet-court"));
      expect(courtCmd).toBeDefined();
      expect(courtCmd!.content).toContain("evidence scan");
    });
  });
});
