# Changelog

All notable changes to IdeaGauntlet will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-11-12

Advice fitted to the founder's real resources, no more placeholder findings, and a
first-run experience that no longer dead-ends.

### Added
- **Founder context — advice fitted to what you actually have.** `--background`, `--team`, `--budget`, `--time`, `--deadline`, `--assets` on every analysis command, a `founder` block in `.ideagauntlet.json` to state it once, a `founder` object on every MCP idea tool, the REST API, and `runGauntlet({ founder })`. All 17 engines now receive it with explicit rules: recommend only what is executable with these resources, convert effort to real calendar time, use the founder's existing assets first, and name skill/capital gaps as risks. Previously only `founder --background` and `gtm --budget` used any of this; `mvp` planned 14 days regardless of whether you had 10 hours a week, and the documented `constraints` field was silently dropped (it is now included). The report prints the context under a "Founder Context" heading. Founder claims are fenced as data and can never be cited as evidence or make a score `sourced`.
- Agent-native instructions (Claude Code / Cursor / Codex) now ask for the founder's resources and, when none are given, must state which resources a plan assumes.
- **`--lang` on every analysis command** (was `quick` only), plus `IDEAGAUNTLET_LANG` and a `lang` key in `.ideagauntlet.json` as defaults. Implemented as a provider decorator (`withResponseLanguage`), so engines stay language-agnostic. Only prose is translated — JSON keys, verdict/severity enums, numbers, and source citations are kept verbatim so provenance verification is unaffected. An unsupported code now fails with the supported list instead of silently answering in English.
- **Read the idea from stdin** with `-`: `cat idea.md | idea-gauntlet court -`.
- **Getting-started screen** when `idea-gauntlet` is run with no arguments (previously printed nothing).
- **"Did you mean"** for mistyped commands (previously printed nothing and exited 0).
- **First-run menu on every analysis command** in an interactive terminal (was `quick` only): use Ollama, paste a key for this run, or set up the agent-native integration. A pasted key is never written to disk.
- **Next-step suggestions** after `quick` and `court` when run at a terminal (stderr only; silent when piped or `--quiet`).
- `doctor` now reports which LLM provider analysis commands will actually use (Anthropic / Groq / OpenAI-compatible, never the key), validates `IDEAGAUNTLET_LANG`, and ends with the concrete next step.
- New exports: `withResponseLanguage`, `UnsupportedLanguageError`, `buildLanguageInstruction`, `FounderContextSchema`, `normalizeFounderContext`, `formatFounderContextBlock`, `AnalysisFailedError`.

### Fixed
- **Eight commands returned invented findings when the model call failed.** `gtm`, `compete`, `revenue`, `founder`, `interview`, `pitch`, `evolve`, and `compliance` caught every error — a wrong API key, a timeout, an unparseable answer — and returned a hard-coded result with no warning: `founder` said "Moderate Fit", `compliance` said overall risk "low … no exotic regulatory blockers identified", `evolve` recommended pivoting to B2B. They now throw `AnalysisFailedError` and print what went wrong; nothing is generated. **Behaviour change for library users:** these functions reject instead of resolving with placeholders.
- **An empty `{}` answer counted as a successful analysis** in `quick`, `court`, `users`, and `mvp` (`mvp` printed its built-in default plan as if it were the result). It is now flagged as a partial report.
- **Partial reports did not say so in the report itself** — only on stderr, which is lost once the file is saved. The Markdown now opens with a warning banner.
- **`court` crashed** (`Cannot read properties of undefined (reading 'map')`) when the cross-examination answer was valid JSON of the wrong shape.
- **Usage errors printed a Node stack trace** — a missing idea or unknown option now prints one line and points at `<command> --help`.
- **Provider/engine failures in `mvp`, `compare`, `batch`, `ensemble` surfaced as unhandled rejections** with a stack trace; they now print `Error: …` and exit 1 (set `IDEAGAUNTLET_DEBUG=1` for the stack).
- **`--ollama` was ignored by `mvp`** — the flag was never passed to provider resolution.
- **`ensemble idea.md` analysed the literal string `idea.md`** — it now loads the file like every other command.
- `doctor` warned "CLI executable: Not found (run build first)" for every installed user (it looked for `dist/` in the current directory), warned about a missing `.codex/config.toml` in projects that don't use Codex, and printed raw `[warn] fetch failed` lines above the report. The network checks now time out instead of hanging.
- The onboarding menu wrote to stdout, corrupting piped reports and `--json` output; it now uses stderr.
- `tests/search/pageFetcher.test.ts` did a real DNS lookup and failed offline or behind a proxy.

