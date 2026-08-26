import { describe, it, expect } from "vitest";
import { toolDefinitions } from "../../src/mcp/tools.js";
import { listResources } from "../../src/mcp/resources.js";

describe("MCP server", () => {
  it("tool definitions have the expected tools", () => {
    const names = toolDefinitions.map((t: any) => t.name);
    expect(names).toContain("quick_critique");
    expect(names).toContain("run_court");
    expect(names).toContain("generate_users");
    expect(names).toContain("plan_mvp");
    expect(names).toContain("compare_ideas");
    expect(names).toContain("estimate_market_size");
    expect(names).toContain("analyze_unit_economics");
    expect(names).toContain("detect_anti_patterns");
    expect(names).not.toContain("create_prompt");
    expect(names).toContain("save_report");
    expect(names).toContain("run_ensemble");
    expect(names).toContain("analyze_trend");
    expect(names).toContain("run_gtm_strategy");
    expect(names).toContain("run_competitive_intelligence");
    expect(names).toContain("run_revenue_model_explorer");
    expect(names).toContain("run_founder_fit");
    expect(names).toContain("interview_synthetic_user");
    expect(names).toContain("generate_pitch_deck");
    expect(names).toContain("evolve_idea");
    expect(names).toContain("scan_compliance");
    expect(names).toContain("build_assumption_ledger");
    expect(toolDefinitions.length).toBe(20);
  });

  it("court tool description mentions roles", () => {
    const courtTool = toolDefinitions.find((t: any) => t.name === "run_court");
    expect(courtTool).toBeDefined();
    expect(typeof courtTool.description).toBe("string");
    expect(courtTool.description.length).toBeGreaterThan(50);
    expect(courtTool.description).toContain("Judge");
  });

  it("ensemble tool definition has required fields", () => {
    const ensembleTool = toolDefinitions.find((t: any) => t.name === "run_ensemble");
    expect(ensembleTool).toBeDefined();
    expect(ensembleTool.inputSchema.required).toContain("idea");
    expect(ensembleTool.inputSchema.required).toContain("models");
    expect(ensembleTool.inputSchema.properties).toHaveProperty("models");
    expect(ensembleTool.inputSchema.properties).toHaveProperty("mode");
    expect(ensembleTool.inputSchema.properties).toHaveProperty("enableSearch");
  });

  it("analyze_trend tool definition has required fields", () => {
    const trendTool = toolDefinitions.find((t: any) => t.name === "analyze_trend");
    expect(trendTool).toBeDefined();
    expect(trendTool.inputSchema.required).toContain("ideaId");
    expect(trendTool.inputSchema.properties).toHaveProperty("ideaId");
    expect(trendTool.description).toContain("list");
  });

  it("Phase 2 & Phase 3 tools have valid schemas", () => {
    const gtmTool = toolDefinitions.find((t: any) => t.name === "run_gtm_strategy");
    const competeTool = toolDefinitions.find((t: any) => t.name === "run_competitive_intelligence");
    const revenueTool = toolDefinitions.find((t: any) => t.name === "run_revenue_model_explorer");
    const founderTool = toolDefinitions.find((t: any) => t.name === "run_founder_fit");
    const interviewTool = toolDefinitions.find((t: any) => t.name === "interview_synthetic_user");
    const pitchTool = toolDefinitions.find((t: any) => t.name === "generate_pitch_deck");
    const evolveTool = toolDefinitions.find((t: any) => t.name === "evolve_idea");
    const complianceTool = toolDefinitions.find((t: any) => t.name === "scan_compliance");

    expect(gtmTool).toBeDefined();
    expect(gtmTool.inputSchema.required).toContain("idea");

    expect(competeTool).toBeDefined();
    expect(competeTool.inputSchema.required).toContain("idea");

    expect(revenueTool).toBeDefined();
    expect(revenueTool.inputSchema.required).toContain("idea");

    expect(founderTool).toBeDefined();
    expect(founderTool.inputSchema.required).toContain("idea");
    expect(founderTool.inputSchema.required).toContain("background");

    expect(interviewTool).toBeDefined();
    expect(interviewTool.inputSchema.required).toContain("idea");

    expect(pitchTool).toBeDefined();
    expect(pitchTool.inputSchema.required).toContain("idea");

    expect(evolveTool).toBeDefined();
    expect(evolveTool.inputSchema.required).toContain("idea");

    expect(complianceTool).toBeDefined();
    expect(complianceTool.inputSchema.required).toContain("idea");
  });

  it("resources list has expected structure", () => {
    const result = listResources([]);
    expect(result).toHaveProperty("resources");
    expect(Array.isArray(result.resources)).toBe(true);
  });
});
