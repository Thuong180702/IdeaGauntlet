import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { warn, warnIfError, setQuiet, isQuiet } from "../../src/utils/warn.js";

describe("warn", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setQuiet(false);
    delete process.env.IDEAGAUNTLET_QUIET;
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    setQuiet(false);
    delete process.env.IDEAGAUNTLET_QUIET;
  });

  it("writes to stderr with [warn] prefix", () => {
    warn("test message");
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain("[warn]");
    expect(output).toContain("test message");
    expect(output).toContain("\n");
    expect(output).toContain("\u001b[33m"); // yellow ANSI
  });

  it("respects quiet mode via setQuiet(true)", () => {
    setQuiet(true);
    warn("should not appear");
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("respects quiet mode via IDEAGAUNTLET_QUIET env", () => {
    process.env.IDEAGAUNTLET_QUIET = "true";
    expect(isQuiet()).toBe(true);
    warn("should not appear");
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("warnIfError extracts Error message", () => {
    warnIfError("context", new Error("boom"));
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain("context: boom");
  });

  it("warnIfError handles non-Error values", () => {
    warnIfError("ctx", "string error");
    expect(stderrSpy).toHaveBeenCalledOnce();
    expect(stderrSpy.mock.calls[0][0]).toContain("string error");
  });

  it("warnIfError handles undefined", () => {
    warnIfError("ctx", undefined);
    expect(stderrSpy).toHaveBeenCalledOnce();
    expect(stderrSpy.mock.calls[0][0]).toContain("undefined");
  });

  it("warnIfError is suppressed in quiet mode", () => {
    setQuiet(true);
    warnIfError("ctx", new Error("err"));
    expect(stderrSpy).not.toHaveBeenCalled();
  });
});
