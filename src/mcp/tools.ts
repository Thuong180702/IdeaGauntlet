import type { LLMProvider, GauntletReport } from "../core/types.js";
import { buildReport } from "../core/report.js";
import { safeWriteReport } from "../utils/safeWrite.js";
import { runImmuneEngine } from "../engines/immuneEngine.js";
import { runCourtEngine } from "../engines/courtEngine.js";
import { runUserLab } from "../engines/syntheticUserLab.js";
import { runMvpPlanner } from "../engines/mvpPlanner.js";
import { runCompareEngine } from "../engines/compareEngine.js";
import { runMarketSizingEngine } from "../engines/marketSizingEngine.js";
import { runUnitEconomicsEngine } from "../engines/unitEconomicsEngine.js";
import { runAntiPatternDetector } from "../engines/antiPatternDetector.js";
import { runEnsemble, formatEnsembleResult } from "../engines/ensembleEngine.js";
import { analyzeTrend, formatTrendResult, listTrendableIdeas } from "../engines/trendMonitor.js";
import { runGTMEngine, formatGTMReport } from "../engines/gtmEngine.js";
import { runCompetitiveIntelligenceEngine, formatCompetitiveIntelligenceReport } from "../engines/competitiveIntelligenceEngine.js";
import { runRevenueModelEngine, formatRevenueModelReport } from "../engines/revenueModelEngine.js";
import { runFounderMarketFitEngine, formatFounderMarketFitReport } from "../engines/founderMarketFitEngine.js";
import { runUserInterviewEngine, formatUserInterviewReport } from "../engines/userInterviewEngine.js";
import { runPitchGenerator, formatPitchDeckReport } from "../engines/pitchGenerator.js";
import { runEvolutionCoach, formatIdeaEvolutionReport } from "../engines/evolutionCoach.js";
import { runComplianceScanner, formatComplianceReport } from "../engines/complianceScanner.js";
import { runAssumptionLedger, formatAssumptionLedger } from "../engines/assumptionLedger.js";
import { performResearch } from "../search/searchOrchestrator.js";
import { resolveProvider } from "../providers/providerUtils.js";
import { OpenAICompatibleProvider } from "../providers/openaiCompatibleProvider.js";
import { mcpToolDescriptions } from "../workflows/formatters/formatForMcpDescription.js";
import { notifyResourcesChanged } from "./server.js";
import { t } from "../utils/locale.js";
import { warnIfError } from "../utils/warn.js";

import { loadReport, listReports } from "../history/historyStore.js";

import { withUpdateNotice } from "../utils/updateChecker.js";
import { normalizeFounderContext } from "../core/founderContext.js";

/** Optional on every idea tool: what the founder has, so advice fits their real resources. */
const FOUNDER_SCHEMA = {
  type: "object",
  description:
    "What the founder has to work with. Ask the user for this before analysing — it changes which plans are feasible. Self-reported; never treated as market evidence.",
  properties: {
    background: { type: "string", description: "Skills, experience, domain knowledge" },
    team: { type: "string", description: "Solo or team, and who covers what" },
    budget: { type: "string", description: "Money available, e.g. '$3,000 savings'" },
    time: { type: "string", description: "Time available, e.g. '10 hours/week alongside a job'" },
    deadline: { type: "string", description: "Runway or decision deadline" },
    assets: { type: "string", description: "Audience, network, pilot customers, data already in hand" },
    notes: { type: "string", description: "Any other constraint" },
  },
} as const;

function founderArg(args: any) {
  return normalizeFounderContext(args?.founder);
}

const reports = new Map<string, GauntletReport>();

let provider: LLMProvider | null = null;
const resolved = resolveProvider({});
if (resolved) provider = resolved.provider;

export function getReport(id: string): GauntletReport | null {
  const inMemory = reports.get(id);
  if (inMemory) return inMemory;
  try {
    return loadReport(id, process.cwd());
  } catch (err: any) {
    warnIfError(`mcp: getReport failed for ${id}`, err);
    return null;
  }
}

