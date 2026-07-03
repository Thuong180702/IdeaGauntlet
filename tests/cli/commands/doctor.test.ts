import { describe, it, expect } from "vitest";
import { isNodeGte } from "../../../src/utils/env.js";

describe("doctor diagnostics", () => {
  it("node version check is >= 18", () => {
    const match = process.version.match(/^v(\d+)/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1], 10)).toBeGreaterThanOrEqual(18);
  });

  it("isNodeGte works correctly", () => {
    expect(isNodeGte(18)).toBe(true);
    expect(isNodeGte(999)).toBe(false);
  });
});
