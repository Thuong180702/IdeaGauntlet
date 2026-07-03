import { getApiKey, isNodeGte } from "../../utils/env.js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

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
  } catch {
    return false;
  }
}

async function checkMcpServer(): Promise<boolean> {
  try {
    const { startMcpServer } = await import("../../mcp/server.js");
    return typeof startMcpServer === "function";
  } catch {
    return false;
  }
}
