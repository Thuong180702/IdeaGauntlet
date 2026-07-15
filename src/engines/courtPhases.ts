import type { IdeaInput, GauntletMode } from "../core/types.js";
import type { ResearchBrief } from "../search/types.js";

/**
 * Court 2.0 — Multi-turn debate prompt builders.
 *
 * 4 phases:
 * 1. Opening statements (parallel — one per role)
 * 2. Cross-examination (single call — judge identifies key conflicts)
 * 3. Rebuttals (parallel — skeptics respond to cross-exam)
 * 4. Verdict (single call — judge weighs everything)
 */

export interface RoleDefinition {
  id: string;
  name: string;
  stance: string;
  mandate: string;
  mustAddress: string[];
}

/** Default roles for court mode. */
export const COURT_ROLES: RoleDefinition[] = [
  {
    id: "market-skeptic",
    name: "Market Skeptic",
    stance: "skeptic",
    mandate: "Attacks demand, urgency, willingness to pay, market size, and timing assumptions.",
    mustAddress: [
      "Is there genuine demand or just founder enthusiasm?",
      "Is the timing right for this solution?",
      "What would willingness to pay actually be?",
      "Is the addressable market large enough?",
    ],
  },
  {
    id: "distribution-skeptic",
    name: "Distribution Skeptic",
    stance: "skeptic",
    mandate: "Attacks acquisition channels, CAC, virality assumptions, SEO/content/platform risk.",
    mustAddress: [
      "How would users realistically discover this?",
      "What is a realistic CAC for each channel?",
      "Does the idea rely on viral growth that won't happen?",
      "What platform dependency risks exist?",
    ],
  },
  {
    id: "product-skeptic",
    name: "Product Skeptic",
    stance: "skeptic",
    mandate: "Attacks UX complexity, retention, habit formation, onboarding friction.",
    mustAddress: [
      "What is the activation experience?",
      "What is the retention loop?",
      "What edge cases could break the core experience?",
      "How much behavior change is required?",
    ],
  },
  {
    id: "technical-skeptic",
    name: "Technical Skeptic",
    stance: "skeptic",
    mandate: "Attacks implementation complexity, reliability, integration dependencies, scalability.",
    mustAddress: [
      "What is the hardest technical problem?",
      "What third-party dependencies exist?",
      "What scale challenges would emerge?",
      "What operational burden does a small team face?",
    ],
  },
  {
    id: "business-defender",
    name: "Business Defender",
    stance: "defender",
    mandate: "Argues the strongest credible wedge, customer segment, pricing, GTM path.",
    mustAddress: [
      "What is the most defensible wedge into the market?",
      "Which customer segment is most likely to adopt first?",
      "What pricing model aligns with value delivered?",
      "What genuine differentiation exists?",
    ],
  },
  {
    id: "user-advocate",
    name: "User Advocate",
    stance: "user",
    mandate: "Argues from the target user's perspective: jobs-to-be-done, anxieties, switching costs.",
    mustAddress: [
      "What job is the user really hiring this for?",
      "What anxiety or risk does the user feel?",
      "What is the user's current workaround?",
      "What switching costs exist?",
    ],
  },
  {
    id: "competitor-analyst",
    name: "Competitor Analyst",
    stance: "skeptic",
    mandate: "Research existing competitors. Analyze their pricing, features, positioning, weaknesses, and market saturation. Identify what they do well and where gaps exist. If the market is saturated, propose niche strategies.",
    mustAddress: [
      "Who already provides this or similar solutions? Name them.",
      "What do they charge? Is there a pricing gap?",
      "What features do they have? What do they lack?",
      "Is the market saturated? Where are the gaps?",
      "If entering, what niche or edge gives the best chance?",
    ],
  },
];

/** Phase 1 — Opening statement prompt for a single role. */
export function buildOpeningPrompt(
  role: RoleDefinition,
  idea: IdeaInput,
  research: ResearchBrief | undefined,
  options?: { defenseArguments?: string[] },
): { system: string; user: string } {
  const system = [
    `You are ${role.name} in an IdeaGauntlet Court debate.`,
    `Your stance: ${role.stance}.`,
    `Your mandate: ${role.mandate}`,
    ``,
    `You must address these questions:`,
    ...role.mustAddress.map((q) => `- ${q}`),
    ``,
    `Keep your opening statement to 200-300 words. Be specific and rigorous.`,
    `Use the web research below to ground your arguments with evidence.`,
    ``,
    research?.summary ?? "No web research available. Use your knowledge.",
  ].join("\n");

  const user = [
    `Product idea: ${idea.idea}`,
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    idea.stage ? `Stage: ${idea.stage}` : "",
    ``,
    options?.defenseArguments && options.defenseArguments.length > 0
      ? `=== FOUNDER'S DEFENSE ARGUMENTS ===\n${options.defenseArguments.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n`
      : "",
    `Present your opening statement as ${role.name}.`,
  ].filter(Boolean).join("\n");

  return { system, user };
}

