import { getApiKey, isNodeGte } from "../../utils/env.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { warnIfError } from "../../utils/warn.js";

interface CheckResult {
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
  detail?: string;
}

export async function doctorCommand(
  options?: Record<string, unknown>,
): Promise<void> {
  const verbose = !!options?.verbose;
  const results: CheckResult[] = [];

  const nodeOk = isNodeGte(18);
  results.push({
    label: "Node version (>=18)",
    status: nodeOk ? "pass" : "fail",
    message: process.version,
    detail: verbose ? `Detected: ${process.version} at ${process.execPath}` : undefined,
  });

  const hasKey = !!getApiKey();
  results.push({
    label: "API key (IDEAGAUNTLET_API_KEY)",
    status: hasKey ? "pass" : "warn",
    message: hasKey ? "Set" : "Not set (setup/init/doctor still work)",
  });

  const executableOk = checkExecutable();
  results.push({
    label: "CLI executable",
    status: executableOk ? "pass" : "warn",
    message: executableOk ? "Found" : "Not found (run build first)",
    detail: verbose ? `Checked: ${resolve(process.cwd(), "dist/cli/index.js")}` : undefined,
  });

  const codexConfigOk = checkPathExists(".codex/config.toml");
  results.push({
    label: ".codex/config.toml",
    status: codexConfigOk ? "pass" : "warn",
    message: codexConfigOk ? "Found" : "Not found (used by Codex integration)",
    detail: verbose ? `Checked: ${resolve(process.cwd(), ".codex/config.toml")}` : undefined,
  });

  const ollamaOk = await checkOllama();
  results.push({
    label: "Ollama availability",
    status: ollamaOk ? "pass" : "warn",
    message: ollamaOk ? "Running at localhost:11434" : "Not detected",
    detail: verbose && ollamaOk ? "API responded to /api/tags" : undefined,
  });

  const mcpOk = await checkMcpServer();
  results.push({
    label: "MCP server startup",
    status: mcpOk ? "pass" : "warn",
    message: mcpOk ? "Module loaded" : "Could not load MCP server module",
    detail: verbose
      ? mcpOk
        ? "MCP server module exports startMcpServer"
        : "MCP server module failed to import"
      : undefined,
  });

  const searchOk = await checkSearchLiveness();
  results.push({
    label: "Web search connectivity",
    status: searchOk ? "pass" : "warn",
    message: searchOk ? "Active (DuckDuckGo accessible)" : "Blocked or offline (web research will be skipped)",
    detail: verbose && !searchOk ? "Fetch to html.duckduckgo.com returned non-ok status or failed" : undefined,
  });

  // P2-9: Playwright browser check
  const playwrightOk = await checkPlaywright();
  results.push({
    label: "Playwright browser (page fetch fallback)",
    status: playwrightOk ? "pass" : "warn",
    message: playwrightOk ? "Installed" : "Not installed (page fetch will skip JS-rendered pages)",
    detail: verbose ? playwrightOk ? "chromium executable found" : "Run: npx playwright install chromium" : undefined,
  });

  // P2-9: Workflow config schema check
  const configOk = checkWorkflowConfig();
  results.push({
    label: ".ideagauntlet-workflow.json",
    status: configOk.status,
    message: configOk.message,
    detail: verbose ? configOk.detail : undefined,
  });

  console.log("\nIdeaGauntlet Doctor");
  console.log("──────────────────");
  for (const r of results) {
    const icon = r.status === "pass" ? "✓" : r.status === "warn" ? "⚠" : "✗";
    console.log(`${icon} ${r.label}: ${r.message}`);
    if (r.detail && verbose) console.log(`   ${r.detail}`);
  }

  const failures = results.filter((r) => r.status === "fail").length;
  if (failures > 0) console.log(`\n${failures} failure(s) found.`);
  else console.log("\nAll critical checks passed.");
}

function checkExecutable(): boolean {
  const paths = [
    resolve(process.cwd(), "dist/cli/index.js"),
    resolve(process.cwd(), "src/cli/index.ts"),
  ];
  return paths.some((p) => existsSync(p));
}

function checkPathExists(relativePath: string): boolean {
  return existsSync(resolve(process.cwd(), relativePath));
}

async function checkOllama(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    return res.ok;
  } catch (err: any) {
    warnIfError("doctor: Ollama check failed", err);
    return false;
  }
}

async function checkMcpServer(): Promise<boolean> {
  try {
    const { startMcpServer } = await import("../../mcp/server.js");
    return typeof startMcpServer === "function";
  } catch (err: any) {
    warnIfError("doctor: MCP server check failed", err);
    return false;
  }
}

async function checkSearchLiveness(): Promise<boolean> {
  try {
    const res = await fetch("https://html.duckduckgo.com/html/?q=test", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
      }
    });
    return res.ok;
  } catch (err: any) {
    warnIfError("doctor: search liveness check failed", err);
    return false;
  }
}

/** P2-9: Check if Playwright chromium browser is installed. */
async function checkPlaywright(): Promise<boolean> {
  try {
    const pw = await import("playwright");
    const browser = await pw.chromium.launch({ headless: true }).catch(() => null);
    if (browser) {
      await browser.close();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** P2-9: Check .ideagauntlet-workflow.json exists and is valid JSON. */
function checkWorkflowConfig(): { status: "pass" | "warn" | "fail"; message: string; detail?: string } {
  const configPath = resolve(process.cwd(), ".ideagauntlet-workflow.json");
  if (!existsSync(configPath)) {
    return { status: "pass", message: "Not found (using defaults)" };
  }
  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { status: "fail", message: "Invalid: root is not an object" };
    }
    const knownKeys = ["scoreWeights", "customRoles", "research", "llm"];
    const unknown = Object.keys(parsed).filter((k) => !knownKeys.includes(k));
    if (unknown.length > 0) {
      return { status: "warn", message: `Valid but unknown keys: ${unknown.join(", ")}`, detail: `Known keys: ${knownKeys.join(", ")}` };
    }
    return { status: "pass", message: "Valid" };
  } catch (err: any) {
    return { status: "fail", message: `Invalid JSON: ${err.message}` };
  }
}
