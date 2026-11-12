import { describe, it, expect } from "vitest";
import { formatWelcome, suggestCommand } from "../../src/cli/welcome.js";

const COMMANDS = ["quick", "court", "users", "mvp", "compare", "doctor", "setup", "assumptions", "compete", "compliance"];

describe("suggestCommand", () => {
  it("suggests the closest command for a typo", () => {
    expect(suggestCommand("quik", COMMANDS)).toBe("quick");
    expect(suggestCommand("cuort", COMMANDS)).toBe("court");
    expect(suggestCommand("assumption", COMMANDS)).toBe("assumptions");
    expect(suggestCommand("DOCTOR", COMMANDS)).toBe("doctor");
  });

  it("suggests nothing when no command is close", () => {
    expect(suggestCommand("frobnicate", COMMANDS)).toBeUndefined();
    expect(suggestCommand("x", [])).toBeUndefined();
  });
});

describe("formatWelcome", () => {
  it("shows the version, a first command, and no-key paths", () => {
    const text = formatWelcome("9.9.9");
    expect(text).toContain("v9.9.9");
    expect(text).toContain("idea-gauntlet quick");
    expect(text).toContain("idea-gauntlet doctor");
    expect(text).toContain("idea-gauntlet setup");
    expect(text).toContain("stdin");
  });
});
