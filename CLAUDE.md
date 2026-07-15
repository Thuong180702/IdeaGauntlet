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

```bash
idea-gauntlet quick "your idea"
idea-gauntlet court idea.md
idea-gauntlet users idea.md --personas 8
idea-gauntlet mvp idea.md
idea-gauntlet compare idea-a.md idea-b.md
idea-gauntlet init
idea-gauntlet setup --dry-run --all
idea-gauntlet doctor --verbose
idea-gauntlet mcp
```

## Architecture

Use the current single-package structure:

```txt
src/
  agents/       prompt builders and role definitions
  cli/          cac CLI commands
  core/         shared types, report builder, scoring, dispatch
  engines/      mode orchestration
  integrations/ Claude/Cursor/Codex/GitHub generators
  mcp/          MCP server, tools, resources
  providers/    production providers
  prompts/      reusable prompt templates
  utils/        input parsing, env, safe writes
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
