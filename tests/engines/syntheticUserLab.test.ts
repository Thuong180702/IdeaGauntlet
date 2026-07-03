import { describe, it, expect } from "vitest";
import { runUserLab } from "../../src/engines/syntheticUserLab.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("runUserLab", () => {
  it("returns synthetic personas from a provider", async () => {
    const provider = new StaticProvider();
    const report = await runUserLab({ idea: "Test idea" }, provider, 2);
    expect(report.syntheticUsers).toBeDefined();
    expect(report.syntheticUsers!.length).toBeGreaterThan(0);
    expect(report.syntheticUsers![0]).toHaveProperty("name");
    expect(report.syntheticUsers![0]).toHaveProperty("archetype");
  });
});
