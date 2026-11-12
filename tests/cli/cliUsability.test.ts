/**
 * End-to-end checks of the CLI entry point as a first-time user hits it:
 * no arguments, typos, usage errors, stdin input. Runs the TypeScript entry
 * via tsx so it does not depend on a prior build.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const TSX = join(ROOT, "node_modules/tsx/dist/cli.mjs");
const ENTRY = join(ROOT, "src/cli/index.ts");
const CWD = mkdtempSync(join(tmpdir(), "ig-cli-"));

function run(args: string[], opts: { input?: string; env?: Record<string, string> } = {}) {
  const env: Record<string, string | undefined> = { ...process.env, IDEAGAUNTLET_QUIET: "1", ...opts.env };
  for (const key of ["IDEAGAUNTLET_API_KEY", "ANTHROPIC_API_KEY", "GROQ_API_KEY", "IDEAGAUNTLET_PROVIDER", "IDEAGAUNTLET_LANG"]) {
    if (!opts.env?.[key]) delete env[key];
  }
  const res = spawnSync(process.execPath, [TSX, ENTRY, ...args], {
    cwd: CWD,
    env: env as NodeJS.ProcessEnv,
    input: opts.input ?? "",
    encoding: "utf-8",
    timeout: 30_000,
  });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

describe("CLI usability", () => {
  it("prints a getting-started screen when run with no arguments", () => {
    const r = run([]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Start here:");
    expect(r.stdout).toContain("idea-gauntlet quick");
  }, 40_000);

  it("reports an unknown command and suggests the closest one", () => {
    const r = run(["quik", "an idea"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("Unknown command: quik");
    expect(r.stderr).toContain("idea-gauntlet quick");
  }, 40_000);

  it("turns usage errors into one line plus a help pointer, not a stack trace", () => {
    const missing = run(["quick"]);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("missing required args");
    expect(missing.stderr).toContain("idea-gauntlet quick --help");
    expect(missing.stderr).not.toContain("    at ");

    const unknown = run(["gtm", "idea", "--bogus"]);
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain("Unknown option `--bogus`");
    expect(unknown.stderr).not.toContain("    at ");
  }, 60_000);

  it("explains how to configure a provider when none is set (non-interactive)", () => {
    const r = run(["court", "an idea"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("No provider configured");
  }, 40_000);

  it("rejects an unsupported --lang on any analysis command", () => {
    const r = run(["gtm", "an idea", "--lang", "xx"], { env: { IDEAGAUNTLET_API_KEY: "test-key" } });
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('Unsupported language "xx"');
  }, 40_000);

  it("reads the idea from stdin with '-' and fails clearly when stdin is empty", () => {
    const r = run(["gtm", "-"], { env: { IDEAGAUNTLET_API_KEY: "test-key" } });
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("Stdin was empty");
  }, 40_000);
});
