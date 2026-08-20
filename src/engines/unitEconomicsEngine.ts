import type { LLMProvider, IdeaInput, UnitEconomics } from "../core/types.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

/**
 * Unit Economics Engine — Estimates LTV, CAC, Payback period, and unit viability.
 */
export async function runUnitEconomicsEngine(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: { enableSearch?: boolean; research?: ResearchBrief },
): Promise<UnitEconomics> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for unit economics analysis.");
  }

  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress("Researching pricing and acquisition data", () => performResearch(idea, "quick"));
    } catch (err: any) {
      warnIfError("unitEconomicsEngine: web research failed", err);
    }
  }

  const researchContext = research?.summary ?? "";
  const systemPrompt = `You are the Startup Unit Economics Specialist in IdeaGauntlet.
Your job is to analyze and estimate the fundamental unit economics for this startup idea:
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (LTV)
- LTV to CAC Ratio (Target: >3:1 for viable SaaS/products)
- Payback Period (Target: <12 months for capital efficiency)
- Gross Margin Estimate
- Recommended Pricing Strategy
- Unit Viability Verdict ("healthy" | "risky" | "unviable" | "unclear")
- Top 3 unit economics risks / failure modes

${researchContext}

${IDEA_INJECTION_SYSTEM}

Return a single JSON object with keys:
- cacEstimate (string — e.g. "$150-$300 via content & targeted outbound")
- ltvEstimate (string — e.g. "$1,200 assuming $50/mo ARPU and 24mo retention")
- ltvToCacRatio (string — e.g. "4.0x")
- paybackPeriodMonths (string — e.g. "4-6 months")
- grossMarginEstimate (string — e.g. "75-85%")
- pricingStrategy (string — suggested packaging, tiering, or value metric)
- sustainabilityVerdict ("healthy" | "risky" | "unviable" | "unclear")
- keyRisks (array of strings — 2-4 critical financial/distribution risks)

Return ONLY valid JSON — no markdown code fences, no extra text.`;

  const userMessage = buildSafeUserMessage(idea.idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    "",
    "Estimate unit economics breakdown and viability verdict as JSON.",
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
    });
    const parsed = extractJSON<any>(response);
    if (!parsed) throw new Error("Failed to parse unit economics response");

    return {
      cacEstimate: parsed.cacEstimate ?? "CAC estimate unavailable",
      ltvEstimate: parsed.ltvEstimate ?? "LTV estimate unavailable",
      ltvToCacRatio: parsed.ltvToCacRatio ?? "N/A",
      paybackPeriodMonths: parsed.paybackPeriodMonths ?? "N/A",
      grossMarginEstimate: parsed.grossMarginEstimate ?? "N/A",
      pricingStrategy: parsed.pricingStrategy ?? "Value-based subscription",
      sustainabilityVerdict: (parsed.sustainabilityVerdict ?? "unclear") as any,
      keyRisks: Array.isArray(parsed.keyRisks) ? parsed.keyRisks : [],
    };
  } catch (err: any) {
    warnIfError("unitEconomicsEngine: analysis failed", err);
    return {
      cacEstimate: "Estimated $200-$500 baseline based on B2B/B2C hybrid benchmarks",
      ltvEstimate: "Estimated $800-$1,500 based on standard industry retention",
      ltvToCacRatio: "2.5x-3.0x",
      paybackPeriodMonths: "6-9 months",
      grossMarginEstimate: "70-80%",
      pricingStrategy: "Tiered subscription with monthly/annual billing",
      sustainabilityVerdict: "unclear",
      keyRisks: ["CAC escalation risk in competitive search/social channels"],
      // NOTE: this is a fallback — research or LLM call failed. Do not rely on these numbers.
      isErrorFallback: true,
    } as any;
  }
}
