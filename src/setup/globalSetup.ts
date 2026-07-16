import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { detectAllTools } from "./detectTools.js";
import { planSetupFiles } from "./planSetupFiles.js";
import { readManifest, writeManifest, hashContent, verifyEntry } from "./manifest.js";
import { warnIfError } from "../utils/warn.js";
import {
  getManifestPath,
  getMcpConfigPath,
  getClaudeDesktopConfigPath,
  getIdeaGauntletConfigHome,
  mapIntegrationFileToGlobalPath,
} from "./paths.js";
import { generateClaudeSkills } from "../integrations/claude/generateSkills.js";
import { generateClaudeAgents } from "../integrations/claude/generateAgents.js";
import { generateClaudeCommands } from "../integrations/claude/generateCommands.js";
import { generateCodexConfig } from "../integrations/codex/generateAgentsMd.js";
import { generateCursorRules } from "../integrations/cursor/generateCursorRules.js";
import type {
  ToolDetectionContext,
  InstallFile,
  InstallEntry,
  InstallManifest,
  PlannedAction,
} from "./types.js";

export interface GlobalSetupOptions {
  mode: "install" | "remove" | "status";
  force: boolean;
  flags: Record<string, unknown>;
}

export interface GlobalSetupSummary {
  created: number;
  updated: number;
  removed: number;
  alreadyInstalled: number;
  conflicts: number;
  skipped: number;
  errors: string[];
}

function resolvePackageRoot(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // When bundled by tsup, the module is at dist/ (go up 1 level).
  // In source (tsx dev), it's at src/setup/ (go up 2 levels).
  const base = __dirname.replace(/[/\\]$/, "");
  if (base.endsWith("dist")) return resolve(__dirname, "..");
  return resolve(__dirname, "..", "..");
}

export function resolveMcpCliPath(packageRoot: string): string {
  return resolve(packageRoot, "dist", "cli", "index.js");
}

function generateMcpEntryJson(nodePath: string, cliPath: string): object {
  return {
    command: nodePath,
    args: [cliPath, "mcp"],
  };
}

function buildMcpStandaloneFile(configHome: string, nodePath: string, cliPath: string): InstallFile {
  const mcpEntry = generateMcpEntryJson(nodePath, cliPath);
  return {
    path: getMcpConfigPath(configHome),
    content: JSON.stringify({ mcpServers: { "idea-gauntlet": mcpEntry } }, null, 2),
    description: "MCP standalone config",
  };
}

async function getMcpConfigPlan(
  _toolRoot: string | undefined,
  configHome: string,
  nodePath: string,
  cliPath: string,
  _force: boolean,
): Promise<{ files: InstallFile[]; mcpConfigEntry: InstallEntry | null }> {
  const files: InstallFile[] = [];
  let mcpConfigEntry: InstallEntry | null = null;

  // Standalone MCP config (always written under idea-gauntlet config home)
  const standaloneFile = buildMcpStandaloneFile(configHome, nodePath, cliPath);
  files.push(standaloneFile);
  mcpConfigEntry = {
    tool: "mcp",
    kind: "file",
    path: standaloneFile.path,
    mode: "copy",
    sha256: hashContent(standaloneFile.content),
  };

  return { files, mcpConfigEntry };
}

