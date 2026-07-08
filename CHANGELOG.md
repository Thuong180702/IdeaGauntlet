# Changelog

All notable changes to IdeaGauntlet will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
