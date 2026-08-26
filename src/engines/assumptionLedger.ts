import type {
  LLMProvider,
  IdeaInput,
  AssumptionLedger,
  LedgerAssumption,
  AssumptionCriticality,
  Confidence,
} from "../core/types.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

/**
 * Assumption Ledger — the falsifiability engine.
 *
 * Every other mode answers "how good is this idea?". This one answers the
 * question that actually changes what a founder does on Monday: *what would have
 * to be true, and what is the cheapest way to find out it isn't?*
 *
 * Two rules keep it honest:
 *
 * 1. An assumption must be stated so it can be false, and must carry a
 *    `killThreshold` naming a number. "Users want this" is not an assumption;
 *    "fewer than 8 of 40 landing-page visitors leave an email" is.
 * 2. The test order is computed here, not asked of the model. Models are
 *    agreeable about ordering and will happily rank whatever was mentioned
 *    first; the arithmetic below is at least consistent.
 */

const CRITICALITY_WEIGHT: Record<AssumptionCriticality, number> = {
  fatal: 3,
  major: 2,
  minor: 1,
};

/** Low confidence means high information gain — worth testing sooner. */
const UNCERTAINTY_WEIGHT: Record<Confidence, number> = {
  low: 3,
  medium: 2,
  high: 1,
};

/** Anything resolvable in under a week and under $100 counts as cheap. */
function cheapnessWeight(timeboxDays: number, costUsd: number): number {
  const effort = Math.max(0, timeboxDays) + Math.max(0, costUsd) / 100;
  if (effort <= 3) return 3;
  if (effort <= 10) return 2;
  return 1;
}

/**
 * Priority = how fatal x how uncertain x how cheap to resolve.
 *
 * The product (not the sum) is deliberate: a cheap test for something that
 * cannot kill the idea should never outrank a slightly costlier test for
 * something that can.
 */
export function computeAssumptionPriority(a: {
  criticality: AssumptionCriticality;
  confidence: Confidence;
  test: { timeboxDays: number; costUsd: number };
}): number {
  return (
    CRITICALITY_WEIGHT[a.criticality] *
    UNCERTAINTY_WEIGHT[a.confidence] *
    cheapnessWeight(a.test.timeboxDays, a.test.costUsd)
  );
}

function coerceCriticality(raw: unknown): AssumptionCriticality {
  const v = String(raw ?? "").toLowerCase();
  if (v === "fatal" || v === "major" || v === "minor") return v;
  // Unknown criticality is treated as major: assuming an unlabelled assumption
  // is harmless is the mistake this engine exists to prevent.
  return "major";
}

function coerceConfidence(raw: unknown): Confidence {
  const v = String(raw ?? "").toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return "low";
}

function coerceNumber(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function slugify(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 5)
    .join("-");
  return base ? `a${index + 1}-${base}` : `a${index + 1}`;
}

