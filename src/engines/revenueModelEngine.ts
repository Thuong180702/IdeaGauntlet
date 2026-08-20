import type { LLMProvider, IdeaInput, RevenueModel, RevenueModelOption, Confidence } from "../core/types.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

const REVENUE_MODELS = [
  "subscription_saas",
  "usage_based",
  "freemium",
  "marketplace_take_rate",
  "per_seat_licensing",
  "one_time_purchase",
  "advertising",
  "data_licensing",
  "enterprise_contract",
  "api_pay_per_call",
  "professional_services",
  "hybrid",
];

/**
 * Revenue Model Explorer Engine
 * Evaluates all major revenue models against the idea,
 * ranks them by fit, and generates pricing tiers + projection.
 */
export async function runRevenueModelEngine(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: { enableSearch?: boolean; research?: ResearchBrief },
): Promise<RevenueModel> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for revenue model analysis.");
  }

  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress("Researching pricing benchmarks", () => performResearch(idea, "quick"));
    } catch (err: any) {
      warnIfError("revenueModelEngine: web research failed", err);
    }
  }

  const researchContext = research?.summary ?? "";
  const competitorPricing = research?.competitorLandscape?.competitors
    ?.filter((c) => c.pricing)
    .map((c) => `${c.name}: ${c.pricing}`)
    .join(", ") ?? "";

  const systemPrompt = `You are the Revenue Model Strategist in IdeaGauntlet.
Your job is to evaluate all major revenue models for this product idea and recommend the best fit.
Use competitor pricing benchmarks from research to ground your recommendations.

${researchContext}
${competitorPricing ? `Competitor pricing benchmarks: ${competitorPricing}` : ""}

Revenue models to evaluate: ${REVENUE_MODELS.join(", ")}

${IDEA_INJECTION_SYSTEM}

Return a single JSON object with these keys:

- recommendedModel (string — top pick from the list above)
- options (array of top 5 models, ordered by fitScore descending: {
    model: string (from the list),
    fitScore: number (1-10),
    rationale: string (why this model fits or doesn't),
    pros: string[] (2-4 advantages for this idea),
    cons: string[] (2-3 disadvantages),
    pricingRecommendation: string (specific price point or range, e.g. "$29-$99/mo"),
    revenueProjectionY1: string (conservative estimate, e.g. "$120K ARR with 50 customers at $200/mo"),
    revenueProjectionY3: string (optimistic but realistic, e.g. "$2.4M ARR"),
    whenToStartCharging: string (e.g. "Day 1 — charge from beta", "After 100 free users show retention"),
    comparablePricing: string[] (2-3 comparable products and their pricing)
  })
- monetizationTimeline (string — narrative of when/how to ramp monetization)
- pricingTiers (array of 2-4 tiers: {
    name: string (e.g. "Free", "Pro", "Team", "Enterprise"),
    price: string (e.g. "$0/mo", "$49/mo", "$199/mo", "Custom"),
    targetSegment: string,
    features: string[] (4-6 key features)
  })
- keyRevenueRisks (array of strings — 3-5 risks to monetization)
- confidence ("low"|"medium"|"high")

Return ONLY valid JSON.`;

  const userMessage = buildSafeUserMessage(idea.idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    idea.stage ? `Stage: ${idea.stage}` : "",
    "",
    "Evaluate all revenue models and produce pricing strategy as JSON.",
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.3,
      maxTokens: 4000,
    });
    const parsed = extractJSON<any>(response);
    if (!parsed) throw new Error("Failed to parse revenue model response");

    const options: RevenueModelOption[] = (parsed.options ?? []).map((o: any) => ({
      model: o.model ?? "subscription_saas",
      fitScore: Number(o.fitScore ?? 5),
      rationale: o.rationale ?? "",
      pros: Array.isArray(o.pros) ? o.pros : [],
      cons: Array.isArray(o.cons) ? o.cons : [],
      pricingRecommendation: o.pricingRecommendation ?? "N/A",
      revenueProjectionY1: o.revenueProjectionY1 ?? "N/A",
      revenueProjectionY3: o.revenueProjectionY3 ?? "N/A",
      whenToStartCharging: o.whenToStartCharging ?? "After MVP validation",
      comparablePricing: Array.isArray(o.comparablePricing) ? o.comparablePricing : [],
    }));

    return {
      recommendedModel: parsed.recommendedModel ?? "subscription_saas",
      options,
      monetizationTimeline: parsed.monetizationTimeline ?? "Monetization timeline TBD",
      pricingTiers: Array.isArray(parsed.pricingTiers) ? parsed.pricingTiers : [],
      keyRevenueRisks: Array.isArray(parsed.keyRevenueRisks) ? parsed.keyRevenueRisks : [],
      confidence: (parsed.confidence ?? "medium") as Confidence,
    };
  } catch (err: any) {
    warnIfError("revenueModelEngine: analysis failed", err);
    return {
      recommendedModel: "subscription_saas",
      options: [
        {
          model: "subscription_saas",
          fitScore: 6,
          rationale: "Default fallback — subscription SaaS is the most common model for software products",
          pros: ["Recurring revenue", "Predictable growth"],
          cons: ["High churn risk", "Needs fast time-to-value"],
          pricingRecommendation: "$29-$99/mo (standard SaaS range)",
          revenueProjectionY1: "Estimate unavailable — analysis failed",
          revenueProjectionY3: "Estimate unavailable — analysis failed",
          whenToStartCharging: "After 10 active users show retention >30% at 30 days",
          comparablePricing: [],
        },
      ],
      monetizationTimeline: "Revenue model analysis failed — fallback to standard SaaS model",
      pricingTiers: [
        { name: "Free", price: "$0/mo", targetSegment: "Individuals / trial", features: ["Core feature", "Up to 3 projects", "Community support"] },
        { name: "Pro", price: "$49/mo", targetSegment: "Power users / small teams", features: ["All Free features", "Unlimited projects", "Priority support", "API access"] },
        { name: "Team", price: "$149/mo", targetSegment: "Small teams", features: ["All Pro features", "Up to 10 seats", "Team dashboard", "SSO"] },
      ],
      keyRevenueRisks: ["Willingness to pay not validated", "Competitor pricing pressure", "High churn in early months"],
      confidence: "low",
    };
  }
}

