import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  getIdeaGauntletConfigHome,
  getDefaultToolPath,
  mapIntegrationFileToGlobalPath,
  getMcpConfigPath,
  getManifestPath,
  getClaudeDesktopConfigPath,
} from "../../src/setup/paths.js";

// ---------------------------------------------------------------------------
// getIdeaGauntletConfigHome
// ---------------------------------------------------------------------------
describe("getIdeaGauntletConfigHome", () => {
  it("uses IDEAGAUNTLET_CONFIG_HOME env var when set", () => {
    const result = getIdeaGauntletConfigHome(
      "win32",
      { IDEAGAUNTLET_CONFIG_HOME: "D:\\custom\\ig" },
      {},
    );
    expect(result).toBe("D:\\custom\\ig");
  });

  it("uses --config-home flag over env var", () => {
    const result = getIdeaGauntletConfigHome(
      "win32",
      { IDEAGAUNTLET_CONFIG_HOME: "D:\\env\\ig" },
      { "config-home": "D:\\flag\\ig" },
    );
    expect(result).toBe("D:\\flag\\ig");
  });

  it("accepts --configHome camelCase flag form", () => {
    const result = getIdeaGauntletConfigHome("linux", {}, { configHome: "/opt/ig" });
    expect(result).toBe("/opt/ig");
  });

  it("accepts --confighome lowercase flag form", () => {
    const result = getIdeaGauntletConfigHome("linux", {}, { confighome: "/opt/ig" });
    expect(result).toBe("/opt/ig");
  });

  it("flag takes precedence over env var across all three forms", () => {
    const env = { IDEAGAUNTLET_CONFIG_HOME: "/env/path" };
    expect(getIdeaGauntletConfigHome("linux", env, { "config-home": "/flag1" })).toBe("/flag1");
    expect(getIdeaGauntletConfigHome("linux", env, { configHome: "/flag2" })).toBe("/flag2");
    expect(getIdeaGauntletConfigHome("linux", env, { confighome: "/flag3" })).toBe("/flag3");
  });

  it("falls back to APPDATA on Windows", () => {
    const result = getIdeaGauntletConfigHome(
      "win32",
      { APPDATA: "C:\\Users\\me\\AppData\\Roaming" },
      {},
    );
    expect(result).toBe(join("C:\\Users\\me\\AppData\\Roaming", "idea-gauntlet"));
  });

  it("falls back to XDG_CONFIG_HOME on Linux", () => {
    const result = getIdeaGauntletConfigHome(
      "linux",
      { XDG_CONFIG_HOME: "/home/me/.config" },
      {},
    );
    expect(result).toBe(join("/home/me/.config", "idea-gauntlet"));
  });

  it("falls back to ~/.config on Linux without XDG", () => {
    const result = getIdeaGauntletConfigHome("linux", { HOME: "/home/me" }, {});
    expect(result).toBe(join("/home/me/.config", "idea-gauntlet"));
  });

  it("falls back to ~/Library/Application Support on macOS", () => {
    const result = getIdeaGauntletConfigHome("darwin", { HOME: "/Users/me" }, {});
    expect(result).toBe(join("/Users/me/Library/Application Support", "idea-gauntlet"));
  });

  it("handles empty flag string by falling through", () => {
    const result = getIdeaGauntletConfigHome(
      "win32",
      { APPDATA: "C:\\Roaming" },
      { "config-home": "" },
    );
    expect(result).toBe(join("C:\\Roaming", "idea-gauntlet"));
  });

  it("handles empty env var by falling through", () => {
    const result = getIdeaGauntletConfigHome(
      "win32",
      { IDEAGAUNTLET_CONFIG_HOME: "", APPDATA: "C:\\Roaming" },
      {},
    );
    expect(result).toBe(join("C:\\Roaming", "idea-gauntlet"));
  });

  it("returns a relative path when neither env nor OS vars are set", () => {
    const result = getIdeaGauntletConfigHome("linux", {}, {});
    // On any OS, join("", ".config", "idea-gauntlet") produces a relative path
    expect(result).toMatch(/.config[/\\]idea-gauntlet$/);
  });
});