export async function runAssumptionLedger(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: {
    /** Cap on how many assumptions to surface. Default 6. */
    maxAssumptions?: number;
    enableSearch?: boolean;
    research?: ResearchBrief;
  },
): Promise<AssumptionLedger> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required to build an assumption ledger.");
  }

  const maxAssumptions = Math.min(Math.max(options?.maxAssumptions ?? 6, 3), 10);

  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress(
        "Researching what is already known",
        () => performResearch(idea, "quick"),
      );
    } catch (err: any) {
      warnIfError("assumptionLedger: web research failed", err);
    }
  }

  const researchContext = research?.summary ?? "";

  const systemPrompt = `You are the Falsification Officer in IdeaGauntlet.

You do not judge whether the idea is good. You identify what must be TRUE for it
to work, and design the cheapest experiment that could prove each one FALSE.

${researchContext}

${IDEA_INJECTION_SYSTEM}

Rules — these are what make the output useful:

1. Every assumption must be stated so it CAN be false. State a claim, not a topic.
   BAD:  "User demand"
   GOOD: "Freelance designers will pay $20/mo for this rather than keep using a spreadsheet"

2. Every assumption needs a killThreshold naming a CONCRETE NUMBER — the result
   at which a founder should stop and change direction.
   BAD:  "Low signup rate"
   GOOD: "Fewer than 8 of 40 landing-page visitors leave an email"

3. Tests must be runnable by one person in days, without building the product.
   Fake-door pages, concierge delivery, cold outreach, competitor teardowns,
   manual spreadsheets. NOT "build an MVP" and NOT "do market research".

4. Prefer assumptions where being wrong is expensive. Demand, willingness to pay,
   and reachability of the audience kill more startups than technical difficulty.

5. If research above already settles an assumption, say so in whyItMatters and
   lower its criticality — do not invent work that has already been done.

Return a single JSON object:

- assumptions: array of ${maxAssumptions} objects ({
    statement: string (falsifiable claim, one sentence),
    criticality: "fatal" | "major" | "minor"
      - fatal: if false, this idea does not work in any form
      - major: if false, the idea needs a significant pivot
      - minor: if false, it costs time or margin but survives,
    confidence: "low" | "medium" | "high" (how sure can the founder be TODAY, before testing),
    whyItMatters: string (what breaks downstream if this is false),
    test: {
      method: string (concrete, runnable by one person),
      timeboxDays: number (calendar days),
      costUsd: number (0 is a valid answer),
      sampleSize: string (how much data makes the result readable, e.g. "40 visitors")
    },
    killThreshold: string (MUST contain a number),
    surviveSignal: string (what a passing result looks like)
  })
- riskiestAssumption: string (restate the single most dangerous one)
- summary: string (2-3 sentences: what this idea is really betting on)

Return ONLY valid JSON.`;

  const userMessage = buildSafeUserMessage(idea.idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    idea.stage ? `Stage: ${idea.stage}` : "",
    "",
    "Build the assumption ledger as JSON.",
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.3,
      maxTokens: 3500,
    });
    const parsed = extractJSON<any>(response);
    if (!parsed) throw new Error("Failed to parse assumption ledger response");

    const raw = Array.isArray(parsed.assumptions) ? parsed.assumptions : [];
    if (raw.length === 0) throw new Error("Assumption ledger response contained no assumptions");

    const assumptions = raw.slice(0, maxAssumptions).map((a: any, i: number): LedgerAssumption => {
      const statement = typeof a.statement === "string" && a.statement.trim()
        ? a.statement.trim()
        : "Unstated assumption";
      const criticality = coerceCriticality(a.criticality);
      const confidence = coerceConfidence(a.confidence);
      const test = {
        method: typeof a.test?.method === "string" && a.test.method.trim()
          ? a.test.method.trim()
          : "Define a concrete test before building",
        timeboxDays: Math.round(coerceNumber(a.test?.timeboxDays, 7)),
        costUsd: Math.round(coerceNumber(a.test?.costUsd, 0)),
        ...(typeof a.test?.sampleSize === "string" && a.test.sampleSize.trim()
          ? { sampleSize: a.test.sampleSize.trim() }
          : {}),
      };
      return {
        id: slugify(statement, i),
        statement,
        criticality,
        confidence,
        whyItMatters: typeof a.whyItMatters === "string" ? a.whyItMatters : "",
        test,
        killThreshold: typeof a.killThreshold === "string" && a.killThreshold.trim()
          ? a.killThreshold.trim()
          : "No threshold set — this assumption is not yet falsifiable.",
        surviveSignal: typeof a.surviveSignal === "string" ? a.surviveSignal : "",
        priority: computeAssumptionPriority({ criticality, confidence, test }),
      };
    });

    return finalizeLedger(
      assumptions,
      typeof parsed.riskiestAssumption === "string" ? parsed.riskiestAssumption : "",
      typeof parsed.summary === "string" ? parsed.summary : "",
    );
  } catch (err: any) {
    warnIfError("assumptionLedger: analysis failed", err);
    throw new Error(
      `Could not build an assumption ledger: ${err.message}. ` +
      "A ledger with invented thresholds would be worse than none, so nothing was returned.",
    );
  }
}