export function formatRevenueModelReport(result: RevenueModel): string {
  const lines: string[] = [];
  lines.push("# Revenue Model Explorer\n");
  lines.push(`**Recommended Model:** \`${result.recommendedModel}\`\n`);
  lines.push(`**Monetization Timeline:** ${result.monetizationTimeline}\n`);

  if (result.options.length > 0) {
    lines.push("## Revenue Model Rankings\n");
    lines.push("| Rank | Model | Fit Score | Pricing |");
    lines.push("|---|---|---|---|");
    for (let i = 0; i < result.options.length; i++) {
      const o = result.options[i];
      const bar = "█".repeat(Math.round(o.fitScore / 2)) + "░".repeat(5 - Math.round(o.fitScore / 2));
      lines.push(`| ${i + 1} | ${o.model} | ${o.fitScore}/10 ${bar} | ${o.pricingRecommendation} |`);
    }
    lines.push("");

    const top = result.options[0];
    if (top) {
      lines.push(`### Top Pick: ${top.model}\n`);
      lines.push(top.rationale + "\n");
      lines.push(`✅ **Pros:** ${top.pros.join(" | ")}`);
      lines.push(`❌ **Cons:** ${top.cons.join(" | ")}\n`);
      lines.push(`**When to start charging:** ${top.whenToStartCharging}\n`);
      lines.push(`📈 **Year 1 projection:** ${top.revenueProjectionY1}`);
      lines.push(`📈 **Year 3 projection:** ${top.revenueProjectionY3}\n`);
      if (top.comparablePricing.length > 0) {
        lines.push(`**Comparable pricing:** ${top.comparablePricing.join(" | ")}\n`);
      }
    }
  }

  if (result.pricingTiers.length > 0) {
    lines.push("## Pricing Tiers\n");
    for (const tier of result.pricingTiers) {
      lines.push(`### ${tier.name} — ${tier.price}`);
      lines.push(`*${tier.targetSegment}*`);
      for (const f of tier.features) lines.push(`- ${f}`);
      lines.push("");
    }
  }

  if (result.keyRevenueRisks.length > 0) {
    lines.push("## Key Revenue Risks\n");
    for (const r of result.keyRevenueRisks) lines.push(`- ⚠️ ${r}`);
    lines.push("");
  }

  lines.push(`---\n*Confidence: ${result.confidence} | Revenue model analysis by IdeaGauntlet*\n`);
  return lines.join("\n");
}
