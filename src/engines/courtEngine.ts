import { randomUUID } from "node:crypto";
import type {
  LLMProvider,
  IdeaInput,
  GauntletReport,
  CourtTurn,
  Verdict,
  EnhancedCourtDebate,
} from "../core/types.js";
import { courtWorkflow } from "../workflows/definitions/court.js";
import { formatForCliPrompt } from "../workflows/formatters/formatForCliPrompt.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import {
  COURT_ROLES,
  buildOpeningPrompt,
  buildCrossExaminationPrompt,
  buildRebuttalPrompt,
  buildVerdictPrompt,
  type RoleDefinition,
} from "./courtPhases.js";

/** Maximum number of LLM requests to run in parallel (avoids rate-limit 429s). */
const COURT_CONCURRENCY = 3;

/**
 * Run an array of async tasks with a concurrency limit.
 */
async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

/**
 * Maps a verdict string from LLM output to the Verdict enum.
 */
function mapVerdict(text: string): Verdict {
  if (!text) return "unclear";
  const lower = text.toLowerCase();
  if (lower.includes("strong") && !lower.includes("risky")) return "strong";
  if (lower.includes("promising") && lower.includes("risky")) return "promising_but_risky";
  if (lower.includes("pivot")) return "pivot_recommended";
  if (lower.includes("needs") && lower.includes("evidence")) return "needs_real_evidence";
  if (lower.includes("weak")) return "weak";
  if (lower.includes("unclear") || lower.includes("not clear") || lower.includes("unknown")) return "unclear";
  return "unclear";
}

export async function runCourtEngine(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: {
    enableSearch?: boolean;
    research?: ResearchBrief;
    customRoles?: RoleDefinition[];
    defenseArguments?: string[];
    autoDomainRoles?: boolean;
  },
): Promise<GauntletReport> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for court mode.");
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const transcript: CourtTurn[] = [];

  // Web research — always-on unless explicitly disabled
  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress("Researching market", () => performResearch(idea, "court"));
    } catch (err: any) {
      warnIfError("courtEngine: web research failed", err);
    }
  }

  // Dynamically generate domain specific expert roles
  let generatedRoles: RoleDefinition[] = [];
  if (options?.autoDomainRoles !== false) {
    generatedRoles = await generateDomainRoles(idea.idea, provider);
  }

  // Merge custom roles with defaults (custom replaces matching IDs, appends new)
  const combinedCustom = [...(options?.customRoles ?? []), ...generatedRoles];
  const roles = mergeRoles(COURT_ROLES, combinedCustom);

  // ─── Phase 1: Opening Statements (rate-limited parallel) ────────
  // Use concurrency limiter to avoid hitting rate limits with 7 simultaneous calls.
  const openingTasks = roles.map((role) => async () => {
    try {
      const { system, user } = buildOpeningPrompt(role, idea, research, { defenseArguments: options?.defenseArguments });
      const response = await provider.complete(user, {
        system,
        temperature: 0.5,
        maxTokens: 1024,
      });
      return {
        roleId: role.id,
        roleName: role.name,
        argument: response.trim(),
      };
    } catch (err: any) {
      warnIfError(`courtEngine: opening statement from ${role.name} failed`, err);
      return {
        roleId: role.id,
        roleName: role.name,
        argument: `[${role.name} could not present opening statement]`,
      };
    }
  });

  const openings = await withConcurrency(openingTasks, COURT_CONCURRENCY);

  // ─── Phase 2: Cross-Examination (single call) ───────────────────
  let crossExam: { keyConflicts: any[]; openQuestions: string[] };
  try {
    const { system, user } = buildCrossExaminationPrompt(openings, idea);
    const crossResponse = await provider.complete(user, {
      system,
      temperature: 0.3,
      maxTokens: 2048,
    });
    crossExam = extractJSON(crossResponse) ?? {
      keyConflicts: [],
      openQuestions: [],
    };
  } catch (err: any) {
    warnIfError("courtEngine: cross-examination failed", err);
    crossExam = { keyConflicts: [], openQuestions: [] };
  }

  // ─── Phase 3: Rebuttals (rate-limited parallel) ─────────────────
  // Include skeptics, defenders, and user-perspective roles in rebuttals
  // (all three stances have strong reason to respond to cross-examination).
  const rebuttalRoles = roles.filter(
    (r) => r.stance === "skeptic" || r.stance === "defender" || r.stance === "user",
  );

  const rebuttalTasks = rebuttalRoles.map((role) => async () => {
    try {
      const { system, user } = buildRebuttalPrompt(role, openings, crossExam);
      const response = await provider.complete(user, {
        system,
        temperature: 0.5,
        maxTokens: 768,
      });
      return {
        roleId: role.id,
        roleName: role.name,
        argument: response.trim(),
      };
    } catch (err: any) {
      warnIfError(`courtEngine: rebuttal from ${role.name} failed`, err);
      return {
        roleId: role.id,
        roleName: role.name,
        argument: `[${role.name} could not present rebuttal]`,
      };
    }
  });

  const rebuttals = await withConcurrency(rebuttalTasks, COURT_CONCURRENCY);

  // ─── Phase 4: Final Verdict (single call) ────────────────────────
  let courtDebate: EnhancedCourtDebate;
  let reportVerdict: Verdict = "unclear";

  try {
    const { system, user } = buildVerdictPrompt(
      openings,
      crossExam,
      rebuttals,
      idea,
      research,
      { defenseArguments: options?.defenseArguments },
    );
    const verdictResponse = await provider.complete(user, {
      system,
      temperature: 0.3,
      maxTokens: 4096,
    });

    const parsed = extractJSON<any>(verdictResponse);
    if (!parsed) throw new Error("Failed to parse verdict response");

    // Build transcript for backward compat
    for (const o of openings) {
      transcript.push({ role: o.roleName, argument: o.argument });
    }
    for (const r of rebuttals) {
      transcript.push({ role: `${r.roleName} (rebuttal)`, argument: r.argument });
    }

    courtDebate = {
      ideaSnapshot: parsed.ideaSnapshot ?? {
        idea: idea.idea,
        targetUser: idea.targetUsers?.join(", ") ?? "",
        market: idea.market ?? "",
        stage: idea.stage ?? "",
        keyPromise: "",
      },
      assumptionsMap: parsed.assumptionsMap ?? [],
      roleArguments: parsed.roleArguments?.length > 0
        ? parsed.roleArguments
        : [
            ...openings.map((o) => ({ roleId: o.roleId, roleName: o.roleName, argument: o.argument })),
            ...rebuttals.map((r) => ({ roleId: `${r.roleId}-rebuttal`, roleName: `${r.roleName} Rebuttal`, argument: r.argument })),
          ],
      crossExamination: parsed.crossExamination ?? crossExam.keyConflicts.map((c) => c.conflict).join("; "),
      evidenceAudit: parsed.evidenceAudit ?? "",
      verdictDetail: parsed.verdictDetail ?? "",
      killTests: parsed.killTests ?? [],
      scoresDetailed: parsed.scoresDetailed ?? [],
      nextActions: parsed.nextActions ?? [],
      competitorLandscape: parsed.competitorLandscape,
      nicheOpportunities: parsed.nicheOpportunities,
    };

    reportVerdict = mapVerdict(parsed.verdictDetail ?? "");
  } catch (err: any) {
    // Fallback — construct minimal debate from openings + rebuttals
    warnIfError("courtEngine: verdict synthesis failed", err);
    for (const o of openings) {
      transcript.push({ role: o.roleName, argument: o.argument });
    }

    courtDebate = {
      ideaSnapshot: { idea: idea.idea, targetUser: "", market: "", stage: "", keyPromise: "" },
      assumptionsMap: [],
      roleArguments: [
        ...openings.map((o) => ({ roleId: o.roleId, roleName: o.roleName, argument: o.argument })),
        ...rebuttals.map((r) => ({ roleId: `${r.roleId}-rebuttal`, roleName: `${r.roleName} Rebuttal`, argument: r.argument })),
      ],
      crossExamination: crossExam.keyConflicts.map((c) => c.conflict).join("; "),
      evidenceAudit: "Verdict parsing failed. Evidence audit unavailable.",
      verdictDetail: "Court debate encountered an error during verdict synthesis.",
      killTests: [],
      scoresDetailed: [],
      nextActions: ["Retry the court analysis with a shorter idea description."],
      competitorLandscape: research?.competitorLandscape,
      nicheOpportunities: research?.nicheOpportunities,
    };
    reportVerdict = "unclear";
  }

  const verdictText = courtDebate.verdictDetail || "Court debate completed.";

  const report: GauntletReport = {
    id,
    createdAt: now,
    mode: "court",
    input: idea,
    verdict: reportVerdict,
    court: {
      transcript,
      verdict: verdictText,
      unresolvedQuestions: crossExam.openQuestions,
    },
    courtDebate,
    webResearch: research,
    markdown: "",
  };
  return report;
}