async function handleMcpClaudeConfig(
  claudeRoot: string,
  nodePath: string,
  cliPath: string,
  force: boolean,
): Promise<{ action: PlannedAction | null; entry: InstallEntry | null }> {
  const configPath = getClaudeDesktopConfigPath(claudeRoot);
  const mcpEntry = generateMcpEntryJson(nodePath, cliPath);
  const mcpEntryJson = JSON.stringify(mcpEntry);
  const mcpEntryHash = hashContent(mcpEntryJson);

  let existingConfig: any = {};
  let existingEntry: any = null;

  if (existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(readFileSync(configPath, "utf-8"));
      existingEntry = existingConfig?.mcpServers?.["idea-gauntlet"];
    } catch (err: any) {
      warnIfError(`globalSetup: failed to parse Claude config ${configPath}`, err);
      existingConfig = {};
    }
  }

  const configExists = existingEntry !== undefined && existingEntry !== null;

  if (!configExists) {
    // Add entry
    const newConfig = { ...existingConfig };
    if (!newConfig.mcpServers) newConfig.mcpServers = {};
    newConfig.mcpServers["idea-gauntlet"] = mcpEntry;
    const content = JSON.stringify(newConfig, null, 2);
    return {
      action: { type: "create", path: configPath, content, description: "Claude Code MCP config entry" },
      entry: { tool: "claude", kind: "mcp-config", path: configPath, configKey: "mcpServers.idea-gauntlet", entrySha256: mcpEntryHash },
    };
  }

  // Exists — compare
  const existingEntryHash = hashContent(JSON.stringify(existingEntry));
  if (existingEntryHash === mcpEntryHash) {
    return {
      action: { type: "identical", path: configPath, content: "", description: "Claude Code MCP config entry (already installed)" },
      entry: { tool: "claude", kind: "mcp-config", path: configPath, configKey: "mcpServers.idea-gauntlet", entrySha256: mcpEntryHash },
    };
  }

  // Different
  if (!force) {
    return {
      action: { type: "conflict", path: configPath, content: "", description: "Claude Code MCP config entry differs" },
      entry: null,
    };
  }

  // Force update
  const newConfig = { ...existingConfig };
  newConfig.mcpServers["idea-gauntlet"] = mcpEntry;
  const content = JSON.stringify(newConfig, null, 2);
  return {
    action: { type: "create", path: configPath, content, description: "Claude Code MCP config entry (updated)" },
    entry: { tool: "claude", kind: "mcp-config", path: configPath, configKey: "mcpServers.idea-gauntlet", entrySha256: mcpEntryHash },
  };
}

function getGeneratorFiles(tool: string): InstallFile[] {
  switch (tool) {
    case "claude":
      return [...generateClaudeSkills(), ...generateClaudeAgents(), ...generateClaudeCommands()];
    case "codex":
      return generateCodexConfig();
    case "cursor":
      return generateCursorRules();
    default:
      return [];
  }
}

function buildPerToolFiles(tool: string, detectedRoot: string): InstallFile[] {
  const generated = getGeneratorFiles(tool);
  return generated.map((f) => ({
    path: mapIntegrationFileToGlobalPath(tool, f.path, detectedRoot),
    content: f.content,
    description: f.description,
  }));
}

function verifyManifestWritable(configHome: string): true {
  const manifestPath = getManifestPath(configHome);
  const dir = dirname(manifestPath);
  // Check if directory is writable by trying to create and remove a temp file
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const testFile = resolve(dir, ".write-test");
    writeFileSync(testFile, "test", "utf-8");
    unlinkSync(testFile);
    return true;
  } catch (err) {
    throw new Error(
      `Cannot write manifest to ${manifestPath}: ${err}. ` +
      `Set IDEAGAUNTLET_CONFIG_HOME to a writable directory.`
    );
  }
}

function rollbackFiles(writtenPaths: string[], backups: Map<string, string>): void {
  for (const p of writtenPaths) {
    try {
      if (backups.has(p)) {
        // Restore original content if we overwrote an existing file
        writeFileSync(p, backups.get(p)!, "utf-8");
      } else if (existsSync(p)) {
        // Only delete files we created new (no backup = no pre-existing file)
        unlinkSync(p);
      }
    } catch (err: any) {
      // Best-effort rollback
      warnIfError(`globalSetup: rollback failed for ${p}`, err);
    }
  }
}

