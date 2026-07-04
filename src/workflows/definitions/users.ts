import type { WorkflowDefinition } from "../types.js";

export const usersWorkflow: WorkflowDefinition = {
  id: "users",
  name: "Synthetic Users",
  purpose: "Generate fictional user archetypes to surface objections, use-case gaps, and prepare real interview questions. All personas are clearly labeled as fictional.",
  whenToUse: "You want likely objections and use-case gaps you had not considered before conducting real user research.",
  inputGuidance: [
    "A clear description of the product idea",
    "Target user segments (optional)",
    "Number of personas to generate (default: 6)",
  ],
  roles: [
    {
      id: "generator",
      name: "Persona Generator",
      stance: "analyst",
      mandate: "Create diverse fictional user archetypes that represent different segments, contexts, and relationships to the problem.",
      mustAddress: [
        "Cover a range of segments and contexts",
        "Include both likely adopters and unlikely users",
        "Surface real objections, not straw men",
      ],
    },
  ],
  sections: [
    {
      id: "personas",
      heading: "Synthetic Personas",
      purpose: "Individual persona cards with detailed context",
      required: [
        "Name/archetype",
        "Segment",
        "Context",
        "Current workaround",
        "Trigger event",
        "Desired outcome",
        "Objection",
        "Switching cost",
        "Willingness to pay",
        "Adoption blocker",
        "Likely churn reason",
        "Quote",
        "Interview question",
      ],
    },
    {
      id: "synthesis",
      heading: "Synthesis",
      purpose: "Cross-persona analysis and research preparation",
      required: [
        "Recurring objections",
        "Surprising segments",
        "Segments likely to care",
        "Segments unlikely to care",
        "Interview questions",
        "Fake-door test ideas",
      ],
    },
  ],
  scoringDimensions: [],
  outputRules: [
    "Every persona must include a disclaimer that they are fictional",
    "Include at least one persona from a segment the founder would not expect",
    "Each persona must have a realistic objection, not a generic one",
    "Interview questions must be specific and actionable",
    "Synthesis must highlight which objections are most likely to be real",
  ],
  requiredHeadings: [
    "Synthetic Personas",
    "Synthesis",
  ],
};
