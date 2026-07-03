import { handleToolCall, toolDefinitions, getReportIds } from "./tools.js";
import { listResources } from "./resources.js";

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

function handleMessage(line: string): void {
  const trimmed = line.trim();
  if (!trimmed) return;

  let msg: any;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    console.error("Failed to parse JSON-RPC message:", trimmed.slice(0, 200));
    return;
  }

  if (msg.method === "tools/list") {
    respond(msg.id, { tools: toolDefinitions });
  } else if (msg.method === "tools/call") {
    handleToolCall(msg.params.name, msg.params.arguments ?? {})
      .then((result) => respond(msg.id, { content: [result] }))
      .catch((err: any) =>
        respond(msg.id, null, { code: -32000, message: err.message }),
      );
  } else if (msg.method === "resources/list") {
    respond(msg.id, listResources(getReportIds()));
  } else {
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
