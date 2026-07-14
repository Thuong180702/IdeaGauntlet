import { randomUUID } from "node:crypto";
import type {
  LLMProvider,
  IdeaInput,
  GauntletReport,
  SyntheticPersona,
  Verdict,
  EnhancedPersona,
  UserSynthesis,
} from "../core/types.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";

export async function runUserLab(
  idea: IdeaInput,
  provider: LLMProvider,
  count: number = 6,
  options?: { enableSearch?: boolean; research?: ResearchBrief },
): Promise<GauntletReport> {
  const id = randomUUID();
  const now = new Date().toISOString();

  // Web research — always-on unless explicitly disabled
  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await performResearch(idea, "users");
    } catch {
      // Silent fallback
    }
  }

  const researchContext = research?.summary ?? "";
  const systemPrompt = `You are a Synthetic User Generator for IdeaGauntlet.
Generate ${count} diverse fictional user archetypes. Each persona must be clearly labeled as fictional.

${researchContext}

For each persona include:
- name (string)
- archetype (string, e.g., "Busy Professional", "Price-Sensitive Student")
- segmentDescription (string — what segment they represent)
- context (string — their current situation)
- currentWorkaround (string — what they do now instead of this product — if competitors exist, name the specific competitor tool they use)
- triggerEvent (string — what would make them try the product)
- desiredOutcome (string — what they want to achieve)
- primaryObjection (string — why they might not use it)
- switchingCost (string — what makes it hard to switch from current solution)
- willingnessToPay ("none" | "low" | "medium" | "high")
- adoptionBlocker (string — the single biggest reason they won't adopt)
- likelyChurnReason (string — why they would stop using it)
- quote (string — a realistic quote in their voice, mentioning competitor if relevant)
- interviewQuestion (string — what to ask them in a real interview)

IMPORTANT: If the web research brief mentions competitors, each persona MUST reference at least one real competitor by name in their currentWorkaround or quote. Personas should react to real competitors — not pretend they don't exist. If the market is saturated, include personas from underserved segments that competitors miss.

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
    const parsed = extractJSON<any>(response);
    if (!parsed) throw new Error("Failed to parse users response");

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
    webResearch: research,
    markdown: "",
  };
  return report;
}
