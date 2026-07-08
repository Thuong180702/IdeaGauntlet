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

/**
 * Maps a verdict string from LLM output to the Verdict enum.
 * Handles common verbal phrasings like "promising but risky", "weak", etc.
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
  // Fallback: treat as unclear
  return "unclear";
}

export async function runCourtEngine(
  idea: IdeaInput,
  provider: LLMProvider,
): Promise<GauntletReport> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const transcript: CourtTurn[] = [];

  const systemPrompt = formatForCliPrompt(courtWorkflow, "court");
  const structuredSystem = `You are the Court Mode analyst in IdeaGauntlet.\n${systemPrompt}\n\nReturn a single valid JSON object only — no markdown fences, no extra text.`;

  const userMessage = [
    `Product idea: ${idea.idea}`,
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    idea.stage ? `Stage: ${idea.stage}` : "",
    "",
    "Analyze this idea across all roles and phases. Return a JSON object with these top-level keys:",
    "ideaSnapshot (object with idea, targetUser, market, stage, keyPromise)",
    "assumptionsMap (array of {assumption, riskLevel, whyItMatters})",
    "roleArguments (array of {roleId, roleName, argument})",
    "crossExamination (string)",
    "evidenceAudit (string)",
    "killTests (array of kill test objects with title, method, timeframe, successSignal, killSignal)",
    "scoresDetailed (array of {dimension, score, reason} — score 0-10)",
    "verdictDetail (string — include a one-word verdict prefix: 'strong', 'promising but risky', 'unclear', 'weak', 'needs real evidence', or 'pivot recommended')",
    "nextActions (array of string)",
  ].filter(Boolean).join("\n");

  let courtDebate: EnhancedCourtDebate | undefined;
  let reportVerdict: Verdict = "unclear";

  try {
    const response = await provider.complete(userMessage, {
      system: structuredSystem,
      temperature: 0.4,
      maxTokens: 4096,
    });

    const parsed = extractJSON<any>(response);

    if (!parsed) throw new Error("Failed to parse court response");

    // Build transcript for backward compatibility
    if (parsed.roleArguments) {
      for (const ra of parsed.roleArguments) {
        transcript.push({ role: ra.roleName ?? ra.roleId, argument: ra.argument });
      }
    }

    // Build enhanced court debate
    courtDebate = {
      ideaSnapshot: parsed.ideaSnapshot ?? {
        idea: idea.idea,
        targetUser: idea.targetUsers?.join(", ") ?? "",
        market: idea.market ?? "",
        stage: idea.stage ?? "",
        keyPromise: "",
      },
      assumptionsMap: parsed.assumptionsMap ?? [],
      roleArguments: parsed.roleArguments ?? [],
      crossExamination: parsed.crossExamination ?? "",
      evidenceAudit: parsed.evidenceAudit ?? "",
      verdictDetail: parsed.verdictDetail ?? "",
      killTests: parsed.killTests ?? [],
      scoresDetailed: parsed.scoresDetailed ?? [],
      nextActions: parsed.nextActions ?? [],
    };

    // Extract verdict from LLM response (Bug B fix)
    reportVerdict = mapVerdict(parsed.verdictDetail ?? "");
  } catch {
    // On parse failure, return minimal report with empty enhanced fields
    courtDebate = {
      ideaSnapshot: { idea: idea.idea, targetUser: "", market: "", stage: "", keyPromise: "" },
      assumptionsMap: [],
      roleArguments: [],
      crossExamination: "",
      evidenceAudit: "",
      verdictDetail: "Court debate encountered an error during analysis.",
      killTests: [],
      scoresDetailed: [],
      nextActions: ["Retry the court analysis with a shorter idea description."],
    };
    reportVerdict = "unclear";
  }

  const verdictText = courtDebate.verdictDetail || "Court debate completed.";
  const unresolvedQuestions: string[] = [];

  const report: GauntletReport = {
    id,
    createdAt: now,
    mode: "court",
    input: idea,
    verdict: reportVerdict,
    court: {
      transcript,
      verdict: verdictText,
      unresolvedQuestions,
    },
    courtDebate,
    markdown: "",
  };
  return report;
}
