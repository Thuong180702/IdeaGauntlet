import type { LLMProvider, IdeaInput, IdeaEvolution, IdeaVariant } from "../core/types.js";
import { requireAnalysis, toAnalysisFailure } from "../core/analysisError.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

/**
 * Idea Evolution Coach & Pivot Generator Engine
 *
 * Diagnoses the weakest dimensions of an idea (e.g. distribution, monetization, pain intensity)
 * and generates 3 distinct, high-leverage pivot/evolution variants (e.g. B2B wedge, developer tool,
 * vertical-specific SaaS) with estimated score deltas and validation experiments.
 */
export async function runEvolutionCoach(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: {
    focusDimension?: "distribution" | "monetization" | "pain" | "differentiation" | "buildability" | "retention";
    enableSearch?: boolean;
    research?: ResearchBrief;
  },
): Promise<IdeaEvolution> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for idea evolution coaching.");
  }

  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress("Analyzing market vectors for evolution", () => performResearch(idea, "quick"));
    } catch (err: any) {
      warnIfError("evolutionCoach: web research failed", err);
    }
  }

  const focusContext = options?.focusDimension
    ? `Specific focus constraint: Founder specifically wants to strengthen the "${options.focusDimension}" dimension.`
    : "Diagnose the single weakest bottleneck across distribution, monetization, urgency, and differentiation.";

  const researchContext = research?.summary ?? "";

  const systemPrompt = `You are the Lead Startup Pivot & Idea Evolution Strategist in IdeaGauntlet.
Your job is to take an early-stage product idea and generate 3 sharp, strategically evolved variants that overcome its core weaknesses.

${focusContext}
${researchContext}

Rules for generating variants:
1. Don't make minor cosmetic tweaks. Make structural improvements: changing the business model, shifting to a higher-WTP beachhead customer, flipping from consumer to B2B, or embedding a viral distribution mechanic.
2. Variant 1: "The High-WTP B2B Wedge" (tackles monetization and urgency)
3. Variant 2: "The Organic Viral / Product-Led Distribution Angle" (tackles CAC and distribution)
4. Variant 3: "The Vertical Deep Specialist" (tackles differentiation and retention in a high-urgency niche)

${IDEA_INJECTION_SYSTEM}

Return a single JSON object with these keys:

- originalIdea: string
- primaryBottleneck: string (clear diagnosis of why the original idea struggles)
- oneBigChangeRecommendation: string (if the founder could change only ONE thing about their idea today, what should it be?)
- variants: array of 3 objects ({
    variantName: string (catchy, descriptive name),
    angle: string (e.g. "B2B Enterprise Focus Wedge", "Open Source DevTool", "Vertical SaaS for Healthcare"),
    oneSentencePitch: string (crisp 1-sentence value proposition),
    coreChange: string (what fundamentally changed compared to the original idea),
    whyThisWorksBetter: string (why this overcomes the primary bottleneck),
    estimatedScoreDeltas: {
      clarity?: number (-2 to +4),
      pain?: number (-2 to +4),
      differentiation?: number (-2 to +4),
      buildability?: number (-2 to +4),
      distribution?: number (-2 to +4),
      monetization?: number (-2 to +4),
      evidence?: number (-2 to +4)
    },
    newTargetCustomer: string,
    risks: array of strings (2-3 new risks specific to this variant)
  })
- suggestedExperiment: string (the single fastest 48-hour smoke test to validate the top variant)

Return ONLY valid JSON.`;

  const userMessage = buildSafeUserMessage(idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    idea.stage ? `Stage: ${idea.stage}` : "",
    "",
    "Diagnose core bottlenecks and generate 3 evolved pivot variants as JSON.",
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.5,
      maxTokens: 3500,
    });
    const parsed = requireAnalysis(extractJSON<any>(response), "Idea evolution analysis", ["variants"]);

    const variants: IdeaVariant[] = (parsed.variants ?? []).map((v: any) => ({
      variantName: v.variantName ?? "Evolved Variant",
      angle: v.angle ?? "Strategic Pivot",
      oneSentencePitch: v.oneSentencePitch ?? "",
      coreChange: v.coreChange ?? "",
      whyThisWorksBetter: v.whyThisWorksBetter ?? "",
      estimatedScoreDeltas: v.estimatedScoreDeltas ?? {},
      newTargetCustomer: v.newTargetCustomer ?? "",
      risks: Array.isArray(v.risks) ? v.risks : [],
    }));

    return {
      originalIdea: idea.idea,
      primaryBottleneck: parsed.primaryBottleneck ?? "Distribution and willingness to pay uncertainty",
      oneBigChangeRecommendation: parsed.oneBigChangeRecommendation ?? "Shift from broad consumer audience to a specific high-budget B2B niche.",
      variants,
      suggestedExperiment: parsed.suggestedExperiment ?? "Create 2 contrasting landing pages with pricing and run $50 in targeted ads to measure email waitlist conversion.",
    };
  } catch (err) {
    // No placeholder result: a made-up finding is worse than an explicit failure.
    throw toAnalysisFailure("Idea evolution analysis", err);
  }
}

export function formatIdeaEvolutionReport(evolution: IdeaEvolution): string {
  const lines: string[] = [];
  lines.push("# 🧬 Idea Evolution & Pivot Strategy Report\n");
  lines.push(`**Original Idea:** *"${evolution.originalIdea}"*\n`);

  lines.push(`> 🚨 **Primary Bottleneck:** ${evolution.primaryBottleneck}\n`);
  lines.push(`> 💡 **The #1 Change to Make:** ${evolution.oneBigChangeRecommendation}\n`);

  lines.push("## 🔀 Evolved Idea Variants\n");
  for (let i = 0; i < evolution.variants.length; i++) {
    const v = evolution.variants[i];
    lines.push(`### Variant ${i + 1}: ${v.variantName}`);
    lines.push(`**Strategic Angle:** \`${v.angle}\``);
    lines.push(`**Target Customer:** *${v.newTargetCustomer}*\n`);
    lines.push(`📢 **Pitch:** *"${v.oneSentencePitch}"*\n`);
    lines.push(`🔄 **What Changed:** ${v.coreChange}`);
    lines.push(`🚀 **Why This Wins:** ${v.whyThisWorksBetter}\n`);

    const deltas = Object.entries(v.estimatedScoreDeltas ?? {});
    if (deltas.length > 0) {
      const deltaStr = deltas.map(([k, val]) => `${k}: ${val! > 0 ? `+${val}` : val}`).join(" | ");
      lines.push(`📊 **Projected Score Deltas:** \`${deltaStr}\``);
    }

    if (v.risks.length > 0) {
      lines.push(`⚠️ **New Risks:** ${v.risks.join("; ")}`);
    }
    lines.push("\n---\n");
  }

  lines.push("## 🧪 48-Hour Validation Experiment\n");
  lines.push(evolution.suggestedExperiment + "\n");

  lines.push("---\n*Idea evolution strategy powered by IdeaGauntlet*\n");
  return lines.join("\n");
}
