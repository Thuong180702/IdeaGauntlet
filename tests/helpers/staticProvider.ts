import type { CompletionOptions, LLMProvider } from "../../src/core/types.js";

export class StaticProvider implements LLMProvider {
  kind = "custom" as const;

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const combined = `${options?.system ?? ""}\n${prompt}`;

    if (combined.includes("Synthetic User Generator")) {
      return JSON.stringify({
        users: [
          {
            name: "Alex Chen",
            archetype: "Busy Student",
            goal: "Focus on exam prep",
            currentWorkaround: "Study-with-me videos",
            triggerToTry: "Exam week stress",
            primaryObjection: "Could feel unnecessary",
            willingnessToPay: "low",
            likelyChurnReason: "Novelty fades",
            quote: "I would try it if it helps me start.",
            interviewQuestion: "What do you do when you cannot focus?",
          },
          {
            name: "Maya Rodriguez",
            archetype: "Remote Designer",
            goal: "Deep work without isolation",
            currentWorkaround: "Coworking cafes",
            triggerToTry: "Long solo work sessions",
            primaryObjection: "AI presence may not feel real",
            willingnessToPay: "medium",
            likelyChurnReason: "Not enough measurable benefit",
            quote: "I need calm accountability, not another distraction.",
            interviewQuestion: "What makes coworking useful for you?",
          },
        ],
      });
    }

    if (combined.includes("MVP") || combined.includes("14-day MVP")) {
      return JSON.stringify({
        goal: "Test whether users complete more work with synthetic presence",
        scope: ["Fake-door landing page", "Single-session prototype", "Five user interviews"],
        nonGoals: ["Payments", "Mobile app", "Team workspace"],
        timeline: "14 days",
        metrics: ["40% session completion", "5 qualified interviews", "3 users request follow-up"],
      });
    }

    if (combined.includes("Judge") || combined.includes("Synthesize")) {
      return JSON.stringify({
        verdict: "The idea is promising but needs direct evidence from target users.",
        reportVerdict: "promising_but_risky",
        unresolvedQuestions: ["Will users return after novelty fades?", "Will users pay for focus outcomes?"],
      });
    }

    if (combined.includes("Skeptic") || combined.includes("immune")) {
      return JSON.stringify({
        coreInsight: "The idea targets a real pain point but depends on behavior change.",
        strongestCase: "Users already using focus workarounds may adopt if the product is calmer and lower-friction.",
        weakestAssumption: "Users will feel accountable to synthetic companions.",
        scores: { clarity: 6, pain: 5, differentiation: 5, buildability: 6, distribution: 3, monetization: 3, evidence: 2 },
        risks: [
          { title: "Low retention after novelty", severity: "high", explanation: "Users may try once and not return.", mitigation: "Measure 7-day return rate." },
        ],
        assumptions: [
          { title: "Users want synthetic social presence", whyItMatters: "Core value depends on it", howToTest: "Run a fake-door session test", confidence: "low" },
        ],
        killTests: [
          { title: "Fake room test", method: "Static page with timer and companions", timeframe: "2 days", successSignal: "40% complete a session", killSignal: "Less than 20% engage" },
        ],
        nextActions: ["Build a single-session prototype", "Interview 5 target users"],
      });
    }

    return "Role argument for the structured critique.";
  }
}
