import { describe, it, expect } from "vitest";

describe("MCP server", () => {
  it("tool definitions have the expected tools", async () => {
    // Import directly to verify tool definitions are exported
    const { toolDefinitions } = await import("../../src/mcp/tools.js");
    const names = toolDefinitions.map((t: any) => t.name);
    expect(names).toContain("quick_critique");
    expect(names).toContain("run_court");
    expect(names).toContain("generate_users");
    expect(names).toContain("plan_mvp");
    expect(names).toContain("compare_ideas");
    expect(names).not.toContain("create_prompt");
    expect(names).toContain("save_report");
    expect(toolDefinitions.length).toBe(6);
  });

  it("court tool description mentions roles", async () => {
    const { toolDefinitions } = await import("../../src/mcp/tools.js");
    const courtTool = toolDefinitions.find((t: any) => t.name === "run_court");
    expect(courtTool).toBeDefined();
    expect(typeof courtTool.description).toBe("string");
    expect(courtTool.description.length).toBeGreaterThan(50);
    expect(courtTool.description).toContain("Judge");
  });

  it("resources list has expected structure", async () => {
    const { listResources } = await import("../../src/mcp/resources.js");
    const result = listResources([]);
    expect(result).toHaveProperty("resources");
    expect(Array.isArray(result.resources)).toBe(true);
  });
});
