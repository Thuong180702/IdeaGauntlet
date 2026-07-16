import { handleToolCall, toolDefinitions, getReportIds } from "./tools.js";
import { listResources, readMcpResource } from "./resources.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { warnIfError } from "../utils/warn.js";

// Read package version at startup to avoid hardcoding.
// Traverse up until we find package.json, which is robust for both source and bundled files.
function findPackageJson(startDir: string): string {
  let dir = startDir;
  while (true) {
    const filePath = join(dir, "package.json");
    if (existsSync(filePath)) {
      return filePath;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("Could not find package.json in any parent directory");
    }
    dir = parent;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = findPackageJson(__dirname);
const _pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
const PKG_VERSION: string = _pkg.version;

// ─── JSON-RPC helpers ────────────────────────────────────────────

function respond(id: any, result?: any, error?: any) {
  const msg: any = { jsonrpc: "2.0", id };
  if (error) {
    msg.error = { code: error.code ?? -32000, message: error.message ?? "Unknown error" };
  } else {
    msg.result = result;
  }
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function notify(method: string, params?: any) {
  const msg: any = { jsonrpc: "2.0", method, params };
  process.stdout.write(JSON.stringify(msg) + "\n");
}

/** MCP server capabilities. */
const SERVER_CAPABILITIES = {
  protocolVersion: "2024-11-05",
  capabilities: {
    tools: { listChanged: false },
    resources: { listChanged: true, subscribe: false },
  },
  serverInfo: {
    name: "idea-gauntlet",
    version: PKG_VERSION,
  },
};

function handleMessage(line: string): void {
  const trimmed = line.trim();
  if (!trimmed) return;

  let msg: any;
  try {
    msg = JSON.parse(trimmed);
  } catch (err: any) {
    warnIfError("mcpServer: JSON-RPC parse failed", err);
    console.error("Failed to parse JSON-RPC message:", trimmed.slice(0, 200));
    return;
  }

  // Bug E/F fix: handle initialize, notifications/initialized, ping
  switch (msg.method) {
    case "initialize":
      respond(msg.id, SERVER_CAPABILITIES);
      break;
    case "notifications/initialized":
      // No response needed per spec — just acknowledge
      break;
    case "ping":
      respond(msg.id, {});
      break;
    case "tools/list":
      respond(msg.id, { tools: toolDefinitions });
      break;
    case "tools/call":
      handleToolCall(msg.params.name, msg.params.arguments ?? {})
        .then((result) => respond(msg.id, { content: [result] }))
        .catch((err: any) => respond(msg.id, null, { code: -32000, message: err.message }));
      break;
    case "resources/list":
      respond(msg.id, listResources(getReportIds()));
      break;
    case "resources/read": {
      const uri = msg.params?.uri as string;
      if (!uri) {
        respond(msg.id, null, { code: -32602, message: "URI parameter is required" });
        break;
      }
      try {
        const result = readMcpResource(uri);
        if (result) {
          respond(msg.id, result);
        } else {
          respond(msg.id, null, { code: -32002, message: `Resource not found: ${uri}` });
        }
      } catch (err: any) {
        respond(msg.id, null, { code: -32000, message: err.message });
      }
      break;
    }
    default:
      respond(msg.id, null, { code: -32601, message: "Method not found" });
  }
}

// ─── Start MCP server with JSON-RPC buffering ───────────────────
//
// Instead of relying on readline (which can drop partial lines when
// messages arrive split across chunks), we accumulate raw stdin data
// in a buffer and attempt to extract complete newline-delimited JSON
// objects. Incomplete lines stay in the buffer for the next chunk.

export function startMcpServer(): void {
  let buffer = "";

  process.stdin.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf-8");

    const lines = buffer.split("\n");
    // Keep the last (potentially incomplete) segment in the buffer
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      handleMessage(line);
    }
  });

  process.stdin.on("error", (err) => {
    console.error("stdin error:", err.message);
  });

  // Ensure flowing mode (stdin is ordinarily paused until a listener
  // is attached, but "data" listeners should already trigger this).
  process.stdin.resume();
}

/**
 * Bug K fix: Notify clients that the resource list has changed.
 * Call after a new report is created.
 */
export function notifyResourcesChanged(): void {
  notify("notifications/resources/list_changed");
}
