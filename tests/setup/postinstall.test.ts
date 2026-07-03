import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock globalSetup so we can unit-test postinstall behavior
const mockGlobalSetup = vi.hoisted(() => vi.fn());
vi.mock("../../src/setup/globalSetup.js", () => ({
  globalSetup: mockGlobalSetup,
}));

import { runPostinstall } from "../../src/postinstall.js";

describe("runPostinstall", () => {
  let testDir: string;
  let configHome: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `ig-postinstall-test-${Date.now()}`);
    configHome = join(testDir, "config");
    mkdirSync(configHome, { recursive: true });
    process.env.IDEAGAUNTLET_CONFIG_HOME = configHome;
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.IDEAGAUNTLET_CONFIG_HOME;
    delete process.env.IDEAGAUNTLET_CLAUDE_DIR;
    delete process.env.IDEAGAUNTLET_CODEX_DIR;
    delete process.env.IDEAGAUNTLET_CURSOR_DIR;
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* already cleaned */ }
  });

  it("calls globalSetup with mode:install, force:false, empty flags", async () => {
    mockGlobalSetup.mockResolvedValue({
      created: 0, updated: 0, removed: 0,
      alreadyInstalled: 0, conflicts: 0, skipped: 0,
      errors: [],
    });

    await runPostinstall();

    expect(mockGlobalSetup).toHaveBeenCalledWith({
      mode: "install",
      force: false,
      flags: {},
    });
  });

  it("prints ✓ IdeaGauntlet installed on success", async () => {
    mockGlobalSetup.mockResolvedValue({
      created: 2, updated: 0, removed: 0,
      alreadyInstalled: 1, conflicts: 0, skipped: 1,
      errors: [],
    });

    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((msg) => lines.push(msg));

    await runPostinstall();

    expect(lines.some((l) => l.includes("IdeaGauntlet installed"))).toBe(true);
    expect(lines.some((l) => l.includes("Integrations:"))).toBe(true);

    spy.mockRestore();
  });

  it("prints install/up-to-date counts in summary", async () => {
    mockGlobalSetup.mockResolvedValue({
      created: 3, updated: 0, removed: 0,
      alreadyInstalled: 2, conflicts: 0, skipped: 0,
      errors: [],
    });

    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((msg) => lines.push(msg));

    await runPostinstall();

    expect(lines.some((l) => l.includes("3 installed"))).toBe(true);
    expect(lines.some((l) => l.includes("2 up-to-date"))).toBe(true);

    spy.mockRestore();
  });

  it("reports 'none installed' when nothing was created or already installed", async () => {
    mockGlobalSetup.mockResolvedValue({
      created: 0, updated: 0, removed: 0,
      alreadyInstalled: 0, conflicts: 0, skipped: 4,
      errors: [],
    });

    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((msg) => lines.push(msg));

    await runPostinstall();

    expect(lines.some((l) => l.includes("none installed"))).toBe(true);
    expect(lines.some((l) => l.includes("skipped"))).toBe(true);

    spy.mockRestore();
  });

  it("reports conflicts when files were not overwritten", async () => {
    mockGlobalSetup.mockResolvedValue({
      created: 0, updated: 0, removed: 0,
      alreadyInstalled: 1, conflicts: 2, skipped: 1,
      errors: [],
    });

    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((msg) => lines.push(msg));

    await runPostinstall();

    expect(lines.some((l) => l.includes("unchanged"))).toBe(true);
    expect(lines.some((l) => l.includes("2"))).toBe(true);

    spy.mockRestore();
  });

  it("prints guidance about status and uninstall commands", async () => {
    mockGlobalSetup.mockResolvedValue({
      created: 1, updated: 0, removed: 0,
      alreadyInstalled: 0, conflicts: 0, skipped: 2,
      errors: [],
    });

    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((msg) => lines.push(msg));

    await runPostinstall();

    expect(lines.some((l) => l.includes("idea-gauntlet status"))).toBe(true);
    expect(lines.some((l) => l.includes("idea-gauntlet uninstall"))).toBe(true);
    expect(lines.some((l) => l.includes("Use IdeaGauntlet"))).toBe(true);

    spy.mockRestore();
  });

  it("catches errors from globalSetup and does not throw", async () => {
    mockGlobalSetup.mockRejectedValue(new Error("test error"));

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(runPostinstall()).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("prints warning on error and suggests manual install", async () => {
    mockGlobalSetup.mockRejectedValue(new Error("something broke"));

    const lines: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((msg) => lines.push(msg));

    await runPostinstall();

    expect(lines.some((l) => l.includes("postinstall"))).toBe(true);
    expect(lines.some((l) => l.includes("idea-gauntlet install"))).toBe(true);

    spy.mockRestore();
  });

  it("uses force:false (does not overwrite conflicts)", async () => {
    mockGlobalSetup.mockResolvedValue({
      created: 0, updated: 0, removed: 0,
      alreadyInstalled: 0, conflicts: 2, skipped: 2,
      errors: [],
    });

    await runPostinstall();

    expect(mockGlobalSetup).toHaveBeenCalledWith(
      expect.objectContaining({ force: false })
    );
  });
});