### Changed
- Provider resolution, onboarding, and language handling for all CLI commands live in one place (`src/cli/context.ts`) instead of being copy-pasted into 14 command files.
- The update check no longer runs for `--help`, `--version`, or the welcome screen.
- **README rewritten** — shorter, organised around the path a new user takes, and corrected where it documented options that did not work.

### Fixed (documentation drift)
- `-o` was documented throughout the README but did not exist; it is now an alias for `--output` on every command.
- `serve --api-token` was documented (and implemented in the server) but the CLI never accepted the flag, so the REST server could not be protected. `--api-token` (or `IDEAGAUNTLET_API_TOKEN`), `--host`, and `--cors-origin` are now wired, and binding to a non-local host without a token prints a warning.
- The documented custom court role format (`roleName` / `perspective`) was rejected by the loader; the README now shows the real schema.

## [0.7.0] - 2026-08-26

Two capabilities aimed at the same thing: making the tool honest about what it
actually knows, and useful on the Monday after you read the report.

### Added
- **Score calibration / evidence provenance.** Every scored dimension is now labelled `sourced` or `judgment` and rendered in a new **Basis** column, with a Calibration block under the scorecard stating the ratio in plain language. The model is asked to cite the sources behind each score, and those citations are verified against the research brief that was actually retrieved (`verifyScoreProvenance`). A citation that cannot be found is stripped, surfaced as `unverifiedCitations`, and the dimension drops to `judgment`. **Verification can only downgrade a basis, never promote it** — a model cannot certify its own guess as evidence. When no research was retrieved, every dimension is `judgment` and the report says so.
- **Assumption Ledger (`assumptions` command, `build_assumption_ledger` MCP tool).** Turns an idea into a falsification plan: each assumption carries a criticality (`fatal`/`major`/`minor`), the cheapest test that could disprove it, a timebox and cost, and a kill threshold that must name a concrete number. Reports the days and dollars needed to resolve every fatal assumption. Test order is computed in code as `criticality × uncertainty × cheapness` rather than asked of the model, which tends to echo its own first bullet. An unparseable response **fails loudly instead of emitting invented thresholds**.
- **Calibration covers `court` as well as `quick`.** The judge is asked to cite sources per dimension, `scoresDetailed` is normalised into the keyed rubric shape, and the same verification runs against the court's research brief — so both modes render an identical Basis column and Calibration block.
- New exports: `verifyScoreProvenance`, `buildSourceIndex`, `isCitationSupported`, `formatBasisBadge`, `runAssumptionLedger`, `formatAssumptionLedger`, `finalizeLedger`, `computeAssumptionPriority`.
- 42 new tests covering citation verification (hallucinated URLs and publication names, shortened titles, path-prefix matching, no-research fallback, input immutability) and ledger ordering (multiplicative priority, tie-breaks, computed riskiest assumption, malformed-number coercion). Suite is now 64 files / 541 tests.

### Changed
- `GauntletReport` gained optional `calibration` and `assumptionLedger` fields; `ScoreRubricEntry` gained optional `basis`, `citations`, and `unverifiedCitations`. All additive — existing consumers are unaffected.
- MCP server now exposes 20 tools (was 19).
- README documents both invariants; `CLAUDE.md` records them as constraints so they are not relaxed later.

## [0.6.1] - 2026-08-26

Maintenance release from a full-project audit. No breaking changes.

### Fixed
- **False "update available" banner on every command** — `getCurrentVersion()` resolved `package.json` with a fixed relative path that is only correct when running from `src/`. Because the build flattens modules into `dist/`, published installs resolved a path outside the package, silently fell back to a hardcoded `"0.5.0"`, and told every user on every version to upgrade. The version is now found by walking up to the `idea-gauntlet` `package.json`, which is correct in dev, in `dist/`, and in `node_modules/`. When the version genuinely cannot be determined the update check is skipped instead of guessing. This also removes the bogus upgrade notice that was being appended to every MCP response.
- **`status` reported a missing install as an error** — a missing manifest is the normal not-installed state, but it surfaced a raw `ENOENT` warning. Only genuine read/parse failures warn now.
- **`formatScores()` ignored unassessed dimensions** — the exported helper computed Overall across all seven dimensions, so library consumers saw an Overall that disagreed with the report's own value. It now accepts `unassessed`, marks those dimensions `n/a`, and matches `overallScore()`.

