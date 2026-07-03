import { startMcpServer } from "../../mcp/server.js";

export async function mcpCommand(options: Record<string, unknown>): Promise<void> {
  startMcpServer();
}
