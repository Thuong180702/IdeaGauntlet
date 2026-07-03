import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createInterface } from "node:readline/promises";
import type { IntegrationFile, ConflictAction } from "../integrations/types.js";
import { generateClaudeSkills } from "../integrations/claude/generateSkills.js";
import { generateClaudeAgents } from "../integrations/claude/generateAgents.js";
import { generateClaudeCommands } from "../integrations/claude/generateCommands.js";
import { generateCursorRules } from "../integrations/cursor/generateCursorRules.js";
import { generateCodexConfig } from "../integrations/codex/generateAgentsMd.js";
import { planSetupFiles, applyPlannedActions } from "./planSetupFiles.js";

type TargetGroup = { key: string; label: string; files: IntegrationFile[] };

const ALL_GROUPS: TargetGroup[] = [
  { key: "claude-skills", label: "Claude Code skills", files: generateClaudeSkills() },
  { key: "claude-agents", label: "Claude Code agents", files: generateClaudeAgents() },
  { key: "claude-commands", label: "Claude Code commands", files: generateClaudeCommands() },
  { key: "cursor", label: "Cursor rules", files: generateCursorRules() },
  { key: "codex", label: "Codex AGENTS.md + config", files: generateCodexConfig() },
];

export async function projectSetup(options: Record<string, unknown>): Promise<void> {
  const all = !!options.all;
  const dryRun = !!(options["dry-run"] ?? options.dryRun);
  const force = !!options.force;
  const isStatus = !!(options.status);
  const targets = (options.targets as string) ?? (all ? ALL_GROUPS.map((g) => g.key).join(",") : "");

  const selected = ALL_GROUPS.filter((g) => targets.split(",").map((s) => s.trim()).includes(g.key));
  if (selected.length === 0) {
    console.log("No integration targets selected. Use --all or --targets.");
    console.log("Available: " + ALL_GROUPS.map((g) => g.key).join(", "));
    return;
  }

  // Resolve paths relative to project cwd
  const projectRoot = process.cwd();
  const allFiles: IntegrationFile[] = selected.flatMap((g) => g.files);
  const installFiles = allFiles.map((f) => ({
    path: resolve(projectRoot, f.path),
    content: f.content,
    description: f.description,
  }));

  // --status: show project-local integration status
  if (isStatus) {
    console.log("\nProject integration status\n");
    for (const g of selected) {
      if (g.files.length === 0) continue;
      console.log(`  ${g.label}:`);
      for (const f of g.files) {
        const fullPath = resolve(projectRoot, f.path);
        const exists = existsSync(fullPath);
        const icon = exists ? "✓" : " ";
        const status = exists ? "installed" : "missing";
        console.log(`    ${icon} ${f.path}  (${status})`);
      }
      console.log("");
    }
    return;
  }

  if (dryRun) {
    console.log("\nDry run — files that would be processed:\n");
    const plan = planSetupFiles(installFiles, { force });
    for (const action of plan.actions) {
      const icon = action.type === "create" ? " " : action.type === "identical" ? "✓" : "⚠";
      const label = action.type === "create"
        ? "would create"
        : action.type === "identical"
        ? "already installed"
        : "conflict, skipped";
      console.log(`    ${icon} ${action.path}  (${label})`);
    }
    const wouldWrite = plan.actions.filter((a) => a.type === "create").length;
    const same = plan.actions.filter((a) => a.type === "identical").length;
    const conflict = plan.actions.filter((a) => a.type === "conflict").length;
    console.log(`\n${wouldWrite} would be created, ${same} already installed, ${conflict} conflicts.`);
    return;
  }

  // Non-interactive mode (--all or --force): use the shared planner
  if (force || all) {
    const plan = planSetupFiles(installFiles, { force });
    const results = applyPlannedActions(plan.actions);

    let written = 0, skipped = 0, conflicts = 0;
    for (const action of plan.actions) {
      if (action.type === "create") written++;
      else if (action.type === "identical") skipped++;
      else if (action.type === "conflict") conflicts++;
    }

    // Report any apply errors
    for (const r of results) {
      if (!r.ok) console.error(`  ! Failed to write ${r.path}: ${r.error}`);
    }

    console.log(`\n${written} file(s) written, ${skipped} already installed, ${conflicts} conflicted.`);
    return;
  }

  // Interactive mode for non-force, non-all (existing behavior)
  let written = 0, skipped = 0;
  for (const f of allFiles) {
    const fullPath = resolve(projectRoot, f.path);
    const dir = dirname(fullPath);

    if (existsSync(fullPath)) {
      const action = await resolveConflict(f.path);
      if (action === "skip") { skipped++; continue; }
      if (action === "overwrite") { /* fall through */ }
      if (action === "sidecar") {
        const sidecarPath = fullPath + ".idea-gauntlet";
        mkdirSync(dirname(sidecarPath), { recursive: true });
        writeFileSync(sidecarPath, f.content, "utf-8");
        written++;
        continue;
      }
      if (action === "append") {
        const existing = readFileSync(fullPath, "utf-8");
        writeFileSync(fullPath, existing + "\n\n<!-- IdeaGauntlet -->\n" + f.content, "utf-8");
        written++;
        continue;
      }
    }

    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, f.content, "utf-8");
    written++;
  }

  console.log(`\n${written} file(s) written, ${skipped} skipped.`);
}

async function resolveConflict(path: string): Promise<ConflictAction> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(`\nFile already exists: ${path}`);
  console.log("  [A] Append IdeaGauntlet section");
  console.log("  [B] Create sidecar file");
  console.log("  [C] Skip");
  console.log("  [D] Overwrite");
  const answer = (await rl.question("Choose (A/B/C/D): ")).trim().toLowerCase();
  rl.close();
  switch (answer) {
    case "a": return "append";
    case "b": return "sidecar";
    case "d": return "overwrite";
    default: return "skip";
  }
}
