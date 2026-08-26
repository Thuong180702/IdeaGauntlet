import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { safeWriteOutput, safeWriteReport } from "../../src/utils/safeWrite.js";

let workDir: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workDir = mkdtempSync(join(tmpdir(), "ig-safewrite-"));
  process.chdir(workDir);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(workDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("safeWriteOutput", () => {
  it("writes a file inside the working directory", () => {
    const res = safeWriteOutput("report.md", "hello");
    expect(res.ok).toBe(true);
    expect(readFileSync(join(workDir, "report.md"), "utf-8")).toBe("hello");
  });

  it("writes into a nested path inside the working directory", () => {
    mkdirSync(join(workDir, "out"));
    const res = safeWriteOutput("out/report.md", "nested");
    expect(res.ok).toBe(true);
    expect(readFileSync(join(workDir, "out", "report.md"), "utf-8")).toBe("nested");
  });

  it("prints to stdout when no output path is given", () => {
    const res = safeWriteOutput(undefined, "to-stdout");
    expect(res).toEqual({ ok: true, path: "" });
    expect(console.log).toHaveBeenCalledWith("to-stdout");
  });

  // SEC-03 regression: relative traversal must not escape the working directory.
  it("rejects relative path traversal", () => {
    const res = safeWriteOutput("../escaped.md", "evil");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("traversal");
    expect(existsSync(resolve(workDir, "../escaped.md"))).toBe(false);
  });

  it("rejects deep relative traversal", () => {
    const res = safeWriteOutput("a/../../../escaped.md", "evil");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("traversal");
  });

  // SEC-03 regression: the original bug only ran the traversal check when the
  // path contained "..", so a plain absolute path bypassed the guard entirely.
  it("rejects an absolute path outside the working directory", () => {
    const res = safeWriteOutput("/tmp/ig-absolute-escape.md", "evil");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("traversal");
    expect(existsSync("/tmp/ig-absolute-escape.md")).toBe(false);
  });

  it("rejects a sibling directory sharing the cwd name as a prefix", () => {
    // `<workDir>-evil` starts with `<workDir>` as a string but is NOT inside it,
    // so a naive startsWith check would wrongly allow it.
    const res = safeWriteOutput(`${workDir}-evil/report.md`, "evil");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("traversal");
  });

  it("refuses to overwrite an existing file", () => {
    writeFileSync(join(workDir, "exists.md"), "original", "utf-8");
    const res = safeWriteOutput("exists.md", "replacement");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("exists");
    expect(readFileSync(join(workDir, "exists.md"), "utf-8")).toBe("original");
  });
});

describe("safeWriteReport", () => {
  it("writes inside .idea-gauntlet/reports/", () => {
    const res = safeWriteReport("my-report_1", "# Report", workDir);
    expect(res.ok).toBe(true);
    const expected = join(workDir, ".idea-gauntlet", "reports", "my-report_1.md");
    expect(existsSync(expected)).toBe(true);
    expect(readFileSync(expected, "utf-8")).toBe("# Report");
  });

  it("creates the reports directory when missing", () => {
    expect(existsSync(join(workDir, ".idea-gauntlet"))).toBe(false);
    expect(safeWriteReport("fresh", "x", workDir).ok).toBe(true);
    expect(existsSync(join(workDir, ".idea-gauntlet", "reports"))).toBe(true);
  });

  // SEC-04 regression: crafted IDs must not escape the reports directory.
  it.each([
    ["../../../etc/passwd", "parent traversal"],
    ["../escape", "single parent"],
    ["sub/dir", "path separator"],
    ["report.md", "dot in id"],
    ["", "empty id"],
    ["a b", "whitespace in id"],
    ["~/evil", "home expansion"],
  ])("rejects malicious report id %j (%s)", (id) => {
    const res = safeWriteReport(id, "evil", workDir);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("traversal");
  });

  it("does not write anything outside the workspace for a traversal id", () => {
    safeWriteReport("../../../../../../tmp/ig-report-escape", "evil", workDir);
    expect(existsSync("/tmp/ig-report-escape.md")).toBe(false);
  });
});
