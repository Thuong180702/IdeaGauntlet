# IdeaGauntlet

Stress-test product ideas before you build them.

IdeaGauntlet is an open-source npm CLI that turns a raw product idea into adversarial critique, multi-agent debate, synthetic user objections, validation plans, and idea comparison.

Built for founders, indie hackers, and product engineers who want sharper pre-validation before spending weeks building the wrong thing.

> Most AI tools help you generate more ideas. IdeaGauntlet helps you survive the one you already have.

[![npm version](https://img.shields.io/npm/v/idea-gauntlet)](https://www.npmjs.com/package/idea-gauntlet)

---

## Why IdeaGauntlet?

Most AI tools are optimists. You describe an idea and they tell you why it is great. That is useful for momentum but dangerous for judgment.

IdeaGauntlet does the opposite: it looks for weak assumptions, unclear positioning, distribution traps, and buildability concerns _before_ you write a spec, build a prototype, or pitch an investor.

It is not a market research oracle and not a replacement for real user interviews. It is a thinking and pre-validation tool — a structured way to ask "what am I missing?" before committing time.

---

## Install

```bash
npm install -g idea-gauntlet
```

That is the normal setup. On global install, IdeaGauntlet performs a best-effort integration setup for detected Claude Code, Codex, Cursor, and MCP-compatible clients. If a supported tool is detected, you can use IdeaGauntlet from that tool without a second command.

---

## Try it

### In Claude Code / Codex / Cursor

After installing, open your AI coding tool and ask:

```text
Use IdeaGauntlet court mode to stress-test this idea:

A focus-room app for remote workers that pairs people into silent 50-minute work sessions.
```

No IdeaGauntlet API key is needed for agent-native use — the coding tool supplies the model and context. If postinstall did not detect your tool, run `idea-gauntlet install` later.

### In the terminal

Direct CLI generation:

```bash
idea-gauntlet quick "A focus-room app for remote workers"
```

This requires a provider configuration (see [Provider setup](#provider-setup)).

---

## What it can do

| Workflow                   | What it does                                                                                                          | Use it when                                                         | Output                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Quick critique**         | Fast adversarial review of positioning, assumptions, users, distribution, monetization, and buildability              | You have a rough idea and want a fast sanity check                  | Risk summary, weak assumptions, scores, next tests                           |
| **Court mode**             | Multi-agent debate: Skeptic attacks, Defender argues the best case, Judge gives verdict                               | The idea is important enough for deeper critique                    | Skeptic and defender arguments, verdict, objections, next steps              |
| **Synthetic users**        | Generates fictional personas that react to the idea from different perspectives                                       | You want likely objections and use-case gaps you had not considered | Persona goals, objections, willingness-to-pay concerns, adoption blockers    |
| **MVP planning**           | Converts the idea into a short validation sprint                                                                      | You want to stop debating and test the idea                         | Falsifiable assumptions, experiments, 14-day plan, success and kill criteria |
| **Idea comparison**        | Compares multiple ideas across clarity, pain, differentiation, buildability, distribution, monetization, and evidence | You need to choose what to validate next                            | Side-by-side scoring, tradeoffs, recommendation                              |
| **Agent-native workflows** | Adds IdeaGauntlet instructions to Claude Code, Codex, Cursor, and MCP clients                                         | You want critique inside your normal AI coding workflow             | Natural-language workflows inside supported tools                            |

Synthetic users are not research evidence. Scores are diagnostic signals, not predictions.

---

## Usage examples

### Quick critique

```bash
idea-gauntlet quick "A focus-room app for remote workers"
```

### Court mode

```bash
idea-gauntlet court "A focus-room app for remote workers" --output report.md
```

Court mode runs three roles: the **Skeptic** attacks demand, distribution, defensibility, and execution risk; the **Defender** argues the strongest credible version of the idea; and the **Judge** produces the verdict with recommended next tests.

### Synthetic users

```bash
idea-gauntlet users "A focus-room app for remote workers" --personas 6
```

### MVP plan

```bash
idea-gauntlet mvp "A SaaS inbox that combines Facebook, Zalo, Shopee, and TikTok Shop messages for Vietnamese online sellers."
```

### Compare ideas

```bash
idea-gauntlet compare "A focus-room app for remote workers" "A SaaS inbox for Vietnamese online sellers"
```

---

## Agent-native integrations

IdeaGauntlet can install instructions for supported AI coding tools.

| Tool                   | What IdeaGauntlet installs                                             |
| ---------------------- | ---------------------------------------------------------------------- |
| Claude Code            | Skills, agents, slash-command instructions, MCP config where available |
| Codex                  | AGENTS.md / config bridge                                              |
| Cursor                 | Rules                                                                  |
| MCP-compatible clients | Standalone MCP config                                                  |

Use natural language inside your AI coding tool:

```text
Use IdeaGauntlet quick mode to critique this idea:
...

Use IdeaGauntlet court mode and focus on distribution risk:
...

Use IdeaGauntlet to create a 14-day MVP validation plan:
...
```

If postinstall skipped a tool, rerun integration setup:

```bash
idea-gauntlet install
```

---

## Provider setup

Direct CLI generation requires an LLM provider. IdeaGauntlet supports OpenAI-compatible APIs and local Ollama.

| Workflow                                                | Provider required?                |
| ------------------------------------------------------- | --------------------------------- |
| Agent-native usage in Claude Code / Codex / Cursor      | No IdeaGauntlet provider required |
| Direct CLI: `quick`, `court`, `users`, `mvp`, `compare` | Yes                               |
| MCP generation tools                                    | Yes                               |
| Project-local setup                                     | No                                |

OpenAI-compatible provider:

```bash
export IDEAGAUNTLET_API_KEY="your-key"
export IDEAGAUNTLET_BASE_URL="https://api.openai.com/v1"
export IDEAGAUNTLET_MODEL="gpt-5.5"
```

PowerShell:

```powershell
$env:IDEAGAUNTLET_API_KEY="your-key"
$env:IDEAGAUNTLET_BASE_URL="https://api.openai.com/v1"
$env:IDEAGAUNTLET_MODEL="gpt-5.5"
```

OpenAI-compatible providers include OpenAI, OpenRouter, Groq, Together, Fireworks, LM Studio, and LocalAI.

Local Ollama:

```bash
ollama serve
idea-gauntlet quick "Your idea" --ollama --model llama3
```

---

## Command reference

| Command                         | Purpose                                  |
| ------------------------------- | ---------------------------------------- |
| `idea-gauntlet quick "idea"`    | Fast adversarial critique                |
| `idea-gauntlet court "idea"`    | Multi-agent debate and verdict           |
| `idea-gauntlet users "idea"`    | Synthetic user objections                |
| `idea-gauntlet mvp "idea"`      | Validation / MVP plan                    |
| `idea-gauntlet compare "A" "B"` | Compare multiple ideas                   |
| `idea-gauntlet init`            | Scaffold local workspace                 |
| `idea-gauntlet doctor`          | Check environment and configuration      |
| `idea-gauntlet mcp`             | Start MCP server                         |
| `idea-gauntlet setup --all`     | Optional project-local integration files |

Common options:

| Option                  | Applies to               | Purpose                                      |
| ----------------------- | ------------------------ | -------------------------------------------- |
| `--json`                | quick, court, users, mvp | Output JSON                                  |
| `--output <file>`       | Most generation commands | Save report to file                          |
| `--ollama`              | Generation commands      | Use local Ollama provider                    |
| `--model <name>`        | Generation commands      | Override LLM model                           |
| `--stage <stage>`       | quick, court, users, mvp | Idea maturity (napkin, pre-mvp, mvp, growth) |
| `--target-users <list>` | quick, users             | Comma-separated target users                 |
| `--personas <num>`      | users                    | Number of personas (default: 6)              |
| `--market <market>`     | quick                    | Target market description                    |

---

## Optional project-local setup

Global install is the normal path. If you want to commit IdeaGauntlet instructions into a specific repository:

```bash
idea-gauntlet setup --all
```

This writes project-local integration files such as `.claude/`, `.cursor/`, `.codex/`, and `AGENTS.md`.

Dry run:

```bash
idea-gauntlet setup --dry-run --all
```

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
  targetUsers: ["remote workers", "students"],
  mode: "quick",
  provider,
});

console.log(report.markdown);
```

Custom providers can implement the `LLMProvider` interface.

---

## Scoring philosophy

Scores are diagnostic signals, not predictions.

| Dimension       | What it checks                           |
| --------------- | ---------------------------------------- |
| Clarity         | Is the idea specific and understandable? |
| Pain            | Is there a real painful problem?         |
| Differentiation | Is the approach meaningfully different?  |
| Buildability    | Can a small team test it quickly?        |
| Distribution    | Can it reach its target users?           |
| Monetization    | Is there a credible path to revenue?     |
| Evidence        | What real evidence supports the idea?    |

Evidence scores stay low unless you provide real validation evidence.

---

## Maintenance

Inspect global integrations:

```bash
idea-gauntlet status
```

Rerun global integration setup manually:

```bash
idea-gauntlet install
```

Remove generated global integration files before uninstalling the npm package:

```bash
idea-gauntlet uninstall
npm uninstall -g idea-gauntlet
```

Note: `npm uninstall -g idea-gauntlet` removes the npm package. It may not remove external files written to editor or agent config directories. Use `idea-gauntlet uninstall` first for a clean removal.

---

## Development

```bash
npm install
npm run typecheck
npm run test
npm run build
```

Check the npm package contents:

```bash
npm pack --dry-run
```

---

## License

MIT
