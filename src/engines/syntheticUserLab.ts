import type {
  LLMProvider,
  IdeaInput,
  GauntletReport,
  SyntheticPersona,
  Verdict,
  EnhancedPersona,
  UserSynthesis,
} from "../core/types.js";
import { buildReport } from "../core/report.js";

export async function runUserLab(
  idea: IdeaInput,
  provider: LLMProvider,
  count: number = 6,
): Promise<GauntletReport> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const systemPrompt = `You are a Synthetic User Generator for IdeaGauntlet.
Generate ${count} diverse fictional user archetypes. Each persona must be clearly labeled as fictional.

For each persona include:
- name (string)
- archetype (string, e.g., "Busy Professional", "Price-Sensitive Student")
- segmentDescription (string — what segment they represent)
- context (string — their current situation)
- currentWorkaround (string — what they do now instead of this product)
- triggerEvent (string — what would make them try the product)
- desiredOutcome (string — what they want to achieve)
- primaryObjection (string — why they might not use it)
- switchingCost (string — what makes it hard to switch from current solution)
- willingnessToPay ("none" | "low" | "medium" | "high")
- adoptionBlocker (string — the single biggest reason they won't adopt)
- likelyChurnReason (string — why they would stop using it)
- quote (string — a realistic quote in their voice)
- interviewQuestion (string — what to ask them in a real interview)

Also return a synthesis object with:
- recurringObjections (string[] — objections that appear across personas)
- surprisingSegments (string[] — segments you didn't expect to care)
- segmentsLikelyToCare (string[] — segments most likely to adopt)
- segmentsUnlikelyToCare (string[] — segments unlikely to adopt)
- interviewQuestions (string[] — top 5 questions for real user interviews)
- fakeDoorTestIdeas (string[] — 2-3 fake-door test ideas)

Return a JSON object with keys: "users" (array) and "synthesis" (object). Only valid JSON.
IMPORTANT: These are fictional archetypes for hypothesis generation.`;

  const userMessage = `Product idea: ${idea.idea}${idea.targetUsers ? `\nTarget users: ${idea.targetUsers.join(", ")}` : ""}\n\nGenerate ${count} fictional user archetypes with synthesis as JSON.`;

  let users: SyntheticPersona[] = [];
  let enhancedUsers: EnhancedPersona[] = [];
  let synthesis: UserSynthesis | undefined;

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.5,
      maxTokens: 4096,
    });
    const parsed = JSON.parse(response);

    // Build basic SyntheticPersona[] for backward compat
    const rawUsers: any[] = (parsed.users ?? []).slice(0, count);
    users = rawUsers.map((u: any) => ({
      name: u.name ?? "Unknown",
      archetype: u.archetype ?? "Unknown",
      goal: u.desiredOutcome ?? u.goal ?? "",
      currentWorkaround: u.currentWorkaround ?? "",
      triggerToTry: u.triggerEvent ?? u.triggerToTry ?? "",
      primaryObjection: u.primaryObjection ?? "",
      willingnessToPay: (u.willingnessToPay ?? "none") as any,
      likelyChurnReason: u.likelyChurnReason ?? "",
      quote: u.quote ?? "",
      interviewQuestion: u.interviewQuestion ?? "",
    }));

    enhancedUsers = rawUsers.map((u: any) => ({
      name: u.name ?? "Unknown",
      archetype: u.archetype ?? "Unknown",
      segmentDescription: u.segmentDescription ?? "",
      context: u.context ?? "",
      currentWorkaround: u.currentWorkaround ?? "",
      triggerEvent: u.triggerEvent ?? u.triggerToTry ?? "",
      desiredOutcome: u.desiredOutcome ?? u.goal ?? "",
      primaryObjection: u.primaryObjection ?? "",
      switchingCost: u.switchingCost ?? "",
      willingnessToPay: (u.willingnessToPay ?? "none") as any,
      adoptionBlocker: u.adoptionBlocker ?? "",
      likelyChurnReason: u.likelyChurnReason ?? "",
      quote: u.quote ?? "",
      interviewQuestion: u.interviewQuestion ?? "",
    }));

    if (parsed.synthesis) {
      synthesis = {
        recurringObjections: parsed.synthesis.recurringObjections ?? [],
        surprisingSegments: parsed.synthesis.surprisingSegments ?? [],
        segmentsLikelyToCare: parsed.synthesis.segmentsLikelyToCare ?? [],
        segmentsUnlikelyToCare: parsed.synthesis.segmentsUnlikelyToCare ?? [],
        interviewQuestions: parsed.synthesis.interviewQuestions ?? [],
        fakeDoorTestIdeas: parsed.synthesis.fakeDoorTestIdeas ?? [],
      };
    }
  } catch {
    users = [];
    enhancedUsers = [];
  }

  const report: GauntletReport = {
    id,
    createdAt: now,
    mode: "users",
    input: idea,
    verdict: "unclear" as Verdict,
    syntheticUsers: users,
    enhancedSyntheticUsers: enhancedUsers,
    userSynthesis: synthesis,
    nextActions: users.map(
      (u) => `Interview a real user like "${u.name}": ${u.interviewQuestion}`,
    ),
    markdown: "",
  };
  report.markdown = buildReport(report);
  return report;
}
