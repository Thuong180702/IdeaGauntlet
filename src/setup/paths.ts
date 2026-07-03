import { join } from "node:path";

/**
 * Resolve the IdeaGauntlet config home directory.
 *
 * Precedence: CLI flag > env var > OS standard path.
 * Accepted flag forms: --config-home, --configHome, --confighome
 */
export function getIdeaGauntletConfigHome(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  flags: Record<string, unknown>,
): string {
  // Check all accepted flag forms
  const flagVal =
    (typeof flags["config-home"] === "string" ? flags["config-home"] : undefined) ??
    (typeof flags.configHome === "string" ? flags.configHome : undefined) ??
    (typeof flags.confighome === "string" ? flags.confighome : undefined);

  if (flagVal !== undefined && flagVal.length > 0) return flagVal;

  const envVal = env["IDEAGAUNTLET_CONFIG_HOME"];
  if (envVal !== undefined && envVal.length > 0) return envVal;

  if (platform === "win32") {
    const appData = env["APPDATA"];
    if (appData) return join(appData, "idea-gauntlet");
  } else if (platform === "darwin") {
    const home = env["HOME"];
    if (home) return join(home, "Library", "Application Support", "idea-gauntlet");
  } else {
    // linux, android, freebsd, etc.
    const xdg = env["XDG_CONFIG_HOME"];
    if (xdg) return join(xdg, "idea-gauntlet");
    const home = env["HOME"];
    if (home) return join(home, ".config", "idea-gauntlet");
  }

  // Ultimate fallback — when HOME is also missing return a relative path
  return join(env["HOME"] || "", ".config", "idea-gauntlet");
}

/**
 * Return the default root directory for a given tool, or null when the
 * platform/path cannot be determined.
 *
 * Supports env-var overrides per tool:
 *   - codex: CODEX_DIR, CODEX_CONFIG_DIR
 */
export function getDefaultToolPath(
  tool: string,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): string | null {
  switch (tool) {
    case "claude": {
      if (platform === "win32") {
        const appData = env["APPDATA"];
        return appData ? join(appData, "Claude") : null;
      }
      const home = env["HOME"];
      return home ? join(home, ".claude") : null;
    }
    case "codex": {
      const envDir = env["CODEX_DIR"] || env["CODEX_CONFIG_DIR"];
      if (envDir) return envDir;
      const home = env["HOME"];
      return home ? join(home, ".codex") : null;
    }
    case "cursor": {
      if (platform === "win32") {
        const appData = env["APPDATA"];
        return appData ? join(appData, "Cursor") : null;
      }
      const home = env["HOME"];
      return home ? join(home, ".cursor") : null;
    }
    default:
      return null;
  }
}

/**
 * Map a generated integration file path to its destination inside a tool's
 * detected root directory.
 *
 * Strips tool-specific prefixes so that generated files land in the correct
 * sub-directory of the tool's root.
 */
export function mapIntegrationFileToGlobalPath(
  tool: string,
  generatedPath: string,
  detectedRoot: string,
): string {
  switch (tool) {
    case "claude":
      // Generated: .claude/skills/..., .claude/agents/...
      // Global:   <detectedRoot>/skills/..., <detectedRoot>/agents/...
      return join(detectedRoot, generatedPath.replace(/^\.claude\//, ""));
    case "codex":
      // Generated: AGENTS.md, .codex/config.toml
      // Global:   <detectedRoot>/AGENTS.md, <detectedRoot>/.codex/config.toml
      return join(detectedRoot, generatedPath);
    case "cursor":
      // Generated: .cursor/rules/...
      // Global:   <detectedRoot>/rules/...
      return join(detectedRoot, generatedPath.replace(/^\.cursor\//, ""));
    default:
      return join(detectedRoot, generatedPath);
  }
}

/** Path to the MCP configuration file inside the config home. */
export function getMcpConfigPath(configHome: string): string {
  return join(configHome, "mcp-config.json");
}

/** Path to the install manifest file inside the config home. */
export function getManifestPath(configHome: string): string {
  return join(configHome, "install-manifest.json");
}

/**
 * Path to the Claude Desktop config file inside the tool's detected root
 * (e.g. claude_desktop_config.json inside %APPDATA%/Claude or ~/.claude).
 */
export function getClaudeDesktopConfigPath(detectedRoot: string): string {
  return join(detectedRoot, "claude_desktop_config.json");
}
