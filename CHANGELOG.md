# Changelog

All notable changes to IdeaGauntlet will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
