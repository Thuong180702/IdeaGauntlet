import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadWorkflowConfig, clearWorkflowConfigCache, applyScoreWeights, generateConfigTemplate } from "../../src/core/workflowConfig.js";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

describe("workflowConfig", () => {
  const testDir = resolve(tmpdir(), `ig-wf-config-test-${Date.now()}`);

  beforeEach(() => {
    clearWorkflowConfigCache();
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    clearWorkflowConfigCache();
  });

  it("returns empty config if no file exists", () => {
    const config = loadWorkflowConfig(testDir);
    expect(config).toEqual({});
  });

  it("loads and parses .ideagauntlet-workflow.json", () => {
    const configPath = resolve(testDir, ".ideagauntlet-workflow.json");
    writeFileSync(configPath, JSON.stringify({ scoreWeights: { pain: 3 } }), "utf-8");

    const config = loadWorkflowConfig(testDir);
    expect(config.scoreWeights?.pain).toBe(3);
  });

  it("reloads config when mtime changes on disk", async () => {
    const configPath = resolve(testDir, ".ideagauntlet-workflow.json");
    writeFileSync(configPath, JSON.stringify({ scoreWeights: { pain: 1 } }), "utf-8");

    let config = loadWorkflowConfig(testDir);
    expect(config.scoreWeights?.pain).toBe(1);

    // Wait a tiny bit and overwrite file to update mtime
    await new Promise((r) => setTimeout(r, 20));
    writeFileSync(configPath, JSON.stringify({ scoreWeights: { pain: 3 } }), "utf-8");

    config = loadWorkflowConfig(testDir);
    expect(config.scoreWeights?.pain).toBe(3);
  });

  it("applies score weights correctly with 1-3 multipliers", () => {
    const original = { clarity: 6, pain: 6, differentiation: 6 };
    // weight 2 (1.0x) -> 6; weight 3 (1.5x) -> 9; weight 1 (0.5x) -> 3
    const weighted = applyScoreWeights(original, { clarity: 2, pain: 3, differentiation: 1 });
    expect(weighted.clarity).toBe(6);
    expect(weighted.pain).toBe(9);
    expect(weighted.differentiation).toBe(3);
  });

  it("generates valid config template string", () => {
    const template = generateConfigTemplate();
    expect(typeof template).toBe("string");
    const parsed = JSON.parse(template);
    expect(parsed.scoreWeights).toBeDefined();
    expect(parsed.customRoles).toBeDefined();
  });
});
