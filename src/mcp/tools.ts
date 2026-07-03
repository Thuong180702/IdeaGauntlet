import type { LLMProvider, GauntletReport } from "../core/types.js";
import { buildReport } from "../core/report.js";
import { safeWriteReport } from "../utils/safeWrite.js";
import { runImmuneEngine } from "../engines/immuneEngine.js";
import { runCourtEngine } from "../engines/courtEngine.js";
import { runUserLab } from "../engines/syntheticUserLab.js";
import { runMvpPlanner } from "../engines/mvpPlanner.js";
import { runCompareEngine } from "../engines/compareEngine.js";
import { resolveProvider } from "../providers/providerUtils.js";

const reports = new Map<string, GauntletReport>();

let provider: LLMProvider | null = null;
const resolved = resolveProvider({});
if (resolved) provider = resolved.provider;

export function getReportIds(): string[] {
  return Array.from(reports.keys());
}

function requireProvider(): LLMProvider {
  if (!provider) {
    throw new Error(
      "No LLM provider configured. Set IDEAGAUNTLET_API_KEY, configure an OpenAI-compatible provider, or use --ollama.",
    );
  }
  return provider;
}

export async function handleToolCall(name: string, args: any): Promise<any> {
  switch (name) {
    case "quick_critique": {
      if (!args.idea) throw new Error("idea required");
      const report = await runImmuneEngine({ idea: args.idea }, requireProvider());
      report.markdown = buildReport(report);
      reports.set(report.id, report);
      return { type: "text", text: report.markdown };
    }

    case "run_court": {
      if (!args.idea) throw new Error("idea required");
      const report = await runCourtEngine({ idea: args.idea }, requireProvider());
      reports.set(report.id, report);
      return { type: "text", text: report.markdown };
    }

    case "generate_users": {
      if (!args.idea) throw new Error("idea required");
      const report = await runUserLab(
        { idea: args.idea },
        requireProvider(),
        args.personas ?? 6,
      );
      reports.set(report.id, report);
      return { type: "text", text: report.markdown };
    }

    case "plan_mvp": {
      if (!args.idea) throw new Error("idea required");
      const report = await runMvpPlanner({ idea: args.idea }, requireProvider());
      reports.set(report.id, report);
      return { type: "text", text: report.markdown };
    }

    case "compare_ideas": {
      if (!args.ideas || !Array.isArray(args.ideas))
        throw new Error("ideas array required");
      const ideas = args.ideas.map((i: string) => ({ idea: i }));
      const report = await runCompareEngine(ideas, requireProvider());
      reports.set(report.id, report);
      return { type: "text", text: report.markdown };
    }

    case "save_report": {
      if (!args.id) throw new Error("report id required");
      const report = reports.get(args.id);
      if (!report) throw new Error(`Report not found: ${args.id}`);
      const result = safeWriteReport(args.id, report.markdown, process.cwd());
      if (!result.ok) throw new Error(result.message);
      return { type: "text", text: `Report saved to ${result.path}` };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export const toolDefinitions = [
  {
    name: "quick_critique",
    description: "Run quick adversarial critique",
    inputSchema: {
      type: "object",
      properties: { idea: { type: "string" } },
      required: ["idea"],
    },
  },
  {
    name: "run_court",
    description: "Run court-style debate",
    inputSchema: {
      type: "object",
      properties: { idea: { type: "string" } },
      required: ["idea"],
    },
  },
  {
    name: "generate_users",
    description: "Generate synthetic user personas",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string" },
        personas: { type: "number" },
      },
      required: ["idea"],
    },
  },
  {
    name: "plan_mvp",
    description: "Generate MVP validation plan",
    inputSchema: {
      type: "object",
      properties: { idea: { type: "string" } },
      required: ["idea"],
    },
  },
  {
    name: "compare_ideas",
    description: "Compare multiple ideas",
    inputSchema: {
      type: "object",
      properties: {
        ideas: { type: "array", items: { type: "string" } },
      },
      required: ["ideas"],
    },
  },
  {
    name: "save_report",
    description: "Save report to .idea-gauntlet/reports/",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
];
