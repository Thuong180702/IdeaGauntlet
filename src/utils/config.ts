/**
 * Config file loader — reads `.ideagauntlet.json` from cwd or parent dirs.
 * Merges with environment variables and CLI flags (CLI > config > env > defaults).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { safeParseJSON } from "./jsonRepair.js";
import { warnIfError } from "./warn.js";

export interface IdeaGauntletConfig {
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  ollama?: boolean;
  defaultMode?: string;
  defaultStage?: string;
  enableSearch?: boolean;
  outputFormat?: "md" | "html" | "json";
  maxResults?: number;
  timeout?: number;
}

const CONFIG_FILENAMES = [".ideagauntlet.json", "ideagauntlet.json"];

/** Find and load config file, walking up from cwd. */
export function loadConfig(cwd: string = process.cwd()): IdeaGauntletConfig {
  let dir = resolve(cwd);
  let root = resolve(dir, "..");

  while (dir !== root) {
    for (const name of CONFIG_FILENAMES) {
      const path = resolve(dir, name);
      if (existsSync(path)) {
        try {
          const raw = readFileSync(path, "utf-8");
          const config = safeParseJSON<IdeaGauntletConfig>(raw, {});
          if (Object.keys(config).length === 0) {
            warnIfError(`config: ${name} is empty or invalid JSON`, undefined);
          }
          return config;
        } catch (err: any) {
          warnIfError(`config: failed to read ${path}`, err);
          return {};
        }
      }
    }
    dir = root;
    root = resolve(dir, "..");
  }

  return {};
}

/** Merge config with CLI options — CLI wins. */
export function mergeConfig(
  config: IdeaGauntletConfig,
  cliOptions: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...config };

  for (const [key, value] of Object.entries(cliOptions)) {
    if (value !== undefined && value !== false) {
      result[key] = value;
    }
  }

  return result;
}
