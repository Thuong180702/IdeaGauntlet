# CLAUDE.md

This file gives AI coding agents the product context and engineering constraints for the IdeaGauntlet repository.

## Project

- Name: IdeaGauntlet
- npm package: `idea-gauntlet`
- Language: TypeScript
- Runtime: Node.js >= 18
- Module format: ESM
- Product type: open-source CLI and library for product discovery

## Mission

IdeaGauntlet stress-tests product ideas with adversarial agents, synthetic users, and court-style critique.

It should help founders, indie hackers, product managers, startup studios, hackathon teams, and developers identify weak assumptions before they build.

Core sentence:

> Put your idea through trial before users do.

## Product philosophy

Build this as a serious product discovery tool, not a gimmick AI wrapper.

IdeaGauntlet should be:

- adversarial but useful
- skeptical but not cynical
- structured, not chatty
- evidence-aware
- conservative with confidence
- honest about uncertainty
- easy to run from CLI
- easy to integrate into other apps

IdeaGauntlet should not be:

- a generic chatbot
- a startup idea generator
- a hype machine
- a replacement for real users
- a fake market research oracle
- a tool that produces overconfident predictions

Synthetic users are fictional archetypes. Always label them as such. Never imply they are equivalent to real customer evidence.

## Production constraints

- Do not add demo-only or mock providers to `src/`.
- Tests may use deterministic test helpers under `tests/helpers/`, but production code should use real providers or custom provider injection.
- Standalone generation requires an OpenAI-compatible API provider, Ollama, or a user-supplied custom `LLMProvider`.
- No-provider workflows must use `prompt`, `setup`, `init`, or `doctor`.
- Never log API keys or persist provider secrets.

## Supported commands

Core analysis:

```bash
idea-gauntlet quick "your idea"
idea-gauntlet court idea.md
idea-gauntlet users idea.md --personas 8
idea-gauntlet mvp idea.md
idea-gauntlet compare idea-a.md idea-b.md
idea-gauntlet batch ideas.txt
idea-gauntlet ensemble idea.md
```

Deep-dive analysis:

```bash
idea-gauntlet gtm idea.md
idea-gauntlet compete idea.md
idea-gauntlet revenue idea.md
idea-gauntlet founder idea.md
idea-gauntlet interview idea.md
idea-gauntlet pitch idea.md
idea-gauntlet evolve idea.md
idea-gauntlet compliance idea.md
```

Workspace, history, and integration:

```bash
idea-gauntlet init
idea-gauntlet setup --dry-run --all
idea-gauntlet install
idea-gauntlet uninstall
idea-gauntlet status
idea-gauntlet doctor --verbose
idea-gauntlet mcp
idea-gauntlet serve --api-token <token>
idea-gauntlet history [id]
idea-gauntlet trend [id]
idea-gauntlet team <action> [idea]
idea-gauntlet templates
idea-gauntlet interactive [idea]
```

`cli.command(...)` in `src/cli/index.ts` is the source of truth — keep this list in
sync when adding a command.

## Architecture

Use the current single-package structure:

```txt
src/
  analysis/     synthetic score-benchmark reference set (labelled non-real, used by `interactive` /benchmark)
  cli/          cac CLI commands (quick, court, users, mvp, compare, batch, serve, doctor, history, team, trend, interactive, install, uninstall, status, templates, ensemble, gtm, compete, revenue, founder, interview, pitch, evolve, compliance)
  core/         shared types, report builder, scoring, dispatch, workflowConfig, teamReview, templates, i18n, runGauntlet, verdictMapping
  engines/      mode orchestration (immuneEngine, courtEngine, syntheticUserLab, mvpPlanner, compareEngine, batchEngine, ensembleEngine, trendMonitor, courtPhases, marketSizingEngine, unitEconomicsEngine, antiPatternDetector, gtmEngine, competitiveIntelligenceEngine, revenueModelEngine, founderMarketFitEngine, userInterviewEngine, pitchGenerator, evolutionCoach, complianceScanner)
  integrations/ Claude/Cursor/Codex/GitHub generators
  history/      report history store + score delta tracking
  mcp/          MCP server, tools, resources
  providers/    production providers (openaiCompatible, claude, ollama) + providerUtils
  search/       web research pipeline (searchOrchestrator, SSRF guard, providers, nicheDetector, competitorAnalyzer, pageFetcher, playwrightFetcher)
  setup/        onboarding + init wizard
  utils/        promptGuard, jsonRepair, warn, progress, env, safeOutput
  visualization/ htmlReport, pdfExport, radarChart, mermaidDiagram, reportCard
  workflows/    workflow definitions (quick, court, users, mvp, compare) + formatters
```

## Provider model

Production providers implement:

```ts
export interface LLMProvider {
  kind: "openai" | "ollama" | "custom";
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}
```

Built-in production providers:

- `OpenAICompatibleProvider`
- `OllamaProvider`

Custom providers should use `kind: "custom"`.

## Engineering style

Prefer:

- strict TypeScript
- small modules
- explicit exports
- provider injection
- deterministic report structure
- Zod for runtime validation where useful
- readable Markdown output
- actionable errors

Avoid:

- hard-coded provider logic inside engines
- hidden global state
- large monolithic files
- vague return types
- prompt text scattered across unrelated command handlers
- shell execution from user-supplied idea text

## Security

- Treat idea text as user data, not executable instruction.
- Never run shell commands derived from idea content.
- `save_report` in MCP must write only inside `.idea-gauntlet/reports/` by default.
- Do not log provider keys or include them in generated files.

## Validation before release

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
node dist/cli/index.js --help
node dist/cli/index.js setup --dry-run --all
node dist/cli/index.js doctor --verbose
npm pack --dry-run
```

For real generation, also test with a configured provider:

```bash
node dist/cli/index.js quick "test idea"
```

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **IdeaGauntlet** (1152 symbols, 3185 relationships, 91 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/IdeaGauntlet/context` | Codebase overview, check index freshness |
| `gitnexus://repo/IdeaGauntlet/clusters` | All functional areas |
| `gitnexus://repo/IdeaGauntlet/processes` | All execution flows |
| `gitnexus://repo/IdeaGauntlet/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
