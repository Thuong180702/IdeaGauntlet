import { describe, it, expect } from "vitest";
import { runGauntlet } from "../../src/core/runGauntlet.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("runGauntlet", () => {
  it("throws when provider is missing", async () => {
    await expect(runGauntlet({ idea: "Test idea" } as any)).rejects.toThrow("LLM provider is required");
  });

  it("throws when invalid stage is provided", async () => {
    const provider = new StaticProvider();
    await expect(
      runGauntlet({ idea: "Test idea", stage: "invalid-stage", provider, enableSearch: false })
    ).rejects.toThrow('Invalid stage "invalid-stage"');
  });

  it("accepts valid stage (napkin, pre-mvp, mvp, growth)", async () => {
    const provider = new StaticProvider();
    const report = await runGauntlet({
      idea: "Focus room app for remote workers",
      stage: "napkin",
      provider,
      enableSearch: false,
    });
    expect(report.input.stage).toBe("napkin");
    expect(report.markdown).toBeDefined();
    expect(report.markdown.length).toBeGreaterThan(0);
  });
});
