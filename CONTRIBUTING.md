# Contributing to IdeaGauntlet

First off, thank you for considering contributing to IdeaGauntlet! 🎯

This project is a tool for stress-testing product ideas before building them. We welcome contributions of all kinds — bug fixes, new workflows, provider integrations, documentation, and more.

## Getting Started

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/IdeaGauntlet.git
   cd IdeaGauntlet
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Verify Setup**
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```

## Development Workflow

### Type Checking
```bash
npm run typecheck
```

### Running Tests
```bash
npm test
```
Tests use `StaticProvider` to mock LLM responses — no API key needed.

### Building
```bash
npm run build
```
Output goes to `dist/`.

### Running Locally
```bash
node dist/cli/index.js quick "Your product idea here"
```

### Testing MCP Server
```bash
node dist/mcp/server.js
```
Send JSON-RPC messages on stdin.

## Architecture Overview

- **`src/core/`** — Types, scoring, report builder, top-level dispatcher (`runGauntlet`)
- **`src/engines/`** — Mode orchestration (immune, court, users, mvp, compare)
- **`src/providers/`** — LLM provider interface + implementations (OpenAI-compatible, Ollama)
- **`src/workflows/`** — Workflow definitions (data-driven prompt templates)
- **`src/mcp/`** — MCP server (JSON-RPC over stdio)
- **`src/cli/`** — CLI commands
- **`src/setup/`** — Agent-native integration setup
- **`src/utils/`** — Shared utilities (env, JSON repair, safeWrite, locale)

### Key Patterns

- **Provider Injection**: All engines accept an `LLMProvider` — never call fetch directly.
- **Workflow Definitions**: Prompts are data (not hardcoded strings in engines). See `src/workflows/definitions/`.
- **JSON Repair**: LLM outputs are parsed via `extractJSON()` which strips markdown fences and handles trailing text.
- **Single buildReport**: Reports are built once at the dispatcher level (CLI command or `runGauntlet`), not inside engines.

## Adding a New Workflow

1. Create `src/workflows/definitions/yourWorkflow.ts` — export a `WorkflowDefinition`.
2. Register it in `src/workflows/definitions/index.ts`.
3. Create an engine in `src/engines/yourEngine.ts`.
4. Add a CLI command in `src/cli/commands/yourCommand.ts`.
5. Register the engine in `src/core/runGauntlet.ts`.
6. Add MCP tool in `src/mcp/tools.ts`.
7. Write tests using `StaticProvider`.

## Adding a New Provider

1. Create `src/providers/yourProvider.ts` implementing `LLMProvider`.
2. Add provider kind to `LLMProvider` union type in `src/core/types.ts`.
3. Register in `src/providers/providerUtils.ts`.

## Pull Request Guidelines

- **One change per PR** — keep PRs focused.
- **Run typecheck + tests** before submitting.
- **Add tests** for new functionality.
- **Update documentation** if you change public API.
- **Follow existing code style** — no Prettier config needed, just match the surrounding code.

## Reporting Bugs

Use GitHub Issues. Include:
- Node.js version
- IdeaGauntlet version (`npm list -g idea-gauntlet`)
- Command that triggered the bug
- Full error output
- Your `.env` or environment variables (redact API keys!)

## License

MIT — see [LICENSE](LICENSE).