export function getReportIds(): string[] {
  const inMemory = Array.from(reports.keys());
  try {
    const history = listReports(process.cwd()).map((entry) => entry.id);
    return [...new Set([...inMemory, ...history])];
  } catch (err: any) {
    warnIfError("mcp: getReportIds failed", err);
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
      const report = await runImmuneEngine({ idea: args.idea, founder: founderArg(args) }, requireProvider());
      report.markdown = buildReport(report);
      reports.set(report.id, report);
      notifyResourcesChanged();
      const text = await withUpdateNotice(report.markdown, args.idea);
      return { type: "text", text };
    }

    case "run_court": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const report = await runCourtEngine({ idea: args.idea, founder: founderArg(args) }, requireProvider());
      report.markdown = buildReport(report);
      reports.set(report.id, report);
      notifyResourcesChanged();
      const text = await withUpdateNotice(report.markdown, args.idea);
      return { type: "text", text };
    }

    case "generate_users": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const report = await runUserLab(
        { idea: args.idea, founder: founderArg(args) },
        requireProvider(),
        args.personas ?? 6,
      );
      report.markdown = buildReport(report);
      reports.set(report.id, report);
      notifyResourcesChanged();
      const text = await withUpdateNotice(report.markdown, args.idea);
      return { type: "text", text };
    }

    case "plan_mvp": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const report = await runMvpPlanner({ idea: args.idea, founder: founderArg(args) }, requireProvider());
      report.markdown = buildReport(report);
      reports.set(report.id, report);
      notifyResourcesChanged();
      const text = await withUpdateNotice(report.markdown, args.idea);
      return { type: "text", text };
    }

    case "compare_ideas": {
      if (!args.ideas || !Array.isArray(args.ideas))
        throw new Error(t("mcp.ideas_required"));
      const ideas = args.ideas.map((i: string) => ({ idea: i }));
      const report = await runCompareEngine(ideas, requireProvider());
      report.markdown = buildReport(report);
      reports.set(report.id, report);
      notifyResourcesChanged();
      const text = await withUpdateNotice(report.markdown, args.ideas.join(" "));
      return { type: "text", text };
    }

    case "estimate_market_size": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const result = await runMarketSizingEngine({ idea: args.idea, market: args.market, founder: founderArg(args) }, requireProvider());
      const rawText = JSON.stringify(result, null, 2);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "analyze_unit_economics": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const result = await runUnitEconomicsEngine({ idea: args.idea, market: args.market, founder: founderArg(args) }, requireProvider());
      const rawText = JSON.stringify(result, null, 2);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "detect_anti_patterns": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const result = await runAntiPatternDetector({ idea: args.idea, market: args.market, founder: founderArg(args) }, requireProvider());
      const rawText = JSON.stringify(result, null, 2);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "save_report": {
      if (!args.id) throw new Error(t("mcp.report_id_required"));
      const report = reports.get(args.id);
      if (!report) throw new Error(`${t("mcp.report_not_found")}: ${args.id}`);
      const result = safeWriteReport(args.id, report.markdown, process.cwd());
      if (!result.ok) throw new Error(result.message);
      return { type: "text", text: `${t("mcp.report_saved")} ${result.path}` };
    }

    case "run_ensemble": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const apiKey = process.env.IDEAGAUNTLET_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.GROQ_API_KEY ||
        process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("run_ensemble requires an API key (IDEAGAUNTLET_API_KEY) and --models with 2+ model names.");
      const baseUrl = process.env.IDEAGAUNTLET_BASE_URL;
      const modelsRaw: string = args.models ?? "";
      const modelList = modelsRaw.split(",").map((m: string) => m.trim()).filter(Boolean);
      if (modelList.length < 2) {
        throw new Error("run_ensemble requires at least 2 model names in the 'models' argument (e.g. 'gpt-4o,gpt-4o-mini')");
      }
      const ensembleProviders = modelList.map((m: string) =>
        new OpenAICompatibleProvider({ model: m, apiKey, baseUrl })
      );
      const ensembleResult = await runEnsemble({
        idea: args.idea,
        mode: args.mode ?? "quick",
        providers: ensembleProviders,
        enableSearch: args.enableSearch !== false,
      });
      const rawText = formatEnsembleResult(ensembleResult);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "analyze_trend": {
      if (!args.ideaId) throw new Error("'ideaId' is required for analyze_trend. Use history to find a saved report ID.");
      try {
        // If no ideaId provided, list available ideas
        if (args.ideaId === "list") {
          const ideas = listTrendableIdeas();
          if (ideas.length === 0) {
            return { type: "text", text: "No saved reports with research data. Run quick/court with --save first." };
          }
          const lines = ["Ideas available for trend analysis:", ""];
          for (const i of ideas) {
            lines.push(`• ${i.id}  [${i.mode}]  ${i.idea.slice(0, 70)}  (${i.createdAt})`);
          }
          return { type: "text", text: lines.join("\n") };
        }
        const oldReport = (await import("../history/historyStore.js")).loadReport(args.ideaId);
        if (!oldReport) throw new Error(`Report not found: ${args.ideaId}`);
        if (!oldReport.webResearch) throw new Error(`Report ${args.ideaId} has no research data.`);
        const ideaInput = { idea: oldReport.input.idea, targetUsers: oldReport.input.targetUsers, market: oldReport.input.market, stage: oldReport.input.stage, mode: oldReport.mode as any };
        const currentResearch = await performResearch(ideaInput, oldReport.mode as any);
        const trend = analyzeTrend(args.ideaId, currentResearch);
        if (!trend) return { type: "text", text: "No previous research data to compare." };
        const rawText = formatTrendResult(trend);
        const text = await withUpdateNotice(rawText, oldReport.input.idea);
        return { type: "text", text };
      } catch (err: any) {
        warnIfError("mcp: analyze_trend failed", err);
        throw err;
      }
    }

    case "run_gtm_strategy": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const result = await runGTMEngine(
        { idea: args.idea, market: args.market, stage: args.stage, targetUsers: args.targetUsers, founder: founderArg(args) },
        requireProvider(),
        {
          enableSearch: args.enableSearch !== false,
          budget: args.budget,
          timeline: args.timeline,
        }
      );
      const rawText = formatGTMReport(result);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "run_competitive_intelligence": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const result = await runCompetitiveIntelligenceEngine(
        { idea: args.idea, market: args.market, stage: args.stage, targetUsers: args.targetUsers, founder: founderArg(args) },
        requireProvider(),
        {
          enableSearch: args.enableSearch !== false,
          depth: args.depth ?? "quick",
        }
      );
      const rawText = formatCompetitiveIntelligenceReport(result);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "run_revenue_model_explorer": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const result = await runRevenueModelEngine(
        { idea: args.idea, market: args.market, stage: args.stage, targetUsers: args.targetUsers, founder: founderArg(args) },
        requireProvider(),
        {
          enableSearch: args.enableSearch !== false,
        }
      );
      const rawText = formatRevenueModelReport(result);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "run_founder_fit": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      if (!args.background) throw new Error("Founder background is required for run_founder_fit");
      const result = await runFounderMarketFitEngine(
        { idea: args.idea, market: args.market, stage: args.stage, targetUsers: args.targetUsers, founder: founderArg(args) },
        requireProvider(),
        args.background
      );
      const rawText = formatFounderMarketFitReport(result);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "interview_synthetic_user": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const result = await runUserInterviewEngine(
        { idea: args.idea, market: args.market, stage: args.stage, targetUsers: args.targetUsers, founder: founderArg(args) },
        requireProvider(),
        {
          personaArchetype: args.persona,
          founderQuestions: args.questions,
        }
      );
      const rawText = formatUserInterviewReport(result);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "generate_pitch_deck": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const result = await runPitchGenerator(
        { idea: args.idea, market: args.market, stage: args.stage, targetUsers: args.targetUsers, founder: founderArg(args) },
        requireProvider(),
        {
          template: args.template ?? "yc",
          companyName: args.company,
          enableSearch: args.enableSearch !== false,
        }
      );
      const rawText = formatPitchDeckReport(result);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "evolve_idea": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const result = await runEvolutionCoach(
        { idea: args.idea, market: args.market, stage: args.stage, targetUsers: args.targetUsers, founder: founderArg(args) },
        requireProvider(),
        {
          focusDimension: args.focus,
          enableSearch: args.enableSearch !== false,
        }
      );
      const rawText = formatIdeaEvolutionReport(result);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "scan_compliance": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const regionsRaw: string = args.regions ?? "";
      const regions = regionsRaw ? regionsRaw.split(",").map((r: string) => r.trim()).filter(Boolean) : undefined;
      const result = await runComplianceScanner(
        { idea: args.idea, market: args.market, stage: args.stage, targetUsers: args.targetUsers, founder: founderArg(args) },
        requireProvider(),
        {
          regions,
          enableSearch: args.enableSearch !== false,
        }
      );
      const rawText = formatComplianceReport(result);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
    }

    case "build_assumption_ledger": {
      if (!args.idea) throw new Error(t("mcp.idea_required"));
      const maxRaw = args.maxAssumptions;
      const maxAssumptions = typeof maxRaw === "number" ? maxRaw : undefined;
      const result = await runAssumptionLedger(
        { idea: args.idea, market: args.market, stage: args.stage, targetUsers: args.targetUsers, founder: founderArg(args) },
        requireProvider(),
        {
          maxAssumptions,
          enableSearch: args.enableSearch !== false,
        }
      );
      const rawText = formatAssumptionLedger(result);
      const text = await withUpdateNotice(rawText, args.idea);
      return { type: "text", text };
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
      properties: { idea: { type: "string" }, founder: FOUNDER_SCHEMA },
      required: ["idea"],
    },
  },
  {
    name: "run_court",
    description: mcpToolDescriptions().run_court,
    inputSchema: {
      type: "object",
      properties: { idea: { type: "string" }, founder: FOUNDER_SCHEMA },
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
        founder: FOUNDER_SCHEMA,
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
      properties: { idea: { type: "string" }, founder: FOUNDER_SCHEMA },
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
    name: "estimate_market_size",
    description: "Estimate TAM, SAM, SOM, CAGR, and market sizing breakdown",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string" },
        founder: FOUNDER_SCHEMA,
        market: { type: "string" },
      },
      required: ["idea"],
    },
  },
  {
    name: "analyze_unit_economics",
    description: "Estimate CAC, LTV, LTV:CAC ratio, payback period, and unit viability",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string" },
        founder: FOUNDER_SCHEMA,
        market: { type: "string" },
      },
      required: ["idea"],
    },
  },
  {
    name: "detect_anti_patterns",
    description: "Audit idea against 10 common startup anti-patterns and failure traps",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string" },
        founder: FOUNDER_SCHEMA,
        market: { type: "string" },
      },
      required: ["idea"],
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
  {
    name: "run_ensemble",
    description: "Run the same idea through multiple LLM models in parallel and show aggregate scores, consensus verdict, and per-dimension disagreement. Reduces single-model bias. Requires at least 2 model names.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "The product idea to analyse" },
        founder: FOUNDER_SCHEMA,
        models: { type: "string", description: "Comma-separated model names, e.g. 'gpt-4o,gpt-4o-mini'" },
        mode: { type: "string", description: "Gauntlet mode: quick (default) or court" },
        enableSearch: { type: "boolean", description: "Enable web research before analysis (default: true)" },
      },
      required: ["idea", "models"],
    },
  },
  {
    name: "analyze_trend",
    description: "Re-run market research on a previously saved idea and compare results against historical data. Surfaces new competitors, saturation changes, and emerging niche opportunities. Use ideaId='list' to see available ideas.",
    inputSchema: {
      type: "object",
      properties: {
        ideaId: { type: "string", description: "ID of a previously saved report, or 'list' to see available ideas" },
      },
      required: ["ideaId"],
    },
  },
  {
    name: "run_gtm_strategy",
    description: "Generate an actionable Go-To-Market (GTM) strategy: channel priority matrix, launch playbook milestones, budget allocation, and first-100-customers tactics grounded in research.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "The product idea" },
        founder: FOUNDER_SCHEMA,
        market: { type: "string", description: "Target market" },
        budget: { type: "string", description: "Available launch budget (e.g. '$5000')" },
        timeline: { type: "string", description: "Target launch timeline (e.g. '90 days')" },
        enableSearch: { type: "boolean", description: "Enable web research before analysis (default: true)" },
      },
      required: ["idea"],
    },
  },
  {
    name: "run_competitive_intelligence",
    description: "Deep competitive intelligence analysis: SWOT competitor profiles, positioning map (X/Y coordinates), strategic windows, attack vectors, and defensive strategies.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "The product idea" },
        founder: FOUNDER_SCHEMA,
        market: { type: "string", description: "Target market" },
        depth: { type: "string", description: "Depth of analysis: 'quick' or 'deep' (default: quick)" },
        enableSearch: { type: "boolean", description: "Enable web research before analysis (default: true)" },
      },
      required: ["idea"],
    },
  },
  {
    name: "run_revenue_model_explorer",
    description: "Evaluate 12 major startup revenue models, rank them by fit score, generate revenue projections (Y1/Y3), pricing tier recommendations, and monetization timeline.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "The product idea" },
        founder: FOUNDER_SCHEMA,
        market: { type: "string", description: "Target market" },
        enableSearch: { type: "boolean", description: "Enable web research before analysis (default: true)" },
      },
      required: ["idea"],
    },
  },
  {
    name: "run_founder_fit",
    description: "Assess founder-market fit: evaluates domain expertise, network advantage, and execution risk. Identifies unfair advantages, critical skill gaps, co-founder recommendations, and first 3 hires.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "The product idea" },
        founder: FOUNDER_SCHEMA,
        background: { type: "string", description: "Founder's background, past experience, domain expertise, skills, and industry network" },
        market: { type: "string", description: "Target market" },
      },
      required: ["idea", "background"],
    },
  },
  {
    name: "interview_synthetic_user",
    description: "Simulate a live customer discovery interview with a target user persona archetype. Extracts real objections, latent needs, willingness to pay, and interview synthesis.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "The product idea" },
        founder: FOUNDER_SCHEMA,
        persona: { type: "string", description: "Optional specific persona archetype to interview (e.g. 'Freelance Designer')" },
        market: { type: "string", description: "Target market" },
      },
      required: ["idea"],
    },
  },
  {
    name: "generate_pitch_deck",
    description: "Generate an investor-ready 10-12 slide pitch deck draft according to YC, Sequoia, or a16z venture capital frameworks, with headlines, proof points, visual concepts, and speaker scripts.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "The product idea" },
        founder: FOUNDER_SCHEMA,
        template: { type: "string", description: "Pitch framework: 'yc', 'sequoia', 'a16z' (default: yc)" },
        company: { type: "string", description: "Company name override" },
        enableSearch: { type: "boolean", description: "Enable web research before analysis (default: true)" },
      },
      required: ["idea"],
    },
  },
  {
    name: "evolve_idea",
    description: "Diagnose an idea's primary bottleneck and generate 3 structural pivot/evolution variants (B2B wedge, product-led distribution, vertical specialist) with projected score improvements.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "The product idea" },
        founder: FOUNDER_SCHEMA,
        focus: { type: "string", description: "Weak dimension to target: distribution, monetization, pain, differentiation, retention" },
        enableSearch: { type: "boolean", description: "Enable web research before analysis (default: true)" },
      },
      required: ["idea"],
    },
  },
  {
    name: "scan_compliance",
    description: "Scan product idea for legal, privacy, and regulatory landmines (GDPR, CCPA, HIPAA, EU AI Act, COPPA, FinTech), severity matrix, and pre-launch engineering privacy checklist.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "The product idea" },
        founder: FOUNDER_SCHEMA,
        regions: { type: "string", description: "Comma-separated target operating regions (e.g. 'us,eu')" },
        enableSearch: { type: "boolean", description: "Enable web research before analysis (default: true)" },
      },
      required: ["idea"],
    },
  },
  {
    name: "build_assumption_ledger",
    description: "List the falsifiable assumptions a product idea depends on. Each carries a criticality (fatal/major/minor), the cheapest test that could disprove it, a timebox and cost, and a kill threshold naming a concrete number. Returns them ordered cheapest-idea-killing-test-first. Use this when the user asks what to validate, what to test first, what would make the idea fail, or how to de-risk before building.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "The product idea" },
        founder: FOUNDER_SCHEMA,
        maxAssumptions: { type: "number", description: "How many assumptions to surface (3-10, default 6)" },
        enableSearch: { type: "boolean", description: "Enable web research before analysis (default: true)" },
      },
      required: ["idea"],
    },
  },
];
