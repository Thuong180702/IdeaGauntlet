import { describe, it, expect } from "vitest";
import { buildOpeningPrompt, COURT_ROLES } from "../../src/engines/courtPhases.js";
import type { IdeaInput } from "../../src/core/types.js";

const idea: IdeaInput = { idea: "A focus-room app for remote workers", mode: "court" };
const defender = COURT_ROLES.find((r) => r.stance === "defender")!;
const skeptic = COURT_ROLES.find((r) => r.stance === "skeptic")!;

describe("buildOpeningPrompt — steelman phase", () => {
  it("instructs the defender to build the steelman", () => {
    const { system } = buildOpeningPrompt(defender, idea, undefined);
    expect(system.toLowerCase()).toContain("steelman");
    expect(system.toLowerCase()).toContain("strongest");
  });

  it("feeds the steelman to skeptics so they attack the strongest version", () => {
    const steelman = "The wedge is solo founders who need enforced deep-work blocks.";
    const { user } = buildOpeningPrompt(skeptic, idea, undefined, { steelman });
    expect(user).toContain(steelman);
    expect(user).toContain("Attack THIS");
  });

  it("does not inject a steelman block when none is provided", () => {
    const { user } = buildOpeningPrompt(skeptic, idea, undefined);
    expect(user).not.toContain("STEELMAN");
  });
});