// ---------------------------------------------------------------------------
// getDefaultToolPath
// ---------------------------------------------------------------------------
describe("getDefaultToolPath", () => {
  describe("claude", () => {
    it("returns APPDATA\\Claude on Windows", () => {
      const result = getDefaultToolPath("claude", "win32", {
        APPDATA: "C:\\Users\\me\\AppData\\Roaming",
      });
      expect(result).toBe(join("C:\\Users\\me\\AppData\\Roaming", "Claude"));
    });

    it("returns ~/.claude on macOS", () => {
      const result = getDefaultToolPath("claude", "darwin", { HOME: "/Users/me" });
      expect(result).toBe(join("/Users/me", ".claude"));
    });

    it("returns ~/.claude on Linux", () => {
      const result = getDefaultToolPath("claude", "linux", { HOME: "/home/me" });
      expect(result).toBe(join("/home/me", ".claude"));
    });

    it("returns null on Windows without APPDATA", () => {
      const result = getDefaultToolPath("claude", "win32", {});
      expect(result).toBeNull();
    });
  });

  describe("codex", () => {
    it("returns ~/.codex by default", () => {
      const result = getDefaultToolPath("codex", "linux", { HOME: "/home/me" });
      expect(result).toBe(join("/home/me", ".codex"));
    });

    it("honours CODEX_DIR env var", () => {
      const result = getDefaultToolPath("codex", "linux", {
        HOME: "/home/me",
        CODEX_DIR: "/custom/codex",
      });
      expect(result).toBe("/custom/codex");
    });

    it("honours CODEX_CONFIG_DIR env var", () => {
      const result = getDefaultToolPath("codex", "linux", {
        HOME: "/home/me",
        CODEX_CONFIG_DIR: "/custom/codex-config",
      });
      expect(result).toBe("/custom/codex-config");
    });
  });

  describe("cursor", () => {
    it("returns APPDATA\\Cursor on Windows", () => {
      const result = getDefaultToolPath("cursor", "win32", {
        APPDATA: "C:\\Users\\me\\AppData\\Roaming",
      });
      expect(result).toBe(join("C:\\Users\\me\\AppData\\Roaming", "Cursor"));
    });

    it("returns ~/.cursor on macOS", () => {
      const result = getDefaultToolPath("cursor", "darwin", { HOME: "/Users/me" });
      expect(result).toBe(join("/Users/me", ".cursor"));
    });

    it("returns ~/.cursor on Linux", () => {
      const result = getDefaultToolPath("cursor", "linux", { HOME: "/home/me" });
      expect(result).toBe(join("/home/me", ".cursor"));
    });
  });

  it("returns null for unknown tool", () => {
    const result = getDefaultToolPath("unknown", "linux", { HOME: "/home/me" });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapIntegrationFileToGlobalPath
// ---------------------------------------------------------------------------
describe("mapIntegrationFileToGlobalPath", () => {
  it("strips .claude/ prefix for claude tool", () => {
    const result = mapIntegrationFileToGlobalPath(
      "claude",
      ".claude/skills/gauntlet-quick/SKILL.md",
      "/home/me/.claude",
    );
    expect(result).toBe(join("/home/me/.claude", "skills/gauntlet-quick/SKILL.md"));
  });

  it("passes through for codex tool", () => {
    const result = mapIntegrationFileToGlobalPath(
      "codex",
      "AGENTS.md",
      "/home/me/.codex",
    );
    expect(result).toBe(join("/home/me/.codex", "AGENTS.md"));
  });

  it("strips .cursor/ prefix for cursor tool", () => {
    const result = mapIntegrationFileToGlobalPath(
      "cursor",
      ".cursor/rules/foo.mdc",
      "/home/me/.cursor",
    );
    expect(result).toBe(join("/home/me/.cursor", "rules/foo.mdc"));
  });

  it("keeps sub-path without leading dot-prefix for claude", () => {
    const result = mapIntegrationFileToGlobalPath(
      "claude",
      "skills/gauntlet-quick/SKILL.md",
      "/home/me/.claude",
    );
    expect(result).toBe(join("/home/me/.claude", "skills/gauntlet-quick/SKILL.md"));
  });

  it("handles codex with .codex/ prefix as pass-through", () => {
    const result = mapIntegrationFileToGlobalPath(
      "codex",
      ".codex/config.toml",
      "/home/me/.codex",
    );
    expect(result).toBe(join("/home/me/.codex", ".codex/config.toml"));
  });

  it("uses join for default/unknown tool", () => {
    const result = mapIntegrationFileToGlobalPath(
      "unknown",
      "some/file.txt",
      "/base",
    );
    expect(result).toBe(join("/base", "some/file.txt"));
  });
});

// ---------------------------------------------------------------------------
// getMcpConfigPath / getManifestPath / getClaudeDesktopConfigPath
// ---------------------------------------------------------------------------
describe("config and manifest path helpers", () => {
  it("getMcpConfigPath joins with mcp-config.json", () => {
    const base = "/home/me/.config/idea-gauntlet";
    expect(getMcpConfigPath(base)).toBe(join(base, "mcp-config.json"));
  });

  it("getManifestPath joins with install-manifest.json", () => {
    const base = "/home/me/.config/idea-gauntlet";
    expect(getManifestPath(base)).toBe(join(base, "install-manifest.json"));
  });

  it("getClaudeDesktopConfigPath joins with claude_desktop_config.json", () => {
    const base = "/home/me/.claude";
    expect(getClaudeDesktopConfigPath(base)).toBe(join(base, "claude_desktop_config.json"));
  });
});
