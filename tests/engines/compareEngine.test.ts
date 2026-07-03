import { describe, it, expect } from "vitest";
import { runCompareEngine } from "../../src/engines/compareEngine.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("runCompareEngine", () => {
  it("returns comparison with ranked ideas from a provider", async () => {
    const provider = new StaticProvider();
    const ideas = [{ idea: "Idea A" }, { idea: "Idea B" }];
    const report = await runCompareEngine(ideas, provider);
    expect(report.comparison).toBeDefined();
    expect(report.comparison!.ideas.length).toBe(2);
    expect(report.comparison!.ranking.length).toBe(2);
    expect(report.comparison!.recommendedPick).toBeTruthy();
  });
});
