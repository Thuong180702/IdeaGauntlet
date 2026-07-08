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
import {
  COURT_ROLES,
  buildOpeningPrompt,
  buildCrossExaminationPrompt,
  buildRebuttalPrompt,
  buildVerdictPrompt,
  type RoleDefinition,
} from "./courtPhases.js";

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
  },
): Promise<GauntletReport> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const transcript: CourtTurn[] = [];

  // Web research — always-on unless explicitly disabled
  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await performResearch(idea, "court");
    } catch {
      // Silent fallback
    }
  }

  // Merge custom roles with defaults (custom replaces matching IDs, appends new)
  const roles = mergeRoles(COURT_ROLES, options?.customRoles);

  // ─── Phase 1: Opening Statements (parallel) ────────────────────
  const openingPromises = roles.map(async (role) => {
    try {
      const { system, user } = buildOpeningPrompt(role, idea, research);
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
    } catch {
      return {
        roleId: role.id,
        roleName: role.name,
        argument: `[${role.name} could not present opening statement]`,
      };
    }
  });

  const openings = await Promise.all(openingPromises);

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
  } catch {
    crossExam = { keyConflicts: [], openQuestions: [] };
  }

  // ─── Phase 3: Rebuttals (parallel — skeptics only) ──────────────
  const skeptics = roles.filter(
    (r) => r.stance === "skeptic" || r.stance === "defender" || r.stance === "user",
  );

  const rebuttalPromises = skeptics.map(async (role) => {
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
    } catch {
      return {
        roleId: role.id,
        roleName: role.name,
        argument: `[${role.name} could not present rebuttal]`,
      };
    }
  });

  const rebuttals = await Promise.all(rebuttalPromises);

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
    };

    reportVerdict = mapVerdict(parsed.verdictDetail ?? "");
  } catch {
    // Fallback — construct minimal debate from openings + rebuttals
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