### Security
- **GitHub Action script injection (`action.yml`)** — caller-controlled inputs were interpolated straight into the composite action's `run:` block, where GitHub substitutes them before the shell parses the script. An input carrying shell metacharacters (a PR title, a branch name) could execute arbitrary commands on the runner. All inputs are now passed through `env:` and referenced as quoted shell variables, with `mode` and `version` validated against allowlists.
- **Timing-safe API token comparison (`serve`)** — bearer tokens were compared with `!==`, which returns on the first differing byte. Now uses `crypto.timingSafeEqual`.
- **Byte-accurate request body limit (`serve`)** — the 10MB cap counted UTF-16 code units, so a multi-byte body could buffer well past the intended ceiling. It now counts bytes.
- **Prompt-injection detection is now wired up** — `detectInjectionAttempts()` existed but was never called. `runGauntlet` now reports instruction-like patterns found in idea text to stderr. Idea text was already, and remains, passed to models as delimited data.

### Added
- Security regression tests for `safeWrite` (path traversal, absolute-path escape, prefix-collision directories, overwrite refusal) and `promptGuard` (fence breakout, injection patterns) — both modules were security boundaries with zero direct test coverage. Test suite is now 62 files / 499 tests.
- CI now runs `lint` with `--max-warnings 0`, smoke-tests the built CLI, asserts the built CLI's reported version matches `package.json` (the check that would have caught the version bug), and runs `npm pack --dry-run`.

### Changed
- Lint is clean: 17 errors and 33 warnings resolved — dead imports and unused locals removed, unnecessary regex escapes fixed, the intentional control-character regex documented, and `while (true)` stream loops no longer flagged.
- Removed internal codename markers that had leaked into published source comments.
- README leads with the demo GIF (previously present in the repo but committed nowhere and referenced nowhere) and surfaces the shareable report card in the intro instead of 300 lines down.
- `CLAUDE.md` command list and architecture map brought back in sync with the actual 28 commands and `src/analysis/`.
- Tests no longer leave a stray `.test-config-tmp/` directory in the working tree.

## [0.6.0] - 2026-08-20

### Added
- **Go-To-Market (GTM) Strategy Engine (`runGTMEngine`)**: Channel priority matrix (organic, paid, community, product-led) with estimated CAC and time-to-first-customer, first-100-customers strategy, launch playbook milestones, and budget allocation.
- **Competitive Intelligence Deep Dive Engine (`runCompetitiveIntelligenceEngine`)**: LLM-powered SWOT competitor profiles, 2D positioning map with X/Y coordinates, strategic windows, attack vectors, and defensive strategies.
- **Revenue Model Explorer Engine (`runRevenueModelEngine`)**: Evaluates and ranks 12 major startup revenue models by fit score with Y1/Y3 projections, tiered pricing structure, and monetization timeline.
- **Founder-Market Fit Analysis Engine (`runFounderMarketFitEngine`)**: Assesses founder domain expertise, network advantage, and execution risk; highlights unfair advantages, skill gaps, co-founder recommendations, and first 3 priority hires.
- **AI-Simulated User Interview Engine (`runUserInterviewEngine`)**: Simulates live in-character customer discovery interviews, extracts latent user needs, evaluates willingness to pay, and analyzes adoption friction.
- **Pitch Deck Draft Generator (`runPitchGenerator`)**: Generates structured 10-12 slide pitch deck outlines based on YC, Sequoia, and a16z venture capital frameworks with headlines, proof points, visual concepts, and speaker notes.
- **Idea Evolution Coach & Pivot Engine (`runEvolutionCoach`)**: Diagnoses core bottlenecks across distribution, monetization, or urgency, and generates 3 structural pivot variants with projected score improvements and 48-hour validation smoke tests.
- **Regulatory & Compliance Risk Scanner (`runComplianceScanner`)**: Scans product ideas for regulatory, privacy, and compliance landmines (GDPR, CCPA, HIPAA, EU AI Act, COPPA, FinTech/SEC), risk severity matrix, and pre-launch engineering privacy checklists.
- **Exposed Ensemble Engine & Trend Monitor**: Exported `runEnsemble`, `formatEnsembleResult`, `analyzeTrend`, and `formatTrendResult` from the core library.
- **8 New CLI Commands**: `gtm`, `compete`, `revenue`, `founder`, `interview`, `pitch`, `evolve`, and `compliance`.
- **10 New MCP Tools**: Added `run_ensemble`, `analyze_trend`, `run_gtm_strategy`, `run_competitive_intelligence`, `run_revenue_model_explorer`, `run_founder_fit`, `interview_synthetic_user`, `generate_pitch_deck`, `evolve_idea`, and `scan_compliance` to the MCP Server (totaling 19 tools).

