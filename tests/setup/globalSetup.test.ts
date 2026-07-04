import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { globalSetup } from "../../src/setup/globalSetup.js";

let testDir: string;
let configHome: string;
let claudeDir: string;
let codexDir: string;
let cursorDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `ig-global-test-${Date.now()}`);
  configHome = join(testDir, "config");
  claudeDir = join(testDir, "claude");
  codexDir = join(testDir, "codex");
  cursorDir = join(testDir, "cursor");
  mkdirSync(configHome, { recursive: true });
  mkdirSync(claudeDir, { recursive: true });
  mkdirSync(codexDir, { recursive: true });
  mkdirSync(cursorDir, { recursive: true });
  // Pre-set env vars for this test
  process.env.IDEAGAUNTLET_CONFIG_HOME = configHome;
  process.env.IDEAGAUNTLET_CLAUDE_DIR = claudeDir;
  process.env.IDEAGAUNTLET_CODEX_DIR = codexDir;
  process.env.IDEAGAUNTLET_CURSOR_DIR = cursorDir;
});

afterEach(() => {
  delete process.env.IDEAGAUNTLET_CONFIG_HOME;
  delete process.env.IDEAGAUNTLET_CLAUDE_DIR;
  delete process.env.IDEAGAUNTLET_CODEX_DIR;
  delete process.env.IDEAGAUNTLET_CURSOR_DIR;
  try { rmSync(testDir, { recursive: true, force: true }); } catch { /* already cleaned */ }
});

describe("globalSetup install", () => {
  it("installs files into detected tool dirs", async () => {
    const result = await globalSetup({ mode: "install", force: false, flags: {} });
    expect(result.errors).toEqual([]);

    // Claude files should exist
    expect(existsSync(join(claudeDir, "skills", "gauntlet-quick", "SKILL.md"))).toBe(true);
    expect(existsSync(join(claudeDir, "agents", "market-skeptic.md"))).toBe(true);
    expect(existsSync(join(claudeDir, "commands", "gauntlet-quick.md"))).toBe(true);

    // Codex files
    expect(existsSync(join(codexDir, "AGENTS.md"))).toBe(true);

    // Cursor files
    expect(existsSync(join(cursorDir, "rules", "idea-gauntlet-quick.mdc"))).toBe(true);

    // MCP standalone
    expect(existsSync(join(configHome, "mcp-config.json"))).toBe(true);

    // Manifest
    expect(existsSync(join(configHome, "install-manifest.json"))).toBe(true);
  });

  it("is idempotent — second install reports already installed", async () => {
    await globalSetup({ mode: "install", force: false, flags: {} });
    const result2 = await globalSetup({ mode: "install", force: false, flags: {} });
    expect(result2.errors).toEqual([]);
    expect(result2.alreadyInstalled).toBeGreaterThan(0);
    expect(result2.created).toBe(0);
  });

  it("skips tools that are not detected", async () => {
    delete process.env.IDEAGAUNTLET_CODEX_DIR;
    const result = await globalSetup({ mode: "install", force: false, flags: {} });
    expect(result.errors).toEqual([]);
    // MCP always installs because it uses configHome
    expect(result.created).toBeGreaterThan(0);
  });
});

describe("globalSetup status", () => {
  it("reports not installed when no manifest", async () => {
    const result = await globalSetup({ mode: "status", force: false, flags: {} });
    expect(result.skipped).toBe(1);
  });

  it("reports installed files after install", async () => {
    await globalSetup({ mode: "install", force: false, flags: {} });
    const result = await globalSetup({ mode: "status", force: false, flags: {} });
    expect(result.alreadyInstalled).toBeGreaterThan(0);
    expect(result.skipped).toBe(0);
  });
});

describe("globalSetup uninstall", () => {
  it("removes files tracked in manifest", async () => {
    await globalSetup({ mode: "install", force: false, flags: {} });

    // Verify files exist before uninstall
    expect(existsSync(join(claudeDir, "skills", "gauntlet-quick", "SKILL.md"))).toBe(true);

    const result = await globalSetup({ mode: "remove", force: false, flags: {} });
    expect(result.errors).toEqual([]);
    expect(result.removed).toBeGreaterThan(0);

    // Verify files are gone
    expect(existsSync(join(claudeDir, "skills", "gauntlet-quick", "SKILL.md"))).toBe(false);

    // Manifest should be gone
    expect(existsSync(join(configHome, "install-manifest.json"))).toBe(false);
  });

  it("does not remove modified files without --force", async () => {
    await globalSetup({ mode: "install", force: false, flags: {} });
    const filePath = join(claudeDir, "skills", "gauntlet-quick", "SKILL.md");
    // Modify the file
    writeFileSync(filePath, "modified content", "utf-8");

    const result = await globalSetup({ mode: "remove", force: false, flags: {} });
    // Modified file should be skipped with error message
    expect(result.errors.some((e) => e.includes("modified"))).toBe(true);
    expect(existsSync(filePath)).toBe(true);
  });
});
