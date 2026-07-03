import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { planSetupFiles, applyPlannedActions } from "../../src/setup/planSetupFiles.js";
import type { InstallFile } from "../../src/setup/types.js";

function tmpDir(): string {
  const d = join(tmpdir(), `ig-plan-test-${Date.now()}`);
  mkdirSync(d, { recursive: true });
  return d;
}

describe("planSetupFiles", () => {
  it("returns 'create' for missing file", () => {
    const dir = tmpDir();
    const files: InstallFile[] = [{ path: join(dir, "new.md"), content: "hello", description: "test file" }];
    const plan = planSetupFiles(files, { force: false });
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].type).toBe("create");
    expect(plan.hasChanges).toBe(true);
  });

  it("returns 'identical' for file with same content", () => {
    const dir = tmpDir();
    const filePath = join(dir, "same.md");
    writeFileSync(filePath, "hello", "utf-8");
    const files: InstallFile[] = [{ path: filePath, content: "hello", description: "same" }];
    const plan = planSetupFiles(files, { force: false });
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].type).toBe("identical");
    expect(plan.hasChanges).toBe(false);
  });

  it("returns 'conflict' for file with different content without --force", () => {
    const dir = tmpDir();
    const filePath = join(dir, "diff.md");
    writeFileSync(filePath, "original", "utf-8");
    const files: InstallFile[] = [{ path: filePath, content: "modified", description: "diff" }];
    const plan = planSetupFiles(files, { force: false });
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].type).toBe("conflict");
  });

  it("returns 'create' for conflict with --force", () => {
    const dir = tmpDir();
    const filePath = join(dir, "force.md");
    writeFileSync(filePath, "original", "utf-8");
    const files: InstallFile[] = [{ path: filePath, content: "modified", description: "force" }];
    const plan = planSetupFiles(files, { force: true });
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].type).toBe("create");
  });
});

describe("applyPlannedActions", () => {
  it("creates files for create actions", () => {
    const dir = tmpDir();
    const filePath = join(dir, "apply.md");
    const actions = [{ type: "create" as const, path: filePath, content: "applied", description: "test" }];
    const results = applyPlannedActions(actions);
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(true);
    expect(existsSync(filePath)).toBe(true);
  });
});
