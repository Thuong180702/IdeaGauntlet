import { describe, it, expect } from "vitest";
import { generateCursorRules } from "../../src/integrations/cursor/generateCursorRules.js";

describe("Cursor integration", () => {
  const files = generateCursorRules();

  it("all rules include the agent-native preamble", () => {
    for (const file of files) {
      expect(file.content).toContain("Do not run the `idea-gauntlet` CLI first");
      expect(file.content).toContain("execute the workflow natively");
    }
  });

  it("court rule includes required headings", () => {
    const courtRule = files.find((f) => f.path.includes("court"));
    expect(courtRule).toBeDefined();
    expect(courtRule!.content).toContain("Market Skeptic Case");
  });

  it("does NOT contain CLI-first patterns", () => {
    for (const file of files) {
      expect(file.content).not.toMatch(/run the CLI first/i);
    }
  });

  it("generates rules for all 5 workflows", () => {
    const paths = files.map((f) => f.path);
    expect(paths).toContain(".cursor/rules/idea-gauntlet-quick.mdc");
    expect(paths).toContain(".cursor/rules/idea-gauntlet-court.mdc");
    expect(paths).toContain(".cursor/rules/idea-gauntlet-users.mdc");
    expect(paths).toContain(".cursor/rules/idea-gauntlet-mvp.mdc");
    expect(paths).toContain(".cursor/rules/idea-gauntlet-compare.mdc");
  });
});
