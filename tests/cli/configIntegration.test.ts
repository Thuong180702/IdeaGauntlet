import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, mergeConfig } from "../../src/utils/config.js";

const TMP_DIR = join(process.cwd(), ".test-config-tmp");

describe("configIntegration", () => {
  beforeEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
    mkdirSync(TMP_DIR, { recursive: true });
  });

  it("loadConfig reads .ideagauntlet.json from cwd", () => {
    const configPath = join(TMP_DIR, ".ideagauntlet.json");
    writeFileSync(configPath, JSON.stringify({ model: "gpt-4o", baseUrl: "https://api.test.com/v1" }), "utf-8");

    const config = loadConfig(TMP_DIR);
    expect(config.model).toBe("gpt-4o");
    expect(config.baseUrl).toBe("https://api.test.com/v1");
  });

  it("loadConfig returns empty object when no config file", () => {
    const config = loadConfig(TMP_DIR);
    expect(config).toEqual({});
  });

  it("loadConfig handles invalid JSON gracefully", () => {
    const configPath = join(TMP_DIR, ".ideagauntlet.json");
    writeFileSync(configPath, "{ invalid json }", "utf-8");

    const config = loadConfig(TMP_DIR);
    expect(config).toEqual({});
  });

  it("mergeConfig — CLI overrides config, config fills gaps", () => {
    const config = { model: "gpt-4o", baseUrl: "https://api.test.com/v1", apiKey: "key123" };
    const cli = { model: "gpt-5", save: true };

    const merged = mergeConfig(config, cli);
    expect(merged.model).toBe("gpt-5"); // CLI wins
    expect(merged.save).toBe(true); // CLI-only
    expect(merged.baseUrl).toBe("https://api.test.com/v1"); // config-only
    expect(merged.apiKey).toBe("key123"); // config-only
  });

  it("mergeConfig — explicit false overrides config (BUG-07 fix)", () => {
    const config = { enableSearch: true };
    const cli = { enableSearch: false };

    const merged = mergeConfig(config, cli);
    // BUG-07: explicit false from CLI should override config (was previously skipped).
    expect(merged.enableSearch).toBe(false);
  });
});
