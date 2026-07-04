# IdeaGauntlet

Stress-test product ideas before you build them.

IdeaGauntlet is an open-source CLI and library that turns a raw product idea into adversarial critique, multi-role debate, synthetic user objections, validation plans, and idea comparison.

Built for founders, indie hackers, and product engineers who want sharper pre-validation before spending weeks building the wrong thing.

> Most AI tools help you generate more ideas. IdeaGauntlet helps you survive the one you already have.

[![npm version](https://img.shields.io/npm/v/idea-gauntlet)](https://www.npmjs.com/package/idea-gauntlet)

---

## Install

```bash
npm install -g idea-gauntlet
```

On global install, IdeaGauntlet performs best-effort integration setup for detected Claude Code, Codex, Cursor, and MCP-compatible clients.

---

## Try it

### Inside Claude Code / Codex / Cursor

After installing, open your AI coding tool and ask:

```text
Use IdeaGauntlet court mode to stress-test this idea:

A focus-room app for remote workers that pairs people into silent 50-minute work sessions.
```

**No IdeaGauntlet API key is needed.** The AI coding tool supplies the model and context. If postinstall did not detect your tool, run `idea-gauntlet install` later.

> **Important:** Agent-native integrations execute workflows natively. They do not run the `idea-gauntlet` CLI first. If you type `idea-gauntlet court "..."` in chat, the assistant treats it as analysis intent, not a shell command.

### In the terminal

Direct CLI generation requires a provider:

```bash
idea-gauntlet quick "A focus-room app for remote workers"
```

See [Provider setup](#provider-setup).

---

## Core features

| Workflow | What it does | Use it when |
|---|---|---|
| **Quick critique** | Fast adversarial review: top risks, assumptions, best/worst case, fastest test | You want a fast sanity check |
| **Court mode** | Structured multi-role debate with 7 specialist roles and judge verdict | The idea needs deeper critique |
| **Synthetic users** | Fictional personas with objections, switching costs, and interview questions | You want to prepare for real user research |
| **MVP planning** | Ruthlessly minimal validation plan with kill criteria and pivot options | You want to test, not debate |
| **Idea comparison** | Side-by-side scoring across 10 dimensions with per-idea kill tests | You need to choose what to validate |

Synthetic users are fictional — not research evidence. Scores are diagnostic signals, not predictions.

---

## Quick start examples

```bash
# Quick critique
idea-gauntlet quick "A focus-room app for remote workers"

# Court mode (save to file)
idea-gauntlet court "Your idea" --output report.md

# Synthetic users
idea-gauntlet users "Your idea" --personas 8

# MVP plan
idea-gauntlet mvp "Your idea"

# Compare ideas
idea-gauntlet compare "Idea A" "Idea B"
```

---

## Agent-native integrations

IdeaGauntlet installs instructions for supported coding tools:

| Tool | What gets installed |
|---|---|
| Claude Code | Skills, agents, slash-commands, MCP config |
| Codex | AGENTS.md / config bridge |
| Cursor | Rules per workflow |
| MCP clients | MCP server config |

```bash
# Rerun integration setup if postinstall skipped a tool
idea-gauntlet install
```

Use natural language:

```text
Use IdeaGauntlet court mode and focus on distribution risk:
...
```

---

## Provider setup

Direct CLI and MCP generation require a provider. Agent-native workflows do not.

**OpenAI-compatible:**

```bash
export IDEAGAUNTLET_API_KEY="your-key"
export IDEAGAUNTLET_BASE_URL="https://api.openai.com/v1"
export IDEAGAUNTLET_MODEL="gpt-5.5"
```

**Local Ollama:**

```bash
ollama serve
idea-gauntlet quick "Your idea" --ollama --model llama3
```

Supports OpenAI, OpenRouter, Groq, Together, Fireworks, LM Studio, LocalAI.

---

## Command reference

| Command | Purpose |
|---|---|
| `idea-gauntlet quick "idea"` | Fast adversarial critique |
| `idea-gauntlet court "idea"` | Structured multi-role debate |
| `idea-gauntlet users "idea"` | Synthetic user personas |
| `idea-gauntlet mvp "idea"` | Validation / MVP plan |
| `idea-gauntlet compare "A" "B"` | Compare multiple ideas |
| `idea-gauntlet init` | Scaffold workspace |
| `idea-gauntlet doctor` | Check configuration |
| `idea-gauntlet mcp` | Start MCP server |
| `idea-gauntlet install` | (Re)run integration setup |
| `idea-gauntlet uninstall` | Remove global integrations |
| `idea-gauntlet status` | Show integration status |

### Common options

| Option | Applies to | Purpose |
|---|---|---|
| `--json` | quick, court, users, mvp | Output JSON |
| `--output <file>` | Most commands | Save to file |
| `--ollama` | Generation commands | Use local Ollama |
| `--model <name>` | Generation commands | Override LLM model |
| `--stage <stage>` | quick, court, users, mvp | Idea maturity |
| `--target-users <list>` | quick, users | Comma-separated target users |
| `--personas <num>` | users | Number of personas |
| `--market <market>` | quick | Market description |

---

## TypeScript API

```ts
import { runGauntlet, OpenAICompatibleProvider } from "idea-gauntlet";

const provider = new OpenAICompatibleProvider({
  apiKey: process.env.IDEAGAUNTLET_API_KEY!,
  model: "gpt-4o-mini",
});

const report = await runGauntlet({
  idea: "A focus-room app for remote workers",
  mode: "quick",
  provider,
});

console.log(report.markdown);
```

Custom providers implement the `LLMProvider` interface.

---

## Scoring philosophy

Scores are diagnostic signals, not predictions.

| Dimension | What it checks |
|---|---|
| Clarity | Is the idea specific and understandable? |
| Pain | Is there a real painful problem? |
| Differentiation | Is the approach meaningfully different? |
| Buildability | Can a small team test it quickly? |
| Distribution | Can it reach target users? |
| Monetization | Is there a credible path to revenue? |
| Evidence | What real evidence supports the idea? |

Evidence scores stay low unless you provide real validation evidence.

---

## Optional project-local setup

Global install is the normal path. To commit IdeaGauntlet instructions into a specific repo:

```bash
idea-gauntlet setup --all
```

Dry run: `idea-gauntlet setup --dry-run --all`

---

## Maintenance

```bash
# Check global install status
idea-gauntlet status

# Rerun integration setup
idea-gauntlet install

# Remove integrations before uninstalling
idea-gauntlet uninstall
npm uninstall -g idea-gauntlet
```

---

## Development

```bash
npm install
npm run typecheck
npm run test
npm run build
npm pack --dry-run
```

---

## License

MIT
