import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig, mergeConfig } from "../../src/utils/config.js";

describe("config", () => {
  const scratchDir = resolve(process.cwd(), "tests/scratch_config");
  const configFile = resolve(scratchDir, ".ideagauntlet.json");

  beforeEach(() => {
    if (existsSync(scratchDir)) rmSync(scratchDir, { recursive: true, force: true });
    mkdirSync(scratchDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(scratchDir)) rmSync(scratchDir, { recursive: true, force: true });
  });

  it("returns empty object when no config file found", () => {
    const config = loadConfig(scratchDir);
    expect(config).toEqual({});
  });

  it("loads .ideagauntlet.json", () => {
    writeFileSync(configFile, JSON.stringify({ model: "gpt-4", enableSearch: true }), "utf-8");
    const config = loadConfig(scratchDir);
    expect(config.model).toBe("gpt-4");
    expect(config.enableSearch).toBe(true);
  });

  it("handles invalid JSON gracefully", () => {
    writeFileSync(configFile, "not valid json{{{", "utf-8");
    const config = loadConfig(scratchDir);
    expect(config).toEqual({});
  });

  it("handles empty file gracefully", () => {
    writeFileSync(configFile, "", "utf-8");
    const config = loadConfig(scratchDir);
    expect(config).toEqual({});
  });

  it("merges config with CLI options — CLI takes precedence", () => {
    const config = { model: "gpt-4", outputFormat: "md" as const };
    const cli = { model: "claude-3", quiet: true };
    const merged = mergeConfig(config, cli);
    expect(merged.model).toBe("claude-3"); // CLI wins
    expect(merged.outputFormat).toBe("md"); // from config
    expect(merged.quiet).toBe(true); // from CLI
  });

  it("preserves config values not overridden by CLI", () => {
    const config = { baseUrl: "http://localhost:11434", ollama: true };
    const cli = { model: "llama3" };
    const merged = mergeConfig(config, cli);
    expect(merged.baseUrl).toBe("http://localhost:11434");
    expect(merged.ollama).toBe(true);
  });
});
