import type { LLMProvider, IdeaInput, GTMStrategy, GTMChannel, GTMLaunchMilestone } from "../core/types.js";
import { requireAnalysis, toAnalysisFailure } from "../core/analysisError.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

/**
 * GTM Strategy Engine — Generates a detailed Go-To-Market strategy.
 * Produces channel priority matrix, launch playbook, budget allocation,
 * and first-100-customers strategy grounded in web research.
 */
export async function runGTMEngine(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: {
    enableSearch?: boolean;
    research?: ResearchBrief;
    budget?: string;
    timeline?: string;
  },
): Promise<GTMStrategy> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for GTM analysis.");
  }

  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress("Researching GTM landscape", () => performResearch(idea, "quick"));
    } catch (err: any) {
      warnIfError("gtmEngine: web research failed", err);
    }
  }

  const researchContext = research?.summary ?? "";
  const budgetContext = options?.budget ? `Available launch budget: ${options.budget}` : "Budget: assume lean/bootstrapped unless stated.";
  const timelineContext = options?.timeline ? `Launch timeline: ${options.timeline}` : "Timeline: target first paying customer within 90 days.";

  const systemPrompt = `You are the Go-To-Market (GTM) Strategy Director in IdeaGauntlet.
Your job is to create a concrete, actionable GTM strategy for the product idea.
Ground every recommendation in market realities from the research context below.
Avoid generic advice — be specific to this idea's distribution environment.

${researchContext}

${budgetContext}
${timelineContext}

${IDEA_INJECTION_SYSTEM}

Return a single JSON object with these keys:

- targetSegment (string — the specific beachhead customer segment, e.g. "Series A SaaS startups with 10-50 employees")
- positioningStatement (string — "For [target], [product] is the [category] that [benefit], unlike [alternative]")
- channels (array of objects: {
    name: string,
    type: "organic"|"paid"|"partnership"|"community"|"product_led",
    priority: "primary"|"secondary"|"experimental",
    estimatedCAC: string,
    timeToFirstCustomer: string,
    rationale: string,
    risks: string[]
  })
- first100CustomersStrategy (string — concrete tactics to get the first 100 paying customers)
- launchPlaybook (array of { week: string, action: string, goal: string, successSignal: string } — 6-8 milestones)
- budgetAllocation (array of { channel: string, percentage: number, note: string } — must sum to 100%)
- keyMetrics (array of strings — 4-6 north star + supporting metrics to track GTM success)
- biggestGTMRisk (string — the single most likely reason the GTM fails)
- confidence ("low"|"medium"|"high")

Return ONLY valid JSON.`;

  const userMessage = buildSafeUserMessage(idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    idea.stage ? `Stage: ${idea.stage}` : "",
    "",
    "Generate a detailed, actionable GTM strategy as JSON.",
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.4,
      maxTokens: 3000,
    });
    const parsed = requireAnalysis(extractJSON<any>(response), "GTM strategy", ["targetSegment", "channels"]);

    const channels: GTMChannel[] = (parsed.channels ?? []).map((c: any) => ({
      name: c.name ?? "Unknown channel",
      type: (c.type ?? "organic") as GTMChannel["type"],
      priority: (c.priority ?? "secondary") as GTMChannel["priority"],
      estimatedCAC: c.estimatedCAC ?? "N/A",
      timeToFirstCustomer: c.timeToFirstCustomer ?? "N/A",
      rationale: c.rationale ?? "",
      risks: Array.isArray(c.risks) ? c.risks : [],
    }));

    const launchPlaybook: GTMLaunchMilestone[] = (parsed.launchPlaybook ?? []).map((m: any) => ({
      week: m.week ?? "Week ?",
      action: m.action ?? "",
      goal: m.goal ?? "",
      successSignal: m.successSignal ?? "",
    }));

    return {
      targetSegment: parsed.targetSegment ?? "Early adopters in target market",
      positioningStatement: parsed.positioningStatement ?? "Positioning TBD",
      channels,
      first100CustomersStrategy: parsed.first100CustomersStrategy ?? "Direct outreach to target segment",
      launchPlaybook,
      budgetAllocation: Array.isArray(parsed.budgetAllocation) ? parsed.budgetAllocation : [],
      keyMetrics: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : [],
      biggestGTMRisk: parsed.biggestGTMRisk ?? "Distribution channel saturation",
      confidence: (parsed.confidence ?? "medium") as any,
    };
  } catch (err) {
    // No placeholder result: a made-up finding is worse than an explicit failure.
    throw toAnalysisFailure("GTM strategy", err);
  }
}

export function formatGTMReport(result: GTMStrategy): string {
  const lines: string[] = [];
  lines.push("# GTM Strategy Report\n");
  lines.push(`**Target Segment:** ${result.targetSegment}\n`);
  lines.push(`**Positioning:** ${result.positioningStatement}\n`);

  lines.push("## Channel Priority Matrix\n");
  lines.push("| Channel | Type | Priority | Est. CAC | Time to First Customer |");
  lines.push("|---|---|---|---|---|");
  for (const ch of result.channels) {
    const icon = ch.priority === "primary" ? "🎯" : ch.priority === "secondary" ? "⚡" : "🧪";
    lines.push(`| ${icon} ${ch.name} | ${ch.type} | ${ch.priority} | ${ch.estimatedCAC} | ${ch.timeToFirstCustomer} |`);
  }
  lines.push("");

  if (result.channels.length > 0) {
    lines.push("### Channel Details\n");
    for (const ch of result.channels.filter((c) => c.priority === "primary")) {
      lines.push(`**${ch.name}** — ${ch.rationale}`);
      if (ch.risks.length > 0) lines.push(`Risks: ${ch.risks.join(", ")}`);
      lines.push("");
    }
  }

  lines.push("## First 100 Customers Strategy\n");
  lines.push(result.first100CustomersStrategy + "\n");

  lines.push("## Launch Playbook\n");
  for (const m of result.launchPlaybook) {
    lines.push(`### ${m.week}`);
    lines.push(`**Action:** ${m.action}`);
    lines.push(`**Goal:** ${m.goal}`);
    lines.push(`✅ **Success signal:** ${m.successSignal}\n`);
  }

  if (result.budgetAllocation.length > 0) {
    lines.push("## Budget Allocation\n");
    lines.push("| Channel | % | Note |");
    lines.push("|---|---|---|");
    for (const b of result.budgetAllocation) {
      lines.push(`| ${b.channel} | ${b.percentage}% | ${b.note} |`);
    }
    lines.push("");
  }

  lines.push("## Key Metrics to Track\n");
  for (const m of result.keyMetrics) lines.push(`- ${m}`);
  lines.push("");

  lines.push(`> ⚠️ **Biggest GTM Risk:** ${result.biggestGTMRisk}\n`);
  lines.push(`---\n*Confidence: ${result.confidence} | GTM analysis by IdeaGauntlet*\n`);
  return lines.join("\n");
}
