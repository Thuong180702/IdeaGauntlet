import type { LLMProvider, IdeaInput, UserInterviewSession, InterviewTurn } from "../core/types.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { warnIfError } from "../utils/warn.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

/**
 * AI-Simulated User Interview Engine
 *
 * Runs a simulated customer discovery interview between a founder and a target persona.
 * Generates dynamic in-character dialogue, extracts key customer insights, evaluates willingness
 * to pay, objections, and outputs a customer interview synthesis report.
 */
export async function runUserInterviewEngine(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: {
    personaArchetype?: string;
    founderQuestions?: string[];
  },
): Promise<UserInterviewSession> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for simulated user interview.");
  }

  const archetypeContext = options?.personaArchetype
    ? `Focus interview on this specific user archetype: "${options.personaArchetype}"`
    : "Select the single most critical or skeptical target persona for this idea.";

  const customQuestionsContext = options?.founderQuestions && options.founderQuestions.length > 0
    ? `The founder asks these specific questions during the interview:\n${options.founderQuestions.map((q, i) => `${i + 1}. "${q}"`).join("\n")}`
    : "Simulate a standard 5-question customer discovery interview exploring current workflow, pain intensity, failed workarounds, willingness to pay, and product reaction.";

  const systemPrompt = `You are a Customer Discovery & User Research Lead in IdeaGauntlet.
Your job is to simulate a realistic, unvarnished customer discovery interview with a target user persona for the given product idea.

${archetypeContext}
${customQuestionsContext}

Guidelines for the simulated persona:
- Do NOT act like a polite assistant. Be a REAL human with bounded time, existing messy workarounds, budget skepticism, and habit inertia.
- Express genuine objections, friction points, and doubts.
- If the idea doesn't solve an urgent top-3 problem for them, say so honestly.

${IDEA_INJECTION_SYSTEM}

Return a single JSON object with these keys:

- persona: {
    name: string (realistic name),
    role: string (job title/life role),
    companyOrContext: string (e.g. "50-person remote fintech startup"),
    archetype: string (e.g. "Tired Remote Engineer", "Frugal Freelancer"),
    currentWorkaround: string (what they actually do today to solve this problem),
    painLevel: number (1-10, where 10 = acute crisis, 1 = minor annoyance)
  }
- dialogue: array of 4-6 conversational turns ({ speaker: "founder"|"persona", message: string })
- keyInsights: array of strings (3-5 concrete behavioral insights learned from this interview)
- uncoveredNeeds: array of strings (2-4 latent needs or feature expectations not in the original pitch)
- objectionAnalysis: string (why this persona hesitated or pushed back)
- wouldBuyVerdict: "definitely" | "maybe" | "unlikely" | "no"
- maxWillingnessToPay: string (e.g. "$15/month personal budget", "$0 — would only use free tier", "$500/yr company card")
- goldenQuote: string (one raw, punchy quote representing this persona's candid reaction)

Return ONLY valid JSON.`;

  const userMessage = buildSafeUserMessage(idea.idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    "",
    "Simulate a customer discovery interview and extract insights as JSON.",
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.5,
      maxTokens: 3500,
    });
    const parsed = extractJSON<any>(response);
    if (!parsed) throw new Error("Failed to parse user interview response");

    const dialogue: InterviewTurn[] = (parsed.dialogue ?? []).map((t: any) => ({
      speaker: (t.speaker === "founder" ? "founder" : "persona") as InterviewTurn["speaker"],
      message: t.message ?? "",
    }));

    return {
      persona: {
        name: parsed.persona?.name ?? "Alex",
        role: parsed.persona?.role ?? "Target User",
        companyOrContext: parsed.persona?.companyOrContext ?? "Target Market Context",
        archetype: parsed.persona?.archetype ?? (options?.personaArchetype ?? "Early Adopter"),
        currentWorkaround: parsed.persona?.currentWorkaround ?? "Manual workarounds",
        painLevel: Number(parsed.persona?.painLevel ?? 6),
      },
      dialogue,
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      uncoveredNeeds: Array.isArray(parsed.uncoveredNeeds) ? parsed.uncoveredNeeds : [],
      objectionAnalysis: parsed.objectionAnalysis ?? "Persona expressed standard adoption inertia.",
      wouldBuyVerdict: (parsed.wouldBuyVerdict ?? "maybe") as UserInterviewSession["wouldBuyVerdict"],
      maxWillingnessToPay: parsed.maxWillingnessToPay ?? "Unknown WTP",
      goldenQuote: parsed.goldenQuote ?? "I like the idea, but I have to see if it fits my daily routine.",
    };
  } catch (err: any) {
    warnIfError("userInterviewEngine: interview simulation failed", err);
    return {
      persona: {
        name: "Morgan",
        role: "Target User",
        companyOrContext: "Target Industry",
        archetype: options?.personaArchetype ?? "Pragmatic Buyer",
        currentWorkaround: "Existing tools and manual process",
        painLevel: 5,
      },
      dialogue: [
        { speaker: "founder", message: "How do you currently handle this problem?" },
        { speaker: "persona", message: "Honestly, we patch together a couple of free tools. It's clunky, but it gets the job done." },
        { speaker: "founder", message: "If a dedicated tool solved this completely, would you pay for it?" },
        { speaker: "persona", message: "Only if it saves me at least 2 hours a week without requiring new workflow habits." },
      ],
      keyInsights: ["Users rely on sticky zero-cost workarounds", "High switching friction requires clear 10x value"],
      uncoveredNeeds: ["Seamless integration with existing daily stack"],
      objectionAnalysis: "Reluctance to pay for another subscription without proven ROI.",
      wouldBuyVerdict: "maybe",
      maxWillingnessToPay: "$10-$20/month if proven valuable",
      goldenQuote: "If it takes more than 5 minutes to set up, my team will never adopt it.",
    };
  }
}

