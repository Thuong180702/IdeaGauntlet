import { describe, it, expect, afterAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readManifest,
  writeManifest,
  hashContent,
  hashFile,
  verifyEntry,
  verifyManifest,
} from "../../src/setup/manifest.js";
import type { InstallManifest, InstallEntry } from "../../src/setup/types.js";

function tmpDir(): string {
  const d = join(tmpdir(), `ig-manifest-test-${Date.now()}`);
  mkdirSync(d, { recursive: true });
  return d;
}

const dirsToClean: string[] = [];

afterAll(() => {
  for (const d of dirsToClean) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

describe("hashContent", () => {
  it("returns sha256 hex for a string", () => {
    const h = hashContent("hello");
    expect(h).toHaveLength(64); // sha256 hex is 64 chars
    expect(h).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("produces different hashes for different content", () => {
    expect(hashContent("foo")).not.toBe(hashContent("bar"));
  });
});

describe("hashFile", () => {
  it("returns sha256 hex for a file", () => {
    const dir = tmpDir();
    dirsToClean.push(dir);
    const file = join(dir, "test.txt");
    writeFileSync(file, "hello", "utf-8");
    const h = hashFile(file);
    expect(h).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("returns null for missing file", () => {
    expect(hashFile("/nonexistent/file.txt")).toBeNull();
  });
});

describe("readManifest", () => {
  it("returns null for missing manifest", () => {
    expect(readManifest("/nonexistent/manifest.json")).toBeNull();
  });

  it("reads a valid manifest", () => {
    const dir = tmpDir();
    dirsToClean.push(dir);
    const path = join(dir, "manifest.json");
    const manifest: InstallManifest = {
      version: "0.2.1",
      installedAt: "2026-01-01T00:00:00.000Z",
      packageRoot: "/pkg",
      entries: [],
    };
    writeManifest(path, manifest);
    const read = readManifest(path);
    expect(read).toEqual(manifest);
  });

  it("returns null for corrupted JSON", () => {
    const dir = tmpDir();
    dirsToClean.push(dir);
    const path = join(dir, "bad.json");
    writeFileSync(path, "not json", "utf-8");
    expect(readManifest(path)).toBeNull();
  });
});

describe("verifyEntry", () => {
  it("returns 'present' for file entry with matching hash", () => {
    const dir = tmpDir();
    dirsToClean.push(dir);
    const file = join(dir, "test.md");
    writeFileSync(file, "content", "utf-8");
    const entry: InstallEntry = {
      tool: "claude",
      kind: "file",
      path: file,
      mode: "copy",
      sha256: hashContent("content"),
    };
    expect(verifyEntry(entry)).toBe("present");
  });

  it("returns 'modified' for file entry with different hash", () => {
    const dir = tmpDir();
    dirsToClean.push(dir);
    const file = join(dir, "test.md");
    writeFileSync(file, "different", "utf-8");
    const entry: InstallEntry = {
      tool: "claude",
      kind: "file",
      path: file,
      mode: "copy",
      sha256: hashContent("original"),
    };
    expect(verifyEntry(entry)).toBe("modified");
  });

  it("returns 'missing' for file entry with non-existent file", () => {
    const entry: InstallEntry = {
      tool: "claude",
      kind: "file",
      path: "/nonexistent",
      mode: "copy",
      sha256: "abc",
    };
    expect(verifyEntry(entry)).toBe("missing");
  });

  it("returns 'present' for mcp-config entry with matching hash", () => {
    const dir = tmpDir();
    dirsToClean.push(dir);
    const file = join(dir, "claude_desktop_config.json");
    const igEntry = { command: "npx", args: ["idea-gauntlet", "mcp"] };
    writeFileSync(
      file,
      JSON.stringify({ mcpServers: { "idea-gauntlet": igEntry } }),
      "utf-8",
    );
    const entry: InstallEntry = {
      tool: "claude",
      kind: "mcp-config",
      path: file,
      configKey: "mcpServers.idea-gauntlet",
      entrySha256: hashContent(JSON.stringify(igEntry)),
    };
    expect(verifyEntry(entry)).toBe("present");
  });

  it("returns 'modified' for mcp-config entry with different hash", () => {
    const dir = tmpDir();
    dirsToClean.push(dir);
    const file = join(dir, "claude_desktop_config.json");
    const igEntry = { command: "npx", args: ["idea-gauntlet", "mcp"] };
    writeFileSync(
      file,
      JSON.stringify({ mcpServers: { "idea-gauntlet": igEntry } }),
      "utf-8",
    );
    const entry: InstallEntry = {
      tool: "claude",
      kind: "mcp-config",
      path: file,
      configKey: "mcpServers.idea-gauntlet",
      entrySha256: hashContent(JSON.stringify({ command: "different" })),
    };
    expect(verifyEntry(entry)).toBe("modified");
  });

  it("returns 'missing' for mcp-config entry when file is missing", () => {
    const entry: InstallEntry = {
      tool: "claude",
      kind: "mcp-config",
      path: "/nonexistent",
      configKey: "mcpServers.idea-gauntlet",
      entrySha256: "abc",
    };
    expect(verifyEntry(entry)).toBe("missing");
  });

  it("returns 'missing' for mcp-config entry when idea-gauntlet key is absent", () => {
    const dir = tmpDir();
    dirsToClean.push(dir);
    const file = join(dir, "config.json");
    writeFileSync(file, JSON.stringify({ mcpServers: {} }), "utf-8");
    const entry: InstallEntry = {
      tool: "claude",
      kind: "mcp-config",
      path: file,
      configKey: "mcpServers.idea-gauntlet",
      entrySha256: "abc",
    };
    expect(verifyEntry(entry)).toBe("missing");
  });
});

describe("verifyManifest", () => {
  it("returns statuses for all entries", () => {
    const dir = tmpDir();
    dirsToClean.push(dir);
    const file = join(dir, "test.md");
    writeFileSync(file, "hello", "utf-8");
    const manifest: InstallManifest = {
      version: "0.2.1",
      installedAt: "2026-01-01T00:00:00.000Z",
      packageRoot: "/pkg",
      entries: [
        {
          tool: "claude",
          kind: "file",
          path: file,
          mode: "copy",
          sha256: hashContent("hello"),
        },
        {
          tool: "claude",
          kind: "file",
          path: "/nonexistent",
          mode: "copy",
          sha256: "abc",
        },
      ],
    };
    const results = verifyManifest(manifest);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      entry: manifest.entries[0],
      status: "present",
    });
    expect(results[1]).toEqual({
      entry: manifest.entries[1],
      status: "missing",
    });
  });
});
