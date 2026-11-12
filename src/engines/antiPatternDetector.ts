import type { LLMProvider, IdeaInput, AntiPatternReport, AntiPatternResult, Severity } from "../core/types.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

export const STARTUP_ANTI_PATTERNS = [
  {
    id: "solution_in_search_of_problem",
    name: "Solution in Search of a Problem",
    description: "Built around exciting technology (AI, Blockchain, AR) rather than an urgent, painful user problem.",
  },
  {
    id: "feature_not_product",
    name: "Feature Not a Product",
    description: "A single capability that existing market leaders can and will easily absorb as a minor feature update.",
  },
  {
    id: "vitamin_not_painkiller",
    name: "Vitamin vs. Painkiller",
    description: "Nice-to-have optimization with low urgency; users churn quickly when budgets tighten.",
  },
  {
    id: "marketplace_cold_start",
    name: "Marketplace Chicken-and-Egg Trap",
    description: "Requires simultaneous critical mass of buyers and sellers without a viable single-player mode.",
  },
  {
    id: "platform_dependency",
    name: "Platform Dependency Risk",
    description: "100% dependent on another platform's API/rules (e.g. OpenAI wrapper, Shopify plugin) with high platform risk.",
  },
  {
    id: "low_frequency_high_churn",
    name: "Low Frequency / High Churn",
    description: "The problem only occurs occasionally (e.g. once a year), making habit formation and organic retention near impossible.",
  },
  {
    id: "bad_unit_economics_trap",
    name: "Unit Economics Illusion",
    description: "High acquisition costs and high manual operational burden crush margins despite seeming scalable.",
  },
  {
    id: "regulatory_landmine",
    name: "Regulatory & Compliance Landmine",
    description: "Unanticipated legal, privacy, or compliance barriers (HIPAA, SEC, GDPR) that stall execution.",
  },
  {
    id: "consulting_masquerade",
    name: "Consulting Masquerading as Software",
    description: "Requires bespoke manual onboarding, custom data engineering, or heavy human labor for each customer.",
  },
  {
    id: "copycat_without_wedge",
    name: "Direct Copycat Without Wedge",
    description: "Directly mimics a well-funded incumbent without a sharp 10x differentiator, niche, or wedge.",
  },
];

/**
 * Anti-Pattern Detector — Audits an idea against 10 common startup failure patterns.
 */
export async function runAntiPatternDetector(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: { enableSearch?: boolean; research?: ResearchBrief },
): Promise<AntiPatternReport> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for anti-pattern detection.");
  }

  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress("Auditing against startup anti-patterns", () => performResearch(idea, "quick"));
    } catch (err: any) {
      warnIfError("antiPatternDetector: web research failed", err);
    }
  }

  const researchContext = research?.summary ?? "";
  const patternsList = STARTUP_ANTI_PATTERNS.map((p) => `- ${p.id} (${p.name}): ${p.description}`).join("\n");

  const systemPrompt = `You are the Lead Startup Failure Mode & Anti-Pattern Auditor in IdeaGauntlet.
Your job is to rigorously test if the given product idea falls into any of these 10 classic startup traps:

${patternsList}

${researchContext}

${IDEA_INJECTION_SYSTEM}

Evaluate EACH pattern. Only mark matched: true if there is a genuine, concrete risk for this specific idea (do not mark all true or all false).
For each detected pattern, explain why and provide concrete prevention advice.

Return a single JSON object with:
- detectedPatterns (array of objects: { patternId, name, matched: boolean, severity: "low"|"medium"|"high"|"critical", explanation: string, preventionAdvice: string })
- overallRiskLevel ("low" | "medium" | "high" | "critical")
- summary (string — 2-3 sentences summarizing the biggest anti-pattern risks and how the founder can avoid them)

Return ONLY valid JSON.`;

  const userMessage = buildSafeUserMessage(idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    "",
    "Audit idea against the 10 startup anti-patterns and return JSON.",
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.3,
      maxTokens: 3000,
    });
    const parsed = extractJSON<any>(response);
    if (!parsed) throw new Error("Failed to parse anti-pattern response");

    const detectedPatterns: AntiPatternResult[] = (parsed.detectedPatterns ?? []).map((p: any) => ({
      patternId: p.patternId ?? "unknown",
      name: p.name ?? "Unknown Pattern",
      matched: Boolean(p.matched),
      severity: (p.severity ?? "medium") as Severity,
      explanation: p.explanation ?? "",
      preventionAdvice: p.preventionAdvice ?? "",
    }));

    return {
      detectedPatterns,
      overallRiskLevel: (parsed.overallRiskLevel ?? "medium") as Severity,
      summary: parsed.summary ?? "Anti-pattern analysis completed.",
    };
  } catch (err: any) {
    warnIfError("antiPatternDetector: analysis failed", err);
    return {
      detectedPatterns: STARTUP_ANTI_PATTERNS.map((p) => ({
        patternId: p.id,
        name: p.name,
        matched: false,
        severity: "low",
        explanation: "Audit fallback mode",
        preventionAdvice: "Validate with real customers early",
      })),
      overallRiskLevel: "low",
      summary: "Anti-pattern audit fallback mode.",
    };
  }
}
