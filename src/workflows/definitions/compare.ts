import type { WorkflowDefinition } from "../types.js";

export const compareWorkflow: WorkflowDefinition = {
  id: "compare",
  name: "Idea Comparison",
  purpose: "Compare multiple product ideas across structured dimensions to identify which idea to validate first, which has the best long-term potential, and which risks each carries.",
  whenToUse: "You need to choose between multiple ideas and want a structured comparison before deciding what to validate first.",
  inputGuidance: [
    "2-4 product ideas with clear descriptions",
    "Target user segments (optional)",
    "Market context (optional)",
  ],
  roles: [
    {
      id: "analyst",
      name: "Comparison Analyst",
      stance: "analyst",
      mandate: "Objectively evaluate each idea across the same criteria. Identify relative strengths and risks. Do not play favorites — let the analysis speak.",
      mustAddress: [
        "Score each idea on the same criteria",
        "Identify what each idea does best",
        "Identify the most dangerous risk per idea",
        "Recommend which to validate first",
      ],
    },
  ],
  sections: [
    {
      id: "comparison-matrix",
      heading: "Comparison Matrix",
      purpose: "Side-by-side scores across all criteria",
      required: ["Matrix with ideas as columns, criteria as rows"],
    },
    {
      id: "per-idea-strengths",
      heading: "Per-Idea Strengths",
      purpose: "What each idea does best",
      required: ["Strength analysis per idea"],
    },
    {
      id: "per-idea-risks",
      heading: "Per-Idea Risks",
      purpose: "The most dangerous risk per idea",
      required: ["Risk analysis per idea"],
    },
    {
      id: "best-fast-validation",
      heading: "Best Idea for Fast Validation",
      purpose: "Which idea can be tested most quickly",
      required: ["Pick with reasoning", "Validation timeline"],
    },
    {
      id: "best-long-term",
      heading: "Best Idea for Long-Term Upside",
      purpose: "Which idea has the most potential if it works",
      required: ["Pick with reasoning", "Upside analysis"],
    },
    {
      id: "kill-tests",
      heading: "Kill Tests Per Idea",
      purpose: "Specific tests per idea that could invalidate it",
      required: ["Test proposals per idea"],
    },
    {
      id: "recommendation",
      heading: "Recommendation",
      purpose: "Which idea to pursue and what caveats apply",
      required: ["Recommendation", "Caveats", "Next step"],
    },
  ],
  scoringDimensions: [
    { id: "clarity", label: "Clarity", definition: "Is the idea specific and understandable?" },
    { id: "pain", label: "Pain", definition: "Is there a real painful problem?" },
    { id: "urgency", label: "Urgency", definition: "Do users need this now?" },
    { id: "market-accessibility", label: "Market Accessibility", definition: "Can the market be reached?" },
    { id: "distribution", label: "Distribution", definition: "Can it reach users at reasonable cost?" },
    { id: "monetization", label: "Monetization", definition: "Is there a credible path to revenue?" },
    { id: "differentiation", label: "Differentiation", definition: "Is it meaningfully different?" },
    { id: "build-complexity", label: "Build Complexity", definition: "How complex is it to build?" },
    { id: "time-to-validate", label: "Time to Validate", definition: "How quickly can it be tested?" },
    { id: "evidence", label: "Evidence", definition: "What real evidence supports it?" },
  ],
  outputRules: [
    "Score all ideas on the same criteria — do not use different standards",
    "Each pick (fast validation, long-term upside) must have reasoning",
    "Kill tests must be specific to each idea, not generic",
    "Recommendation must include caveats and conditions",
    "Do not rank ideas if the comparison is inconclusive — say so",
  ],
  requiredHeadings: [
    "Comparison Matrix",
    "Per-Idea Strengths",
    "Per-Idea Risks",
    "Best Idea for Fast Validation",
    "Best Idea for Long-Term Upside",
    "Kill Tests Per Idea",
    "Recommendation",
  ],
};
