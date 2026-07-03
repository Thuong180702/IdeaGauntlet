import { describe, it, expect } from "vitest";
import { runMvpPlanner } from "../../src/engines/mvpPlanner.js";
import { StaticProvider } from "../helpers/staticProvider.js";

describe("runMvpPlanner", () => {
  it("returns MVP plan with scope from a provider", async () => {
    const provider = new StaticProvider();
    const report = await runMvpPlanner({ idea: "Test idea" }, provider);
    expect(report.mvpPlan).toBeDefined();
    expect(report.mvpPlan!.scope).toBeDefined();
    expect(report.mvpPlan!.scope.length).toBeGreaterThan(0);
  });
});