### Fixed
- **Error Fallback Transparency**: Added explicit `isErrorFallback: true` flags in `marketSizingEngine` and `unitEconomicsEngine` fallbacks to avoid mistaking placeholder data for verified analysis.
- **Test Coverage Expansion**: Added 11 new comprehensive test suites (+71 tests), expanding coverage across all engines, niche detection, trend analysis, and MCP servers (totaling 60 test suites and 456 tests with 100% pass rate).

## [0.5.1] - 2026-08-14

### Added
- **Smart Update Notifier (CLI & MCP/AI Chat)**: Automatically checks npm registry for new versions with localized notices (Vietnamese / English) and copy-ready upgrade commands for both terminal users and AI chat assistants (Claude Desktop / Cursor / Codex).

## [0.5.0] - 2026-08-14

### Added
- **Market Sizing Engine**: Quantitative TAM, SAM, and SOM estimation with CAGR and explicit methodology (`runMarketSizingEngine`).
- **Unit Economics Engine**: Quantitative CAC, LTV, LTV:CAC ratio, payback period, and unit viability assessment (`runUnitEconomicsEngine`).
- **Startup Anti-Pattern & Trap Auditor**: Evaluates ideas against 10 classic startup traps with actionable prevention advice (`runAntiPatternDetector`).
- **Shared Concurrency Runner**: Standardized `withConcurrency` utility across court, batch, and search orchestrators.
- **New MCP Tools**: Added `estimate_market_size`, `analyze_unit_economics`, and `detect_anti_patterns` to the MCP Server.
- **Claude Provider Kind**: Explicit `"claude"` provider kind in `LLMProvider` union.

### Fixed
- **Stage Validation**: Enforced strict validation for `stage` via `IdeaStageSchema` (`"napkin" | "pre-mvp" | "mvp" | "growth"`).
- **Evidence Signal Calibration**: Added missing `"medium"` evidence strength threshold and cross-validated LLM evidence scores against real-world research.
- **Verdict Mapping Accuracy**: Replaced loose substring checks with word-boundary and prefix token matchers to eliminate false positives.
- **Quiet Flag Timing**: Fixed `--quiet` flag activation timing to ensure early warning suppression.
- **Scoring Logic**: Deduplicated `overallScore` by directly delegating to `medianScore`.
- **Workflow Cache Invalidation**: Added `statSync().mtimeMs` checking and `clearWorkflowConfigCache()` so edits on `.ideagauntlet-workflow.json` apply instantly.
- **Search Cache Hash Collision**: Upgraded research cache key hashing to SHA-256 slices.

## [0.3.0] - 2026-07-18

### Added
- **Report Card**: `--format card` on `quick`/`court` renders a self-contained, screenshot-ready 1200×630 verdict card (verdict, overall score, radar, top risks, brutal takeaway, install line).
- **GitHub Action**: composite `action.yml` + example workflow that runs IdeaGauntlet on PRs touching `IDEA.md` and posts an auto-updating verdict comment.
- **Court steelman phase**: the Business Defender opens first with the strongest, fairest version of the idea; skeptics then attack that steelman instead of a strawman.
- **Judge citations**: court verdicts must attribute decisive points to the roles that made them.
- **Grounded rubric scoring**: every assessed dimension now carries `evidence` + a `sensitivity` line ("what would move it ±2"), rendered in reports.
- **Brutal takeaway**: one quotable, sharpest-critique line per report (drives the share card).
- **Examples**: runnable [`examples/IDEA.md`](examples/IDEA.md) plus real agent-native sample [quick](examples/sample-quick-report.md) and [court](examples/sample-court-report.md) reports.
- **Zero-friction start**: no-provider guidance now leads with a copy-paste `npx` one-liner; the `quick` command no longer blocks on an interactive menu in non-TTY (piped/CI) contexts.

### Changed
- **Model defaults updated**: Claude default `claude-3-5-sonnet-latest` → `claude-sonnet-5`; Groq default `llama-3.1-70b-versatile` (decommissioned) → `llama-3.3-70b-versatile`.
- **Honest benchmark labeling**: the score benchmark is now presented as a *synthetic reference set of idea archetypes*, not "real startup ideas with known outcomes".
- **postinstall**: no longer downloads a Chromium browser (~150MB); Playwright is opt-in via `npx playwright install chromium` and web research degrades gracefully without it.
- **users mode scoring**: no longer fills `clarity`/`buildability` with constants — these are marked as unassessed and excluded from the overall score and benchmark.
- **Quick mode evidence**: derives a real evidence signal from the research brief instead of a hardcoded `false`.