async function generateDomainRoles(idea: string, provider: LLMProvider): Promise<RoleDefinition[]> {
  const prompt = `Analyze the following startup idea: "${idea}"
Determine which business/technical domain it belongs to (e.g. Healthcare, Web3/Crypto, Enterprise SaaS, AI/ML, Consumer Marketplace, Biotech, Hardware).
Then, propose 1 to 2 specialized domain expert critique roles (with 'skeptic' stance) that would be highly relevant to audit this specific domain.
For example, for Biotech, you could propose "FDA/Regulatory Consultant" or "Clinical Trials Assessor".
For each role, provide:
- id (string: e.g. "healthcare-compliance-skeptic")
- name (string: e.g. "Healthcare Compliance Skeptic")
- stance (must be "skeptic")
- mandate (string: what they challenge)
- mustAddress (array of 3-4 specific questions they challenge)

Return ONLY a JSON array of these roles. No markdown code blocks, no other text.`;

  try {
    const response = await provider.complete(prompt, { temperature: 0.2 });
    const parsed = extractJSON<RoleDefinition[]>(response);
    if (Array.isArray(parsed)) {
      return parsed.filter(r => r && r.id && r.name && r.mandate && Array.isArray(r.mustAddress));
    }
  } catch (err: any) {
    // Silent fallback
    warnIfError("courtEngine: domain role generation failed", err);
  }
  return [];
}

/**
 * Merge custom roles into default roles.
 * Custom roles with matching IDs replace defaults; new roles are appended.
 */
function mergeRoles(
  defaults: RoleDefinition[],
  custom?: RoleDefinition[],
): RoleDefinition[] {
  if (!custom || custom.length === 0) return defaults;

  const customIds = new Set(custom.map((r) => r.id));
  const kept = defaults.filter((r) => !customIds.has(r.id));
  return [...kept, ...custom];
}
