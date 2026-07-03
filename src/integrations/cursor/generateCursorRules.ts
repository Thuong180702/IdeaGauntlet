import type { IntegrationFile } from "../types.js";

export function generateCursorRules(): IntegrationFile[] {
  return [
    {
      path: ".cursor/rules/idea-gauntlet-quick.mdc",
      description: "Cursor rule for quick critique",
      content: `---
description: Run an IdeaGauntlet-style quick critique on product ideas
globs: *.md
---
When asked to evaluate a product idea, use the IdeaGauntlet framework:
1. Identify the core insight
2. Find the weakest assumption
3. List top failure modes
4. Propose kill tests
5. Suggest next actions
`,
    },
  ];
}