### Removed
- Dead Google-scrape fallback in the DuckDuckGo provider (stale HTML selectors; risked flagging the user's IP).

## [0.2.6] - 2026-07-15

### Added
- **Interactive Mode Compare**: Added `/add-idea`, `/list-ideas`, and `/clear-ideas` commands to support multi-idea evaluation and comparison in the REPL.
- **Input Validation**: Added strict validation in all engines to reject empty or whitespace-only ideas upfront.
- **Lazy Load History**: Implemented partial file read (~4KB) in history listing to avoid OOM errors with large history stores.
- **Pagination**: Added `limit` and `offset` parameters to history store listing.

### Fixed
- **Memory Leak**: Fixed un-cleared retry timeout timers in `OpenAICompatibleProvider` and `OllamaProvider`.
- **MCP Empty Markdown**: Fixed MCP tool calls returning empty strings by adding missing `buildReport()` calls.
- **HTML Report Mermaid Diagram**: Fixed HTML entity escaping that broke Mermaid diagram rendering on client-side parsing.
- **MCP Server Version**: Dynamically resolved server version from `package.json` instead of hardcoding "0.2.3".
- **batchEngine**: Ensured individual reports have their markdown populated.
- **compareEngine**: Parallelized web research for all compared ideas (instead of just the first one) and derived a meaningful verdict.
- **syntheticUserLab**: Derived a meaningful scorecard and verdict from synthetic user persona signals rather than returning a static "unclear" verdict.
- **mvpPlanner**: Used dynamic timeline from LLM output instead of a hardcoded "14 days".
- **courtEngine**: Added rate limiting (max 3 concurrent calls) to prevent 429 errors from LLM providers during 7-role debate.
- **HTML Lists**: Wrap list items (`<li>`) in correct `<ul>`/`<ol>` wrappers.
- **Playwright Fetcher**: Reused browser singleton and shared batch browser context to avoid launching new browser instances per URL.

## [0.2.5] - 2026-07-15

### Fixed
- **Bug A**: `runGauntlet` now accepts `compareIdeas?: string[]` for multi-idea comparison — previously only passed a single idea to `runCompareEngine`.
- **Bug B**: Court engine verdict no longer hardcoded to `"unclear"` — now extracts verdict from LLM response via `mapVerdict()`.
- **Bug C**: MVP planner verdict uses proper `Verdict` enum values instead of arbitrary string cast.
- **Bug D**: `safeWriteReport` race condition fixed — `mkdirSync` is now synchronous before `writeFileSync`.
- **Bug E**: MCP server now handles `initialize` handshake per MCP spec.
- **Bug F**: MCP server now handles `ping` method for health checks.
- **Bug G**: Provider calls now have timeout (`AbortController`) and exponential backoff retry with jitter.
- **Bug H**: All engines use `extractJSON()` to strip markdown fences and handle trailing text before `JSON.parse`.
- **Bug I**: `calculateScores` now returns `ScoreReasons` alongside `Scorecard` — scoring reasons are first-class.
- **Bug J**: `CompletionOptions` supports `onToken` callback for streaming — both OpenAI-compatible and Ollama providers support SSE/NDJSON streaming.
- **Bug K**: MCP server emits `notifications/resources/list_changed` after each report creation.
- **Bug L**: OpenAI-compatible provider parses `Retry-After` header on 429 responses and retries with appropriate delay.
- **Bug M**: Added i18n locale framework (`src/utils/locale.ts`) with Vietnamese translation support via `IDEAGAUNTLET_LANG=vi`.
- **Bug P**: Eliminated duplicate `buildReport()` calls — engines no longer build markdown internally; single call at dispatcher level (`runGauntlet` or CLI command).

### Removed
- **Bug N**: Deleted dead code in `src/prompts/` (unused legacy prompt templates).
- **Bug O**: Deleted dead code in `src/agents/` (unused legacy role definitions).
- Deleted `src/providers/llmProvider.ts` (only re-exported types already available from `src/core/types.ts`).

### Added
- **Bug Q**: Error-path test coverage — `StaticProvider` now supports error simulation modes.
- **Bug R**: GitHub Actions CI workflow (`.github/workflows/ci.yml`) — typecheck + test + build across Node 18/20/22.
- **Bug S**: Community files — `CONTRIBUTING.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, issue templates, PR template.
- `src/utils/jsonRepair.ts` — JSON extraction utility for LLM outputs (strips fences, balanced bracket extraction).
- `RetryConfig` interface and `DEFAULT_RETRY` constant in `src/core/types.ts`.
- `ScoreReasons` interface in `src/core/scoring.ts`.

### Changed
- OpenAI-compatible provider rewritten with timeout, retry, streaming, and rate-limit handling.
- Ollama provider rewritten with timeout, retry, and NDJSON streaming.
- All engine files migrated from `JSON.parse` to `extractJSON` for robust LLM output handling.
