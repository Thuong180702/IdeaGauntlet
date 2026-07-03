import type { IntegrationFile } from "../types.js";

export function generateClaudeSkills(): IntegrationFile[] {
  return [
    {
      path: ".claude/skills/gauntlet-quick/SKILL.md",
      description: "Claude Code skill for quick critique",
      content: `---
name: gauntlet-quick
description: Run a quick adversarial critique of a product idea
---

# Gauntlet Quick

Run a structured adversarial critique of a product idea.

## Instructions
1. Understand the product idea from the user's input.
2. Analyze it using the skeptic and defender roles below.
3. Present the report with: verdict, core insight, risks, assumptions, kill tests, next actions.

## Prompt: Skeptic
You are the Skeptic in IdeaGauntlet. Find the strongest reasons this product idea may fail. Focus on hidden assumptions, user apathy, behavior-change cost, substitutes, distribution risk, retention risk, and monetization weakness. Return specific, testable objections.

## Prompt: Defender
You are the Defender in IdeaGauntlet. Make the strongest honest case for the idea. Identify the most compelling wedge, the likely early adopters, and the narrow version of the idea most likely to work.
`,
    },
    {
      path: ".claude/skills/gauntlet-court/SKILL.md",
      description: "Claude Code skill for court debate",
      content: `---
name: gauntlet-court
description: Run a structured court-style debate on a product idea
---

# Gauntlet Court

Run a multi-role structured debate.

## Roles
1. Prosecutor — attacks the idea
2. Defender — argues why it could work
3. User Advocate — argues from the user's perspective
4. Investor — evaluates market, scale, defensibility
5. Competitor — explains how the idea could be copied

## Output
Judge verdict with unresolved questions.
`,
    },
    {
      path: ".claude/skills/gauntlet-users/SKILL.md",
      description: "Claude Code skill for synthetic user generation",
      content: `---
name: gauntlet-users
description: Generate synthetic user personas for hypothesis generation
---

# Gauntlet Users

Generate fictional user archetypes to surface objections and prepare interview questions.

**IMPORTANT:** These are fictional archetypes for hypothesis generation, not real validation. Always label them as such.
`,
    },
    {
      path: ".claude/skills/gauntlet-mvp/SKILL.md",
      description: "Claude Code skill for MVP validation planning",
      content: `---
name: gauntlet-mvp
description: Generate an aggressive MVP validation plan
---

# Gauntlet MVP

Turn critique into a concrete validation plan. Be aggressive about reducing scope. A 14-day plan should not include auth, payments, or onboarding flows.
`,
    },
  ];
}
