import { existsSync } from "node:fs";
import { getDefaultToolPath } from "./paths.js";
import type { ToolDetectionContext, ToolDetectionResult, ToolName } from "./types.js";

/**
 * Look up a tool directory from CLI flags.
 *
 * cac normalises `--claude-dir` to `flags.claudeDir`, but we also
 * accept the raw hyphenated form and the flattened form.
 */
function getFlag(ctx: ToolDetectionContext, tool: string): string | undefined {
  const normalized = tool + "Dir";
  const hyphenated = tool + "-dir";
  const flattened = tool.replace(/-/g, "") + "dir";
  const val = ctx.flags[hyphenated] || ctx.flags[normalized] || ctx.flags[flattened];
  return typeof val === "string" && val.length > 0 ? val : undefined;
}

/**
 * Look up a tool directory from the environment.
 *
 * The env var key is `IDEAGAUNTLET_{TOOL}_DIR` (e.g. `IDEAGAUNTLET_CLAUDE_DIR`).
 */
function getEnv(ctx: ToolDetectionContext, tool: string): string | undefined {
  const envKey = `IDEAGAUNTLET_${tool.toUpperCase()}_DIR`;
  const val = ctx.env[envKey];
  return val && val.length > 0 ? val : undefined;
}

/**
 * Detect a single tool's integration directory.
 *
 * Resolution order (first wins):
 *   1. CLI flag  (`--claude-dir`, `--codex-dir`, `--cursor-dir`)
 *   2. Env var   (`IDEAGAUNTLET_CLAUDE_DIR`, etc.)
 *   3. Standard OS path that already exists on disk
 *   4. Not found (skip)
 */
export function detectTool(tool: ToolName, ctx: ToolDetectionContext): ToolDetectionResult {
  // 1. Flag override — always accepts, may imply intent to create
  const flagVal = getFlag(ctx, tool);
  if (flagVal) {
    return { detected: true, root: flagVal, source: "flag" };
  }

  // 2. Env override — always accepts
  const envVal = getEnv(ctx, tool);
  if (envVal) {
    return { detected: true, root: envVal, source: "env" };
  }

  // 3. Standard OS path — only if the directory already exists on disk
  const standardPath = getDefaultToolPath(tool, ctx.platform, ctx.env);
  if (standardPath && existsSync(standardPath)) {
    return { detected: true, root: standardPath, source: "standard" };
  }

  // 4. Not found — hint the user how to set one
  const hint = `Pass --${tool}-dir or set IDEAGAUNTLET_${tool.toUpperCase()}_DIR to install manually.`;
  return { detected: false, reason: `Tool directory not found. ${hint}` };
}

/**
 * Detect all supported tools and return a map of results.
 *
 * Always includes an entry for `mcp`, which uses the IdeaGauntlet config
 * home as its root and is always considered detected.
 */
export function detectAllTools(ctx: ToolDetectionContext): Map<string, ToolDetectionResult> {
  const tools: ToolName[] = ["claude", "codex", "cursor"];
  const results = new Map<string, ToolDetectionResult>();

  for (const tool of tools) {
    results.set(tool, detectTool(tool, ctx));
  }

  // MCP is always detected — it uses IdeaGauntlet's own config home
  results.set("mcp", { detected: true, root: ctx.configHome, source: "standard" });

  return results;
}
