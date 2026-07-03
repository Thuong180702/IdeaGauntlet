import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { hashContent } from "./manifest.js";
import type { InstallFile, PlannedAction, PlanResult } from "./types.js";

export interface PlanOptions {
  force: boolean;
}

export function planSetupFiles(files: InstallFile[], options: PlanOptions): PlanResult {
  const actions: PlannedAction[] = [];

  for (const file of files) {
    if (!existsSync(file.path)) {
      actions.push({ type: "create", path: file.path, description: file.description, content: file.content });
      continue;
    }

    const existingContent = readFileSync(file.path, "utf-8");
    if (hashContent(existingContent) === hashContent(file.content)) {
      actions.push({ type: "identical", path: file.path, description: file.description, content: file.content });
      continue;
    }

    if (options.force) {
      actions.push({ type: "create", path: file.path, description: file.description, content: file.content });
    } else {
      actions.push({ type: "conflict", path: file.path, description: file.description, content: file.content });
    }
  }

  return {
    actions,
    hasChanges: actions.some((a) => a.type !== "identical"),
  };
}

export function applyPlannedActions(actions: PlannedAction[]): { ok: boolean; path: string; error?: string }[] {
  return actions
    .filter((a) => a.type === "create")
    .map((a) => {
      try {
        const dir = dirname(a.path);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(a.path, a.content, "utf-8");
        return { ok: true, path: a.path };
      } catch (err) {
        return { ok: false, path: a.path, error: String(err) };
      }
    });
}
