import type { LLMProvider, GauntletReport } from "../core/types.js";
import { buildReport } from "../core/report.js";
import { safeWriteReport } from "../utils/safeWrite.js";
import { runImmuneEngine } from "../engines/immuneEngine.js";
import { runCourtEngine } from "../engines/courtEngine.js";
import { runUserLab } from "../engines/syntheticUserLab.js";
import { runMvpPlanner } from "../engines/mvpPlanner.js";
import { runCompareEngine } from "../engines/compareEngine.js";
import { resolveProvider } from "../providers/providerUtils.js";
import { mcpToolDescriptions } from "../workflows/formatters/formatForMcpDescription.js";
import { notifyResourcesChanged } from "./server.js";
import { t } from "../utils/locale.js";

import { loadReport, listReports } from "../history/historyStore.js";

const reports = new Map<string, GauntletReport>();

let provider: LLMProvider | null = null;
const resolved = resolveProvider({});
if (resolved) provider = resolved.provider;

export function getReport(id: string): GauntletReport | null {
  const inMemory = reports.get(id);
  if (inMemory) return inMemory;
  try {
    return loadReport(id, process.cwd());
  } catch {
    return null;
  }
}

export function getReportIds(): string[] {
  const inMemory = Array.from(reports.keys());
  try {
    const history = listReports(process.cwd()).map((entry) => entry.id);
    return [...new Set([...inMemory, ...history])];
  } catch {
    return inMemory;
  }
}

function requireProvider(): LLMProvider {
  if (!provider) {
    throw new Error(t("mcp.no_provider"));
  }
  return provider;
}

export async function handleToolCall(name: string, args: any): Promise<any> {
  switch (name) {
    case "quick_critique": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const report = await runImmuneEngine({ idea: args.idea }, requireProvider());
      report.markdown = buildReport(report);
      reports.set(report.id, report);
      notifyResourcesChanged();
      return { type: "text", text: report.markdown };
    }

    case "run_court": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const report = await runCourtEngine({ idea: args.idea }, requireProvider());
      // Fix: build markdown — was missing, causing empty responses.
      report.markdown = buildReport(report);
      reports.set(report.id, report);
      notifyResourcesChanged();
      return { type: "text", text: report.markdown };
    }

    case "generate_users": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const report = await runUserLab(
        { idea: args.idea },
        requireProvider(),
        args.personas ?? 6,
      );
      // Fix: build markdown — was missing, causing empty responses.
      report.markdown = buildReport(report);
      reports.set(report.id, report);
      notifyResourcesChanged();
      return { type: "text", text: report.markdown };
    }

    case "plan_mvp": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const report = await runMvpPlanner({ idea: args.idea }, requireProvider());
      // Fix: build markdown — was missing, causing empty responses.
      report.markdown = buildReport(report);
      reports.set(report.id, report);
      notifyResourcesChanged();
      return { type: "text", text: report.markdown };
    }

    case "compare_ideas": {
      if (!args.ideas || !Array.isArray(args.ideas))
        throw new Error(t("mcp.ideas_required"));
      const ideas = args.ideas.map((i: string) => ({ idea: i }));
      const report = await runCompareEngine(ideas, requireProvider());
      // Fix: build markdown — was missing, causing empty responses.
      report.markdown = buildReport(report);
      reports.set(report.id, report);
      notifyResourcesChanged();
      return { type: "text", text: report.markdown };
    }

    case "save_report": {
      if (!args.id) throw new Error(t("mcp.report_id_required"));
      const report = reports.get(args.id);
      if (!report) throw new Error(`${t("mcp.report_not_found")}: ${args.id}`);
      const result = safeWriteReport(args.id, report.markdown, process.cwd());
      if (!result.ok) throw new Error(result.message);
      return { type: "text", text: `${t("mcp.report_saved")} ${result.path}` };
    }

    default:
      throw new Error(`${t("mcp.unknown_tool")}: ${name}`);
  }
}

export const toolDefinitions = [
  {
    name: "quick_critique",
    description: mcpToolDescriptions().quick_critique,
    inputSchema: {
      type: "object",
      properties: { idea: { type: "string" } },
      required: ["idea"],
    },
  },
  {
    name: "run_court",
    description: mcpToolDescriptions().run_court,
    inputSchema: {
      type: "object",
      properties: { idea: { type: "string" } },
      required: ["idea"],
    },
  },
  {
    name: "generate_users",
    description: mcpToolDescriptions().generate_users,
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
    description: mcpToolDescriptions().plan_mvp,
    inputSchema: {
      type: "object",
      properties: { idea: { type: "string" } },
      required: ["idea"],
    },
  },
  {
    name: "compare_ideas",
    description: mcpToolDescriptions().compare_ideas,
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
