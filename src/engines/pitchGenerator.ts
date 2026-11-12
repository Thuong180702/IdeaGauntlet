import type { LLMProvider, IdeaInput, PitchDeck, PitchDeckSlide } from "../core/types.js";
import { requireAnalysis, toAnalysisFailure } from "../core/analysisError.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

/**
 * Pitch Deck Draft Generator Engine
 *
 * Generates a structured 10-12 slide pitch deck tailored to venture capital / angel standards
 * (YC, Sequoia, or a16z frameworks), including headlines, proof points, visual concepts,
 * and speaker notes for every slide.
 */
export async function runPitchGenerator(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: {
    template?: "yc" | "sequoia" | "a16z";
    companyName?: string;
    enableSearch?: boolean;
    research?: ResearchBrief;
  },
): Promise<PitchDeck> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for pitch deck generation.");
  }

  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress("Gathering market benchmarks for pitch", () => performResearch(idea, "quick"));
    } catch (err: any) {
      warnIfError("pitchGenerator: web research failed", err);
    }
  }

  const template = options?.template ?? "yc";
  const companyName = options?.companyName ?? "The Company";
  const researchContext = research?.summary ?? "";

  const templateGuidance: Record<"yc" | "sequoia" | "a16z", string> = {
    yc: "Follow Y Combinator standard: extreme clarity, no buzzwords, problem-first, fast traction signal, huge market.",
    sequoia: "Follow Sequoia Capital 10-slide framework: Company Purpose, Problem, Solution, Why Now, Market Size, Competition, Product, Business Model, Team, Financials.",
    a16z: "Follow a16z narrative framework: Paradigm Shift, The Villain (Status Quo), The Promised Land, Secret Weapon / Moat, Go-to-Market Engine, The Inevitability.",
  };

  const systemPrompt = `You are a World-Class Pitch Coach and Venture Partner in IdeaGauntlet.
Your job is to generate a compelling, investor-ready pitch deck outline for this product idea using the ${template.toUpperCase()} framework.

${templateGuidance[template]}

${researchContext}

${IDEA_INJECTION_SYSTEM}

Return a single JSON object with these keys:

- template: "${template}"
- companyName: string
- oneLinePitch: string (crisp 8-12 word description, e.g. "Stripe for AI Agent Micropayments")
- elevatorPitch: string (3-sentence narrative hook for intro emails or casual conversations)
- whyNowNarrative: string (2-3 sentences explaining why this company must be built today, not 3 years ago or 3 years from now)
- slides: array of 10-12 objects ({
    slideNumber: number,
    title: string (e.g. "The Problem", "The Solution", "Why Now", "Market Size (TAM/SAM/SOM)", "The Secret / Moat", "Business Model", "Competition", "Go-To-Market", "Team & Traction", "The Ask"),
    headline: string (the single take-away sentence at the top of the slide),
    bulletPoints: array of 3-4 strings (concise, data-backed points),
    visualConcept: string (description of the chart, diagram, screenshot, or graphic to display on this slide),
    speakerNotes: string (word-for-word script what the founder should actually say during this slide in 30-45 seconds)
  })

Return ONLY valid JSON.`;

  const userMessage = buildSafeUserMessage(idea, [
    `Company Name: ${companyName}`,
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    idea.stage ? `Stage: ${idea.stage}` : "",
    "",
    `Generate an investor-ready ${template.toUpperCase()} pitch deck draft as JSON.`,
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.4,
      maxTokens: 4000,
    });
    const parsed = requireAnalysis(extractJSON<any>(response), "Pitch deck draft", ["slides"]);

    const slides: PitchDeckSlide[] = (parsed.slides ?? []).map((s: any, idx: number) => ({
      slideNumber: Number(s.slideNumber ?? idx + 1),
      title: s.title ?? `Slide ${idx + 1}`,
      headline: s.headline ?? "",
      bulletPoints: Array.isArray(s.bulletPoints) ? s.bulletPoints : [],
      visualConcept: s.visualConcept ?? "Clean graphic illustrating core point",
      speakerNotes: s.speakerNotes ?? "",
    }));

    return {
      template,
      companyName: parsed.companyName ?? companyName,
      oneLinePitch: parsed.oneLinePitch ?? "Next-generation product for modern workflows",
      slides,
      elevatorPitch: parsed.elevatorPitch ?? "We solve a critical problem for our target market with a 10x better approach.",
      whyNowNarrative: parsed.whyNowNarrative ?? "Market shifts make this the exact right moment to build.",
    };
  } catch (err) {
    // No placeholder result: a made-up finding is worse than an explicit failure.
    throw toAnalysisFailure("Pitch deck draft", err);
  }
}

export function formatPitchDeckReport(deck: PitchDeck): string {
  const lines: string[] = [];
  lines.push(`# 🚀 Pitch Deck Draft — ${deck.companyName}`);
  lines.push(`*Template: ${deck.template.toUpperCase()} Venture Framework*\n`);

  lines.push(`> 🎯 **One-Line Pitch:** ${deck.oneLinePitch}\n`);
  lines.push(`### ⏱️ Elevator Pitch\n${deck.elevatorPitch}\n`);
  lines.push(`### ⏳ Why Now?\n${deck.whyNowNarrative}\n`);

  lines.push("## 📑 Slide Deck Outline\n");
  for (const slide of deck.slides) {
    lines.push(`---`);
    lines.push(`### Slide ${slide.slideNumber}: ${slide.title}`);
    lines.push(`**Headline:** *"${slide.headline}"*\n`);

    if (slide.bulletPoints.length > 0) {
      lines.push("**Key Takeaways:**");
      for (const bp of slide.bulletPoints) lines.push(`- ${bp}`);
      lines.push("");
    }

    lines.push(`🖼️ **Visual Concept:** ${slide.visualConcept}\n`);
    lines.push(`🎙️ **Speaker Script (Say this):**\n> "${slide.speakerNotes}"\n`);
  }

  lines.push("---\n*Generated by IdeaGauntlet Pitch Deck Generator*\n");
  return lines.join("\n");
}