/**
 * Sort, total, and pick the riskiest assumption.
 *
 * Exported so tests can exercise the ordering without an LLM.
 */
export function finalizeLedger(
  assumptions: LedgerAssumption[],
  riskiestFromModel: string,
  summary: string,
): AssumptionLedger {
  const ordered = [...assumptions].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    // Stable, meaningful tiebreak: resolve the cheaper test first.
    const aEffort = a.test.timeboxDays + a.test.costUsd / 100;
    const bEffort = b.test.timeboxDays + b.test.costUsd / 100;
    return aEffort - bEffort;
  });

  const fatal = assumptions.filter((a) => a.criticality === "fatal");

  // The riskiest is the highest-priority fatal assumption when one exists —
  // computed rather than taken from the model, which tends to echo its own
  // first bullet. The model's phrasing is only a fallback.
  const riskiest = ordered.find((a) => a.criticality === "fatal") ?? ordered[0];

  const sum = (xs: LedgerAssumption[], pick: (a: LedgerAssumption) => number) =>
    xs.reduce((acc, a) => acc + pick(a), 0);

  return {
    assumptions: ordered,
    riskiestAssumption: riskiest?.statement ?? riskiestFromModel ?? "",
    testOrder: ordered.map((a) => a.id),
    totalTimeboxDays: sum(assumptions, (a) => a.test.timeboxDays),
    totalCostUsd: sum(assumptions, (a) => a.test.costUsd),
    fatalTimeboxDays: sum(fatal, (a) => a.test.timeboxDays),
    fatalCostUsd: sum(fatal, (a) => a.test.costUsd),
    summary: summary || "This idea's viability rests on the assumptions below.",
  };
}

const CRITICALITY_ICON: Record<AssumptionCriticality, string> = {
  fatal: "🔴",
  major: "🟠",
  minor: "🟡",
};

export function formatAssumptionLedger(ledger: AssumptionLedger): string {
  const lines: string[] = [];
  lines.push("# 🎯 Assumption Ledger\n");
  lines.push(`**This idea is betting on:** ${ledger.riskiestAssumption}\n`);
  lines.push(`${ledger.summary}\n`);

  lines.push("## Test order — cheapest idea-killing test first\n");

  ledger.assumptions.forEach((a, i) => {
    const money = a.test.costUsd === 0 ? "$0" : `$${a.test.costUsd}`;
    lines.push(`### ${i + 1}. ${CRITICALITY_ICON[a.criticality]} ${a.statement}`);
    lines.push("");
    lines.push(`- **If false:** ${a.criticality.toUpperCase()}${a.whyItMatters ? ` — ${a.whyItMatters}` : ""}`);
    lines.push(`- **Confidence today:** ${a.confidence}`);
    lines.push(`- **Test:** ${a.test.method}`);
    lines.push(`- **Cost to find out:** ${a.test.timeboxDays} days, ${money}${a.test.sampleSize ? ` (${a.test.sampleSize})` : ""}`);
    lines.push(`- **☠️ Kill threshold:** ${a.killThreshold}`);
    if (a.surviveSignal) lines.push(`- **✅ Survives if:** ${a.surviveSignal}`);
    lines.push("");
  });

  const fatalCount = ledger.assumptions.filter((a) => a.criticality === "fatal").length;
  lines.push("## Budget to de-risk\n");
  lines.push(`| | Days | Cost |`);
  lines.push(`|---|---|---|`);
  lines.push(`| Fatal assumptions only (${fatalCount}) | ${ledger.fatalTimeboxDays} | ${ledger.fatalCostUsd === 0 ? "$0" : `$${ledger.fatalCostUsd}`} |`);
  lines.push(`| Full ledger (${ledger.assumptions.length}) | ${ledger.totalTimeboxDays} | ${ledger.totalCostUsd === 0 ? "$0" : `$${ledger.totalCostUsd}`} |`);
  lines.push("");
  lines.push("---");
  lines.push("*Kill thresholds are set before running the test on purpose — deciding what counts as failure afterwards is how founders talk themselves past bad results.*\n");

  return lines.join("\n");
}