export async function globalSetup(options: GlobalSetupOptions): Promise<GlobalSetupSummary> {
  const summary: GlobalSetupSummary = { created: 0, updated: 0, removed: 0, alreadyInstalled: 0, conflicts: 0, skipped: 0, errors: [] };

  const configHome = getIdeaGauntletConfigHome(process.platform, process.env, options.flags);

  if (options.mode === "install") {
    // Pre-verify manifest writability
    verifyManifestWritable(configHome);

    const ctx: ToolDetectionContext = {
      platform: process.platform,
      env: process.env,
      flags: options.flags,
      configHome,
    };

    const detectionResults = detectAllTools(ctx);
    const nodePath = process.execPath;
    const packageRoot = resolvePackageRoot();
    const cliPath = resolveMcpCliPath(packageRoot);

    const allEntries: InstallEntry[] = [];
    const planActions: PlannedAction[] = [];
    const writtenPaths: string[] = [];
    const backups: Map<string, string> = new Map(); // path -> original content for rollback

    // Read existing manifest to preserve entries for conflict/skipped files
    const existingManifest = readManifest(getManifestPath(configHome));
    const existingEntriesByPath = new Map<string, InstallEntry>();
    if (existingManifest) {
      for (const entry of existingManifest.entries) {
        existingEntriesByPath.set(entry.path, entry);
      }
    }

    for (const [tool, result] of detectionResults) {
      if (!result.detected) {
        summary.skipped++;
        continue;
      }

      if (tool === "mcp") {
        const { files, mcpConfigEntry } = await getMcpConfigPlan(undefined, configHome, nodePath, cliPath, options.force);
        if (mcpConfigEntry) allEntries.push(mcpConfigEntry);
        for (const f of files) {
          const plan = planSetupFiles([f], { force: options.force });
          planActions.push(...plan.actions);
        }
        continue;
      }

      // Claude, Codex, Cursor: generate integration files
      const toolFiles = buildPerToolFiles(tool, result.root);
      const plan = planSetupFiles(toolFiles, { force: options.force });
      planActions.push(...plan.actions);

      // Create manifest entries for planned files
      for (const action of plan.actions) {
        if (action.type === "create") {
          const f = toolFiles.find((tf) => tf.path === action.path);
          if (f) {
            allEntries.push({
              tool,
              kind: "file",
              path: f.path,
              mode: "copy",
              sha256: hashContent(f.content),
            });
          }
        } else if (action.type === "identical") {
          allEntries.push({
            tool,
            kind: "file",
            path: action.path,
            mode: "copy",
            sha256: hashContent(action.content),
          });
        } else if (action.type === "conflict") {
          // Preserve existing manifest entry for conflict files
          const existing = existingEntriesByPath.get(action.path);
          if (existing) allEntries.push(existing);
        }
      }

      // Claude-specific MCP config
      if (tool === "claude" && result.detected) {
        const mcpClaude = await handleMcpClaudeConfig(result.root, nodePath, cliPath, options.force);
        if (mcpClaude.action && mcpClaude.action.type !== "conflict") {
          planActions.push(mcpClaude.action);
        }
        if (mcpClaude.entry) {
          allEntries.push(mcpClaude.entry);
        } else if (mcpClaude.action?.type === "conflict") {
          // Preserve existing manifest entry for MCP conflict
          const existing = existingEntriesByPath.get(getClaudeDesktopConfigPath(result.root));
          if (existing) allEntries.push(existing);
        }
      }
    }

    // Apply create actions with backup for existing files, counting during the process
    for (const action of planActions) {
      if (action.type !== "create") continue;
      try {
        const isUpdate = existsSync(action.path);
        if (isUpdate) {
          backups.set(action.path, readFileSync(action.path, "utf-8"));
        }
        const dir = dirname(action.path);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(action.path, action.content, "utf-8");
        writtenPaths.push(action.path);
        if (isUpdate) summary.updated++;
        else summary.created++;
      } catch (err) {
        summary.errors.push(`Failed to write ${action.path}: ${err}`);
      }
    }

    // Count non-create actions
    for (const action of planActions) {
      if (action.type === "identical") summary.alreadyInstalled++;
      else if (action.type === "conflict") summary.conflicts++;
    }

    // Write manifest (blocking -- rollback on failure)
    const manifest: InstallManifest = {
      version: "0.2.1",
      installedAt: new Date().toISOString(),
      packageRoot,
      entries: allEntries,
    };

    try {
      writeManifest(getManifestPath(configHome), manifest);
    } catch (err) {
      // Rollback: restore backups, remove newly-created files
      rollbackFiles(writtenPaths, backups);
      throw new Error(
        `Failed to write install manifest at ${getManifestPath(configHome)}. ` +
        `All changes have been rolled back. Error: ${err}`
      );
    }

    return summary;
  }

  if (options.mode === "remove") {
    const manifestPath = getManifestPath(configHome);
    const manifest = readManifest(manifestPath);

    if (!manifest) {
      summary.skipped = 1;
      summary.errors.push("No install manifest found. Nothing to uninstall.");
      return summary;
    }

    const remainingEntries: InstallEntry[] = [];

    for (const entry of manifest.entries) {
      if (entry.kind === "file") {
        const status = verifyEntry(entry);
        if (status === "present") {
          try {
            unlinkSync(entry.path);
            summary.removed++;
          } catch (err) {
            summary.errors.push(`Failed to remove ${entry.path}: ${err}`);
          }
        } else if (status === "modified") {
          if (options.force) {
            try {
              unlinkSync(entry.path);
              summary.removed++;
            } catch (err) {
              summary.errors.push(`Failed to remove ${entry.path}: ${err}`);
            }
          } else {
            summary.skipped++;
            summary.errors.push(`${entry.path} was modified since install. Use --force to remove.`);
            remainingEntries.push(entry); // Keep tracking modified files
          }
        } else {
          summary.skipped++;
          // missing file -- don't keep in manifest
        }
      } else if (entry.kind === "mcp-config") {
        if (!existsSync(entry.path)) {
          summary.skipped++;
          continue;
        }
        try {
          const raw = readFileSync(entry.path, "utf-8");
          const config = JSON.parse(raw);
          if (config?.mcpServers?.["idea-gauntlet"]) {
            delete config.mcpServers["idea-gauntlet"];
            // Remove mcpServers if empty
            if (Object.keys(config.mcpServers).length === 0) {
              delete config.mcpServers;
            }
            writeFileSync(entry.path, JSON.stringify(config, null, 2), "utf-8");
            summary.removed++;
          } else {
            summary.skipped++;
          }
        } catch (err) {
          summary.errors.push(`Failed to update MCP config ${entry.path}: ${err}`);
        }
      }
    }

    // Only delete manifest if no entries remain
    if (remainingEntries.length === 0) {
      try {
        if (existsSync(manifestPath)) unlinkSync(manifestPath);
      } catch (err) {
        summary.errors.push(`Failed to remove manifest: ${err}`);
      }
    } else {
      // Write back remaining entries
      const updatedManifest = { ...manifest, entries: remainingEntries, installedAt: new Date().toISOString() };
      try {
        writeManifest(manifestPath, updatedManifest);
      } catch (err) {
        summary.errors.push(`Failed to update manifest with remaining entries: ${err}`);
      }
    }

    return summary;
  }

  if (options.mode === "status") {
    const manifestPath = getManifestPath(configHome);
    const manifest = readManifest(manifestPath);

    if (!manifest) {
      summary.skipped = 1;
      return summary;
    }

    // Verify each entry
    for (const entry of manifest.entries) {
      const status = verifyEntry(entry);
      if (status === "present") summary.alreadyInstalled++;
      else if (status === "modified") summary.conflicts++;
      else summary.skipped++;
    }

    return summary;
  }

  return summary;
}
