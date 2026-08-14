import { describe, it, expect } from "vitest";
import { withConcurrency } from "../../src/utils/concurrency.js";

describe("withConcurrency", () => {
  it("runs all tasks and preserves task order", async () => {
    const tasks = [
      async () => {
        await new Promise((r) => setTimeout(r, 20));
        return "first";
      },
      async () => {
        await new Promise((r) => setTimeout(r, 5));
        return "second";
      },
      async () => {
        await new Promise((r) => setTimeout(r, 10));
        return "third";
      },
    ];

    const results = await withConcurrency(tasks, 2);
    expect(results).toEqual(["first", "second", "third"]);
  });

  it("handles empty tasks array", async () => {
    const results = await withConcurrency([], 3);
    expect(results).toEqual([]);
  });

  it("handles concurrency of 1 (strictly sequential)", async () => {
    let running = 0;
    let maxRunning = 0;

    const tasks = Array.from({ length: 5 }, (_, i) => async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return i;
    });

    const results = await withConcurrency(tasks, 1);
    expect(maxRunning).toBe(1);
    expect(results).toEqual([0, 1, 2, 3, 4]);
  });

  it("clamps concurrency properly when tasks count is smaller than concurrency", async () => {
    const tasks = [async () => 1, async () => 2];
    const results = await withConcurrency(tasks, 10);
    expect(results).toEqual([1, 2]);
  });
});
