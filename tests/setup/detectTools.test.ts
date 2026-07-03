import { describe, it, expect, afterAll } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectTool, detectAllTools } from "../../src/setup/detectTools.js";
import type { ToolDetectionContext } from "../../src/setup/types.js";

function makeContext(overrides: Partial<ToolDetectionContext> = {}): ToolDetectionContext {
  return {
    platform: "linux",
    env: { HOME: "/home/test" },
    flags: {},
    configHome: "/home/test/.config/idea-gauntlet",
    ...overrides,
  };
}

// Set up a temporary directory to test standard-path resolution
const tmpHome = join(tmpdir(), "ig-detect-test-" + Date.now());
const tmpClaudeDir = join(tmpHome, ".claude");
const tmpCursorDir = join(tmpHome, ".cursor");
const tmpCodexDir = join(tmpHome, ".codex");
mkdirSync(tmpClaudeDir, { recursive: true });
mkdirSync(tmpCursorDir, { recursive: true });
mkdirSync(tmpCodexDir, { recursive: true });

afterAll(() => {
  rmSync(tmpHome, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// detectTool
// ---------------------------------------------------------------------------
describe("detectTool", () => {
  // ---- flag ----
  it("flag override detects claude even if not installed", () => {
    const ctx = makeContext({ flags: { "claude-dir": "/custom/claude" } });
    const result = detectTool("claude", ctx);
    expect(result).toEqual({ detected: true, root: "/custom/claude", source: "flag" });
  });

  it("flag override accepts camelCase form (claudeDir)", () => {
    const ctx = makeContext({ flags: { claudeDir: "/custom/claude" } });
    const result = detectTool("claude", ctx);
    expect(result).toEqual({ detected: true, root: "/custom/claude", source: "flag" });
  });

  it("flag override accepts flattened form (claudedir)", () => {
    const ctx = makeContext({ flags: { claudedir: "/custom/claude" } });
    const result = detectTool("claude", ctx);
    expect(result).toEqual({ detected: true, root: "/custom/claude", source: "flag" });
  });

  it("flag override works for codex with hyphenated form", () => {
    const ctx = makeContext({ flags: { "codex-dir": "/custom/codex" } });
    const result = detectTool("codex", ctx);
    expect(result).toEqual({ detected: true, root: "/custom/codex", source: "flag" });
  });

  it("flag override works for cursor with camelCase form", () => {
    const ctx = makeContext({ flags: { cursorDir: "/custom/cursor" } });
    const result = detectTool("cursor", ctx);
    expect(result).toEqual({ detected: true, root: "/custom/cursor", source: "flag" });
  });

  // ---- env ----
  it("env override detects claude", () => {
    const ctx = makeContext({
      env: { HOME: "/home/test", IDEAGAUNTLET_CLAUDE_DIR: "/env/claude" },
    });
    const result = detectTool("claude", ctx);
    expect(result).toEqual({ detected: true, root: "/env/claude", source: "env" });
  });

  it("env override detects codex", () => {
    const ctx = makeContext({
      env: { HOME: "/home/test", IDEAGAUNTLET_CODEX_DIR: "/env/codex" },
    });
    const result = detectTool("codex", ctx);
    expect(result).toEqual({ detected: true, root: "/env/codex", source: "env" });
  });

  it("env override detects cursor", () => {
    const ctx = makeContext({
      env: { HOME: "/home/test", IDEAGAUNTLET_CURSOR_DIR: "/env/cursor" },
    });
    const result = detectTool("cursor", ctx);
    expect(result).toEqual({ detected: true, root: "/env/cursor", source: "env" });
  });

  // ---- precedence ----
  it("flag beats env", () => {
    const ctx = makeContext({
      env: { HOME: "/home/test", IDEAGAUNTLET_CLAUDE_DIR: "/env/claude" },
      flags: { "claude-dir": "/flag/claude" },
    });
    const result = detectTool("claude", ctx);
    expect(result).toEqual({ detected: true, root: "/flag/claude", source: "flag" });
  });

  it("env beats standard path", () => {
    // tmpHome exists and has .claude, but env should win
    const ctx = makeContext({
      platform: "linux",
      env: { HOME: tmpHome, IDEAGAUNTLET_CLAUDE_DIR: "/env/claude" },
    });
    const result = detectTool("claude", ctx);
    expect(result).toEqual({ detected: true, root: "/env/claude", source: "env" });
  });

  it("empty flag string falls through to env", () => {
    const ctx = makeContext({
      env: { HOME: "/home/test", IDEAGAUNTLET_CLAUDE_DIR: "/env/claude" },
      flags: { "claude-dir": "" },
    });
    const result = detectTool("claude", ctx);
    expect(result).toEqual({ detected: true, root: "/env/claude", source: "env" });
  });

  it("empty env var falls through to standard path when it exists", () => {
    const ctx = makeContext({
      platform: "linux",
      env: { HOME: tmpHome, IDEAGAUNTLET_CLAUDE_DIR: "" },
    });
    const result = detectTool("claude", ctx);
    expect(result).toEqual({ detected: true, root: tmpClaudeDir, source: "standard" });
  });

  // ---- standard path ----
  it("detects claude at standard path when directory exists", () => {
    const ctx = makeContext({
      platform: "linux",
      env: { HOME: tmpHome },
    });
    const result = detectTool("claude", ctx);
    expect(result).toEqual({ detected: true, root: tmpClaudeDir, source: "standard" });
  });

  it("detects cursor at standard path when directory exists", () => {
    const ctx = makeContext({
      platform: "linux",
      env: { HOME: tmpHome },
    });
    const result = detectTool("cursor", ctx);
    expect(result).toEqual({ detected: true, root: tmpCursorDir, source: "standard" });
  });

  it("detects codex at standard path when directory exists", () => {
    const ctx = makeContext({
      platform: "linux",
      env: { HOME: tmpHome },
    });
    const result = detectTool("codex", ctx);
    expect(result).toEqual({ detected: true, root: tmpCodexDir, source: "standard" });
  });

  it("detects claude on Windows standard path", () => {
    const ctx = makeContext({
      platform: "win32",
      env: { APPDATA: tmpHome },
    });
    // APPDATA/Claude must exist — create it
    const winClaude = join(tmpHome, "Claude");
    mkdirSync(winClaude, { recursive: true });
    try {
      const result = detectTool("claude", ctx);
      expect(result).toEqual({ detected: true, root: winClaude, source: "standard" });
    } finally {
      rmSync(winClaude, { recursive: true, force: true });
    }
  });

  // ---- missing path ----
  it("missing standard path returns not-detected with reason", () => {
    const ctx = makeContext({
      platform: "linux",
      env: { HOME: "/nonexistent-home-dir" },
    });
    const result = detectTool("claude", ctx);
    expect(result).toEqual({
      detected: false,
      reason: expect.stringContaining("not found"),
    });
  });

  it("missing standard path includes hint with flag name", () => {
    const ctx = makeContext({
      platform: "linux",
      env: { HOME: "/nonexistent-home-dir" },
    });
    const result = detectTool("claude", ctx);
    expect(result.detected).toBe(false);
    if (!result.detected) {
      expect(result.reason).toContain("--claude-dir");
    }
  });

  it("missing standard path includes hint with env var name", () => {
    const ctx = makeContext({
      platform: "linux",
      env: { HOME: "/nonexistent-home-dir" },
    });
    const result = detectTool("claude", ctx);
    expect(result.detected).toBe(false);
    if (!result.detected) {
      expect(result.reason).toContain("IDEAGAUNTLET_CLAUDE_DIR");
    }
  });

  it("returns not-detected for cursor when HOME has no .cursor", () => {
    const ctx = makeContext({
      platform: "linux",
      env: { HOME: "/nonexistent-home-dir" },
    });
    const result = detectTool("cursor", ctx);
    expect(result.detected).toBe(false);
  });

  it("returns not-detected for codex when HOME has no .codex", () => {
    const ctx = makeContext({
      platform: "linux",
      env: { HOME: "/nonexistent-home-dir" },
    });
    const result = detectTool("codex", ctx);
    expect(result.detected).toBe(false);
  });

  // ---- windows env ----
  it("handles missing APPDATA on Windows by returning not-detected", () => {
    const ctx = makeContext({
      platform: "win32",
      env: {}, // no HOME, no APPDATA
    });
    const result = detectTool("claude", ctx);
    expect(result.detected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detectAllTools
// ---------------------------------------------------------------------------
describe("detectAllTools", () => {
  it("returns map with all four tools when all flags are set", () => {
    const ctx = makeContext({
      flags: {
        "claude-dir": "/tmp/claude",
        "codex-dir": "/tmp/codex",
        "cursor-dir": "/tmp/cursor",
      },
    });
    const result = detectAllTools(ctx);
    expect(result.has("claude")).toBe(true);
    expect(result.has("codex")).toBe(true);
    expect(result.has("cursor")).toBe(true);
    expect(result.has("mcp")).toBe(true);
  });

  it("mcp always uses configHome as root", () => {
    const ctx = makeContext({ configHome: "/custom/config/idea-gauntlet" });
    const result = detectAllTools(ctx);
    const mcp = result.get("mcp");
    expect(mcp).toEqual({ detected: true, root: "/custom/config/idea-gauntlet", source: "standard" });
  });

  it("detectAllTools integrates flag detection correctly", () => {
    const ctx = makeContext({
      flags: { "claude-dir": "/flag/claude" },
      env: { HOME: "/nonexistent" },
    });
    const result = detectAllTools(ctx);
    expect(result.get("claude")).toEqual({ detected: true, root: "/flag/claude", source: "flag" });
    // cursor and codex not found via standard path
    expect(result.get("cursor")!.detected).toBe(false);
    expect(result.get("codex")!.detected).toBe(false);
  });

  it("returns detected:false tools with reasons in the map", () => {
    const ctx = makeContext({
      platform: "linux",
      env: { HOME: "/nonexistent-home" },
    });
    const result = detectAllTools(ctx);
    for (const tool of ["claude", "codex", "cursor"] as const) {
      const entry = result.get(tool)!;
      expect(entry.detected).toBe(false);
      if (!entry.detected) {
        expect(entry.reason).toBeTruthy();
      }
    }
  });
});
