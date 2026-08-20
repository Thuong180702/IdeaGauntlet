import { describe, it, expect } from "vitest";
import { runPitchGenerator, formatPitchDeckReport } from "../../src/engines/pitchGenerator.js";
import { StaticProvider } from "../helpers/staticProvider.js";

const IDEA = { idea: "A focus-room app for remote workers that pairs people into silent 50-minute work sessions." };

describe("pitchGenerator", () => {
  it("throws error for empty idea", async () => {
    await expect(runPitchGenerator({ idea: "" }, new StaticProvider())).rejects.toThrow("non-empty product idea is required");
  });

  it("generates structured pitch deck with slides", async () => {
    const result = await runPitchGenerator(IDEA, new StaticProvider(), {
      template: "yc",
      companyName: "FocusGauntlet",
      enableSearch: false,
    });

    expect(result).toHaveProperty("template");
    expect(result).toHaveProperty("companyName");
    expect(result).toHaveProperty("oneLinePitch");
    expect(result).toHaveProperty("elevatorPitch");
    expect(result).toHaveProperty("whyNowNarrative");
    expect(result).toHaveProperty("slides");

    expect(result.companyName).toBe("FocusGauntlet");
    expect(result.template).toBe("yc");
    expect(Array.isArray(result.slides)).toBe(true);
    expect(result.slides.length).toBeGreaterThan(0);

    const firstSlide = result.slides[0];
    expect(firstSlide).toHaveProperty("title");
    expect(firstSlide).toHaveProperty("headline");
    expect(firstSlide).toHaveProperty("bulletPoints");
    expect(firstSlide).toHaveProperty("visualConcept");
    expect(firstSlide).toHaveProperty("speakerNotes");
  });

  it("formats pitch deck as markdown with speaker notes", async () => {
    const result = await runPitchGenerator(IDEA, new StaticProvider(), { enableSearch: false });
    const formatted = formatPitchDeckReport(result);

    expect(formatted).toContain("Pitch Deck Draft");
    expect(formatted).toContain("One-Line Pitch");
    expect(formatted).toContain("Elevator Pitch");
    expect(formatted).toContain("Slide Deck Outline");
    expect(formatted).toContain("Speaker Script");
  });

  it("handles provider failure gracefully with fallback deck", async () => {
    class FailingProvider implements import("../../src/core/types.js").LLMProvider {
      kind = "custom" as const;
      async complete(): Promise<string> { throw new Error("Simulated LLM failure"); }
    }

    const result = await runPitchGenerator(IDEA, new FailingProvider(), { enableSearch: false });

    expect(result).toBeDefined();
    expect(result.slides.length).toBeGreaterThan(0);
    expect(result.oneLinePitch.length).toBeGreaterThan(0);
  });
});