export function formatUserInterviewReport(session: UserInterviewSession): string {
  const lines: string[] = [];
  lines.push("# 🎙️ Customer Discovery Interview Session\n");
  lines.push(`**Persona:** ${session.persona.name} — *${session.persona.role}* (${session.persona.companyOrContext})`);
  lines.push(`**Archetype:** \`${session.persona.archetype}\`  |  **Pain Level:** ${session.persona.painLevel}/10`);
  lines.push(`**Current Workaround:** ${session.persona.currentWorkaround}\n`);

  lines.push(`> 💬 **Golden Quote:** "${session.goldenQuote}"\n`);

  const buyBadge: Record<UserInterviewSession["wouldBuyVerdict"], string> = {
    definitely: "🟢 Definitely",
    maybe: "🟡 Maybe / Hesitant",
    unlikely: "🔴 Unlikely",
    no: "❌ No",
  };
  lines.push(`**Willingness to Buy:** ${buyBadge[session.wouldBuyVerdict]}  |  **Max WTP:** \`${session.maxWillingnessToPay}\`\n`);

  if (session.dialogue.length > 0) {
    lines.push("## 🗣️ Interview Transcript\n");
    for (const turn of session.dialogue) {
      if (turn.speaker === "founder") {
        lines.push(`**🧑‍💻 Founder:** ${turn.message}\n`);
      } else {
        lines.push(`**👤 ${session.persona.name}:** ${turn.message}\n`);
      }
    }
  }

  if (session.keyInsights.length > 0) {
    lines.push("## 💡 Key Behavioral Insights\n");
    for (const insight of session.keyInsights) lines.push(`- ${insight}`);
    lines.push("");
  }

  if (session.uncoveredNeeds.length > 0) {
    lines.push("## 🔍 Latent / Uncovered Needs\n");
    for (const need of session.uncoveredNeeds) lines.push(`- ${need}`);
    lines.push("");
  }

  lines.push("## 🛡️ Objection & Inertia Analysis\n");
  lines.push(session.objectionAnalysis + "\n");

  lines.push("---\n*Simulated user research by IdeaGauntlet Synthetic User Lab*\n");
  return lines.join("\n");
}
