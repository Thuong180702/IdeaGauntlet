import type {
  LLMProvider,
  IdeaInput,
  GauntletReport,
  SyntheticPersona,
  Verdict,
} from "../core/types.js";
import { buildReport } from "../core/report.js";

export async function runUserLab(
  idea: IdeaInput,
  provider: LLMProvider,
  count: number = 6,
): Promise<GauntletReport> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const systemPrompt = `You are a Synthetic User Generator. Generate ${count} fictional user archetypes. Each includes: name, archetype, goal, currentWorkaround, triggerToTry, primaryObjection, willingnessToPay (none/low/medium/high), likelyChurnReason, quote, interviewQuestion. Return a JSON object with a "users" array. Only valid JSON. IMPORTANT: These are fictional archetypes for hypothesis generation.`;
  const userMessage = `Product idea: ${idea.idea}${idea.targetUsers ? `\nTarget users: ${idea.targetUsers.join(", ")}` : ""}\n\nGenerate ${count} fictional user archetypes as JSON.`;

  let users: SyntheticPersona[] = [];

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.5,
      maxTokens: 2048,
    });
    const parsed = JSON.parse(response);
    users = (parsed.users ?? []).slice(0, count);
  } catch {
    users = [];
  }

  const report: GauntletReport = {
    id,
    createdAt: now,
    mode: "users",
    input: idea,
    verdict: "unclear" as Verdict,
    syntheticUsers: users,
    nextActions: users.map(
      (u) => `Interview a real user like "${u.name}": ${u.interviewQuestion}`,
    ),
    markdown: "",
  };
  report.markdown = buildReport(report);
  return report;
}
