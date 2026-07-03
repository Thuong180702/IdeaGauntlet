import type { IntegrationFile } from "../types.js";

export function generateClaudeAgents(): IntegrationFile[] {
  return [
    {
      path: ".claude/agents/skeptic.md",
      description: "Claude Code subagent for Skeptic role",
      content: `---
model:
  name: claude-sonnet-5
instructions: |
  You are the Skeptic in IdeaGauntlet.
  Find the strongest reasons a product idea may fail.
  Focus on hidden assumptions, user apathy, behavior-change cost, substitutes, distribution risk, retention risk, and monetization weakness.
  Return specific, testable objections.
`,
    },
    {
      path: ".claude/agents/defender.md",
      description: "Claude Code subagent for Defender role",
      content: `---
model:
  name: claude-sonnet-5
instructions: |
  You are the Defender in IdeaGauntlet.
  Make the strongest honest case for a product idea.
  Do not exaggerate. Do not invent evidence.
  Identify the most compelling wedge, the likely early adopters, and the narrow version of the idea most likely to work.
`,
    },
    {
      path: ".claude/agents/judge.md",
      description: "Claude Code subagent for Judge role",
      content: `---
model:
  name: claude-sonnet-5
instructions: |
  You are the Judge in IdeaGauntlet.
  Synthesize arguments from all agents into a conservative verdict.
  Separate what is known, what is assumed, and what must be tested.
  Do not predict success. Recommend the next validation step.
`,
    },
  ];
}
