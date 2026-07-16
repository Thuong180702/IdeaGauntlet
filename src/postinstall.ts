import { execSync } from "child_process";
import { globalSetup } from "./setup/globalSetup.js";
import { warnIfError } from "./utils/warn.js";

/**
 * Run the postinstall integration setup.
 *
 * Performs a best-effort global integration install for detected
 * Claude Code, Codex, Cursor, and MCP-compatible configs.
 *
 * Also installs Playwright Chromium browser binary for headless web fetching.
 *
 * NEVER throws — errors are caught and printed as warnings so npm
 * install always succeeds regardless of integration setup outcome.
 */
export async function runPostinstall(): Promise<void> {
  // Install Playwright Chromium browser binary (mandatory for JS-rendered pages)
  console.log("  Installing Playwright Chromium browser...");
  try {
    // Check if npx is available before attempting install
    const hasNpx = (() => {
      try {
        execSync("npx --version", { stdio: "ignore", timeout: 10_000 });
        return true;
      } catch {
        return false;
      }
    })();

    if (!hasNpx) {
      console.log("  ! npx not found — cannot install Playwright Chromium.");
      console.log("    Install Node.js/npm, then run `npx playwright install chromium`.");
    } else {
      execSync("npx playwright install chromium", {
        stdio: "ignore",
        timeout: 120_000,
      });
      console.log("  ✓ Playwright Chromium browser installed.");
    }
  } catch (err: any) {
    warnIfError("postinstall: Playwright Chromium install failed", err);
    console.log("  ! Playwright Chromium not installed. JS-rendered pages may fail.");
    console.log("    Run `npx playwright install chromium` to install manually.");
  }
  console.log("");

  try {
    const result = await globalSetup({
      mode: "install",
      force: false,
      flags: {},
    });

    console.log("\n  ✓ IdeaGauntlet installed.\n");

    // Build a readable summary line
    const parts: string[] = [];
    if (result.created > 0) parts.push(`${result.created} installed`);
    if (result.updated > 0) parts.push(`${result.updated} updated`);
    if (result.alreadyInstalled > 0) parts.push(`${result.alreadyInstalled} up-to-date`);
    if (result.conflicts > 0) parts.push(`${result.conflicts} unchanged (existing files differ)`);

    const detail = parts.length > 0 ? parts.join(", ") : "none installed";
    console.log(`  Integrations: ${detail}`);
    if (result.skipped > 0) console.log(`  Tools skipped (not detected): ${result.skipped}`);

    if (result.errors.length > 0) {
      console.log("");
      for (const err of result.errors) console.log(`  ! ${err}`);
    }

    console.log("");
    console.log(`  You can now ask Claude/Codex/Cursor:`);
    console.log(`  "Use IdeaGauntlet to stress-test this idea: ..."`);
    console.log("");
    console.log(`  Run \`idea-gauntlet status\` to inspect integrations.`);
    console.log(`  Run \`idea-gauntlet uninstall\` before npm uninstall to remove generated files.`);
    console.log("");
  } catch (err) {
    // Never let postinstall fail npm install.
    // Even a code bug should not prevent the npm package from installing.
    console.error(`\n  ! IdeaGauntlet postinstall: ${err}`);
    console.error(`  Run \`idea-gauntlet install\` to retry integration setup.\n`);
  }
}

// Auto-execute only when run directly as a script (`node dist/postinstall.js`)
// When imported as a module (e.g., in tests), this guard prevents auto-run.
const runningDirectly = process.argv[1]?.replace(/\\/g, "/").endsWith("postinstall.js");
if (runningDirectly) {
  runPostinstall();
}
