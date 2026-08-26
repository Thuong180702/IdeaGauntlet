import { startMcpServer } from "../../mcp/server.js";

export async function mcpCommand(_options: Record<string, unknown>): Promise<void> {
  startMcpServer();
}
