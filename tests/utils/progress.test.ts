import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startProgress, stopProgress, withProgress } from "../../src/utils/progress.js";
import { setQuiet } from "../../src/utils/warn.js";

describe("progress", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setQuiet(false);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stopProgress();
    setQuiet(false);
  });

  it("startProgress does nothing in quiet mode", () => {
    setQuiet(true);
    startProgress("loading");
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("stopProgress without active timer does nothing in quiet mode", () => {
    setQuiet(true);
    stopProgress("done");
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("withProgress returns fn result", async () => {
    // Force non-TTY to avoid spinner writes but still test return value
    const result = await withProgress("test", async () => 42);
    expect(result).toBe(42);
  });

  it("withProgress propagates errors", async () => {
    await expect(
      withProgress("test", async () => { throw new Error("fail"); }),
    ).rejects.toThrow("fail");
  });
});