/** Phase 2 — Cross-examination prompt for the judge. */
export function buildCrossExaminationPrompt(
  openings: Array<{ roleId: string; roleName: string; argument: string }>,
  idea: IdeaInput,
): { system: string; user: string } {
  const system = [
    `You are the Judge in an IdeaGauntlet Court debate.`,
    `Your job now is to cross-examine the opening statements.`,
    `Identify the 3-5 key conflicts, contradictions, and unresolved questions between the roles.`,
    `Press on the weakest arguments and highlight the strongest.`,
    `Return JSON: { "keyConflicts": [{ "roles": ["role1", "role2"], "conflict": "description", "significance": "high|medium|low" }], "openQuestions": ["question1", "question2"] }`,
    `No markdown fences. JSON only.`,
  ].join("\n");

  const openingsText = openings
    .map((o) => `=== ${o.roleName} ===\n${o.argument}`)
    .join("\n\n");

  const user = [
    `Product idea: ${idea.idea}`,
    ``,
    `=== OPENING STATEMENTS ===`,
    openingsText,
    ``,
    `Cross-examine these statements. Identify key conflicts and open questions.`,
  ].join("\n");

  return { system, user };
}

/** Phase 3 — Rebuttal prompt for a single skeptic role. */
export function buildRebuttalPrompt(
  role: RoleDefinition,
  openings: Array<{ roleId: string; roleName: string; argument: string }>,
  crossExamination: { keyConflicts: any[]; openQuestions: string[] },
): { system: string; user: string } {
  const otherOpenings = openings.filter((o) => o.roleId !== role.id);
  const openingsText = otherOpenings
    .map((o) => `=== ${o.roleName} ===\n${o.argument}`)
    .join("\n\n");

  const conflictsText = crossExamination.keyConflicts
    .map((c: any) => `- ${c.roles.join(" vs ")}: ${c.conflict} (${c.significance})`)
    .join("\n");

  const system = [
    `You are ${role.name} in an IdeaGauntlet Court debate.`,
    `This is the REBUTTAL phase. Respond to the other roles' opening statements and the judge's cross-examination.`,
    `Address the key conflicts that involve your area. Be specific and cite evidence where possible.`,
    `Keep your rebuttal to 150-250 words.`,
  ].join("\n");

  const user = [
    `=== OTHER OPENING STATEMENTS ===`,
    openingsText,
    ``,
    `=== JUDGE'S CROSS-EXAMINATION ===`,
    `Key conflicts:\n${conflictsText}`,
    `Open questions:\n${crossExamination.openQuestions.map((q) => `- ${q}`).join("\n")}`,
    ``,
    `Present your rebuttal as ${role.name}.`,
  ].join("\n");

  return { system, user };
}

/** Phase 4 — Final verdict prompt for the judge. */
export function buildVerdictPrompt(
  openings: Array<{ roleId: string; roleName: string; argument: string }>,
  crossExamination: { keyConflicts: any[]; openQuestions: string[] },
  rebuttals: Array<{ roleId: string; roleName: string; argument: string }>,
  idea: IdeaInput,
  research: ResearchBrief | undefined,
  options?: { defenseArguments?: string[] },
): { system: string; user: string } {
  const system = [
    `You are the Judge in an IdeaGauntlet Court debate.`,
    `This is the VERDICT phase. You have heard opening statements, cross-examination, and rebuttals.`,
    `Weigh all arguments and produce a final verdict.`,
    ``,
    `Return a single JSON object with these keys:`,
    `ideaSnapshot (object: idea, targetUser, market, stage, keyPromise)`,
    `assumptionsMap (array: { assumption, riskLevel, whyItMatters })`,
    `roleArguments (array: { roleId, roleName, argument })`,
    `crossExamination (string — summary of key conflicts)`,
    `evidenceAudit (string — what's backed by evidence vs assumption)`,
    `killTests (array: { title, method, timeframe, successSignal, killSignal })`,
    `scoresDetailed (array: { dimension, score 0-10, reason })`,
    `verdictDetail (string — start with verdict prefix: 'strong', 'promising but risky', 'unclear', 'weak', 'needs real evidence', or 'pivot recommended')`,
    `nextActions (array of string)`,
    `competitorLandscape (object: { competitors: [{ name, url, type, pricing, features, weaknesses }], saturationLevel: "low"|"medium"|"high"|"unknown", analysisNote }) — use data from research brief competitor landscape, add your analysis from the debate`,
    `nicheOpportunities (array: { type: "underserved_segment"|"feature_gap"|"pricing_gap"|"use_case_gap"|"geographic_gap", description, evidence, wedgeIdea, whyNow }) — 3-5 niches if market is saturated, or explain why niches aren't needed`,
    `No markdown fences. JSON only.`,
    ``,
    research?.summary ?? "",
  ].join("\n");

  const openingsText = openings
    .map((o) => `=== ${o.roleName} ===\n${o.argument}`)
    .join("\n\n");

  const rebuttalsText = rebuttals
    .map((r) => `=== ${r.roleName} REBUTTAL ===\n${r.argument}`)
    .join("\n\n");

  const conflictsText = crossExamination.keyConflicts
    .map((c: any) => `- ${c.roles.join(" vs ")}: ${c.conflict}`)
    .join("\n");

  const user = [
    `Product idea: ${idea.idea}`,
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    idea.stage ? `Stage: ${idea.stage}` : "",
    ``,
    options?.defenseArguments && options.defenseArguments.length > 0
      ? `=== FOUNDER'S DEFENSE ARGUMENTS ===\n${options.defenseArguments.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n`
      : "",
    `=== OPENING STATEMENTS ===`,
    openingsText,
    ``,
    `=== CROSS-EXAMINATION ===`,
    conflictsText,
    `Open questions: ${crossExamination.openQuestions.join("; ")}`,
    ``,
    `=== REBUTTALS ===`,
    rebuttalsText,
    ``,
    `Produce your final verdict.`,
  ].filter(Boolean).join("\n");

  return { system, user };
}
