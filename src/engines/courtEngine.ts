import type {
  LLMProvider,
  IdeaInput,
  GauntletReport,
  CourtTurn,
  Verdict,
} from "../core/types.js";
import { buildReport } from "../core/report.js";
import { COURT_ROLES } from "../prompts/courtPrompt.js";

export async function runCourtEngine(
  idea: IdeaInput,
  provider: LLMProvider,
): Promise<GauntletReport> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const transcript: CourtTurn[] = [];
  const userMessage = `Product idea: ${idea.idea}\n\nProvide your argument in 2-3 paragraphs. Be specific and direct.`;

  for (const role of COURT_ROLES) {
    const response = await provider.complete(userMessage, {
      system: role.system,
      temperature: 0.4,
      maxTokens: 512,
    });
    transcript.push({ role: role.name, argument: response.trim() });
  }

  let verdictText = "Court debate completed. See transcript for details.";
  let unresolvedQuestions: string[] = [];
  let reportVerdict: Verdict = "unclear";

  try {
    const judgeResponse = await provider.complete(
      `Court transcript:\n${transcript.map((t) => `${t.role}: ${t.argument}`).join("\n\n")}\n\nSynthesize a verdict as JSON with verdict and unresolvedQuestions.`,
      {
        system:
          "You are the Judge in IdeaGauntlet. Synthesize arguments into a conservative verdict.",
        temperature: 0.3,
        maxTokens: 512,
      },
    );
    const parsed = JSON.parse(judgeResponse);
    verdictText = parsed.verdict ?? verdictText;
    unresolvedQuestions = parsed.unresolvedQuestions ?? [];
    reportVerdict = normalizeVerdict(parsed.reportVerdict ?? parsed.status ?? parsed.verdictType, reportVerdict);
  } catch {
    // Use conservative defaults if judge parsing fails.
  }

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
    markdown: "",
  };
  report.markdown = buildReport(report);
  return report;
}

function normalizeVerdict(value: unknown, fallback: Verdict): Verdict {
  const allowed: Verdict[] = [
    "strong",
    "promising_but_risky",
    "unclear",
    "weak",
    "needs_real_evidence",
    "pivot_recommended",
  ];
  return typeof value === "string" && allowed.includes(value as Verdict)
    ? (value as Verdict)
    : fallback;
}
