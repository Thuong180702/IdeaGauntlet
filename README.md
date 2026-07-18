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

On global install, IdeaGauntlet performs best-effort integration setup for detected Claude Code, Codex, Cursor, and MCP-compatible clients. All writes are non-destructive (never overwriting your files) and fully reversible via `idea-gauntlet uninstall`. The install downloads no browser and runs no network install; if postinstall was skipped (e.g. `--ignore-scripts`), run `idea-gauntlet install` yourself.

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

| Workflow | What it does | Use it when | Output |
|---|---:|---|---|
| **Quick critique** | Fast adversarial review: top risks, assumptions, best/worst case, fastest test | You want a fast sanity check | Risks, assumptions, scores, validation test |
| **Court mode** | Structured multi-role debate with 7 specialist roles and judge verdict | The idea needs deeper critique | Role arguments, evidence audit, kill tests, scores, verdict |
| **Synthetic users** | Fictional personas with objections, switching costs, and interview questions | You want to prepare for real user research | Persona cards, objections, interview questions |
| **MVP planning** | Ruthlessly minimal validation plan with kill criteria and pivot options | You want to test, not debate | 14-day plan, experiments, kill criteria, pivot options |
| **Idea comparison** | Side-by-side scoring across 10 dimensions with per-idea kill tests | You need to choose what to validate | Comparison matrix, tradeoffs, recommendation |
| **Batch mode** | Run critique on multiple ideas from a file | You have several ideas to screen | Bulk reports with scores + verdicts |
| **History & evolution** | Save reports, track score deltas over time | You want to measure idea improvement | Saved reports, score deltas, evolution timeline |
| **Interactive mode** | REPL for iterative refinement, drill-down, mode switching | You want to refine an idea live | Re-runs, benchmark, diagrams, exports |
| **HTML export** | Styled dark-mode HTML report with radar chart + diagrams | You need shareable visual reports | Self-contained HTML page |
| **Score benchmarking** | Compare scores against a synthetic reference set of 50 idea archetypes | You want rough distributional context for your scores | Percentile ranking, similar archetypes |

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

# Export HTML report
idea-gauntlet quick "Your idea" --format html --output report.html

# Batch mode (one idea per line in file)
idea-gauntlet batch ideas.txt --mode quick --output reports/

# Interactive REPL
idea-gauntlet interactive "Your idea"

# History — view saved reports
idea-gauntlet history

# History — compare score delta
idea-gauntlet history <id> --evolve <old-id>
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

### Evidence-aware analysis

Inside tools that provide web/search access, IdeaGauntlet agent-native court mode may perform a brief market evidence scan before the debate. It uses this research to build a research brief, competitor landscape, evidence gaps, and source notes before the judge verdict.

Terminal CLI mode does not guarantee live web browsing. It uses the configured provider and any context you provide.

---

## Provider setup

Direct CLI and MCP generation require a provider. Agent-native workflows do not.

**Anthropic Claude (Native):**

Simply set your Anthropic API key, or provide a key with the prefix `sk-ant-` as `IDEAGAUNTLET_API_KEY`:

```bash
export ANTHROPIC_API_KEY="your-anthropic-key"
# Optional model override (default: claude-sonnet-5)
export IDEAGAUNTLET_MODEL="claude-sonnet-5"
```

**Groq (Native):**

Set your Groq API key, or provide a key with the prefix `gsk_` as `IDEAGAUNTLET_API_KEY`:

```bash
export GROQ_API_KEY="your-groq-key"
# Optional model override (default: llama-3.3-70b-versatile)
export IDEAGAUNTLET_MODEL="llama-3.3-70b-versatile"
```

**OpenAI-compatible:**

```bash
export IDEAGAUNTLET_API_KEY="your-key"
export IDEAGAUNTLET_BASE_URL="https://api.openai.com/v1"
export IDEAGAUNTLET_MODEL="<your-model>"
```

**Local Ollama:**

```bash
ollama serve
idea-gauntlet quick "Your idea" --ollama --model llama3
```

Supports OpenAI, OpenRouter, Groq, Anthropic Claude, Together, Fireworks, LM Studio, LocalAI.

---

## Command reference

| Command | Purpose |
|---|---|
| `idea-gauntlet quick "idea"` | Fast adversarial critique |
| `idea-gauntlet court "idea"` | Structured multi-role debate |
| `idea-gauntlet users "idea"` | Synthetic user personas |
| `idea-gauntlet mvp "idea"` | Validation / MVP plan |
| `idea-gauntlet compare "A" "B"` | Compare multiple ideas |
| `idea-gauntlet batch <file>` | Run critique on multiple ideas |
| `idea-gauntlet interactive [idea]` | Interactive REPL — refine, drill-down |
| `idea-gauntlet history [id]` | View saved reports, track evolution |
| `idea-gauntlet init` | Scaffold workspace |
| `idea-gauntlet doctor` | Check configuration |
| `idea-gauntlet mcp` | Start MCP server |
| `idea-gauntlet setup --all` | Generate integration files for Claude/Codex/Cursor/MCP |

### Common options

| Option | Applies to | Purpose |
|---|---|---|
| `--json` | quick, court, users, mvp | Output JSON |
| `--format html` | quick, court, users, mvp, compare | Output styled HTML report |
| `--format card` | quick, court | Output a shareable 1200×630 verdict card (screenshot & post) |
| `--output <file>` | Most commands | Save to file |
| `--ollama` | Generation commands | Use local Ollama |
| `--model <name>` | Generation commands | Override LLM model |
| `--stage <stage>` | quick, court, users, mvp | Idea maturity |
| `--target-users <list>` | quick, users | Comma-separated target users |
| `--personas <num>` | users | Number of personas |
| `--market <market>` | quick | Market description |
| `--save` | quick, court | Save report to history store |
| `--no-search` | All generation commands | Disable web search before analysis |
| `--roles <file>` | court | Load custom court roles from JSON |
| `--evolve <id>` | history | Compare scores against a saved report |

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

## Visualization and HTML export

Generate a styled, self-contained HTML report with radar chart and Mermaid diagrams:

```bash
idea-gauntlet quick "Your idea" --format html -o report.html
idea-gauntlet court "Your idea" --format html -o report.html
```

The HTML report includes:
- **Radar chart** — 7-dimension score visualization (pure SVG, no dependencies)
- **Mermaid diagrams** — MVP flowchart, timeline Gantt, court mindmap (rendered via CDN)
- **Dark-mode design** — styled CSS, glassmorphism header, responsive layout

### Shareable Report Card

Generate a single, self-contained **1200×630 card** (OG / Twitter preview size) built to
screenshot and share — verdict badge, overall score, score radar, top risks, and the
one-line **brutal takeaway**:

```bash
idea-gauntlet quick "Your idea" --format card -o idea.html   # writes idea.card.html
idea-gauntlet court "Your idea" --format card -o idea.html
```

Open the file, screenshot it, and post it. The card carries the tool name and install
line, so every share is a link back.

---

## Use in CI (GitHub Action)

Run IdeaGauntlet automatically on every pull request that touches `IDEA.md` and post the
verdict as a single, auto-updating PR comment — idea review as part of your workflow, like
code review.

```yaml
# .github/workflows/idea-gauntlet.yml
name: IdeaGauntlet
on:
  pull_request:
    paths: ["IDEA.md"]
permissions:
  contents: read
  pull-requests: write
jobs:
  critique:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - id: gauntlet
        uses: Thuong180702/IdeaGauntlet@v1   # pin to a released tag
        with:
          idea-file: IDEA.md
          mode: court                         # or 'quick' to save tokens
          api-key: ${{ secrets.IDEAGAUNTLET_API_KEY }}
      - uses: actions/github-script@v7
        if: steps.gauntlet.outputs.skipped != 'true'
        env:
          REPORT_FILE: ${{ steps.gauntlet.outputs.report-file }}
        with:
          script: |
            const fs = require('fs');
            const MARKER = '<!-- idea-gauntlet -->';
            const body = MARKER + '\n🤖 **IdeaGauntlet** stress-tested this idea:\n\n' + fs.readFileSync(process.env.REPORT_FILE, 'utf8');
            const { owner, repo } = context.repo;
            const issue_number = context.issue.number;
            const { data: comments } = await github.rest.issues.listComments({ owner, repo, issue_number });
            const existing = comments.find((c) => c.body && c.body.includes(MARKER));
            if (existing) await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
            else await github.rest.issues.createComment({ owner, repo, issue_number, body });
```

A copy-pasteable version lives at [`.github/workflows/example-idea-gauntlet.yml`](.github/workflows/example-idea-gauntlet.yml).
Add your key as a repo secret named `IDEAGAUNTLET_API_KEY` (Anthropic `sk-ant-…` or Groq `gsk_…`) — it is passed via env and never logged.

---

## Interactive mode

Refine ideas iteratively in a REPL:

```bash
idea-gauntlet interactive "Your idea"
```

Commands:

| Command | Purpose |
|---|---|
| `/idea <text>` | Update idea text |
| `/mode <mode>` | Switch mode (quick, court, users, mvp, compare) |
| `/run` | Run analysis with current idea + mode |
| `/benchmark` | Compare scores to benchmark dataset |
| `/diagram` | Generate Mermaid diagram (MVP mode only) |
| `/save` | Save report to history store |
| `/export html` | Export HTML report |
| `/drill <n>` | Drill down into risk #n + optional court re-run |
| `/help` | Show available commands |
| `/quit` | Exit interactive mode |

---

## Score benchmarking

Compare your scores against a **synthetic reference set** of 50 idea archetypes with illustrative (hand-authored, not measured) outcomes and scores. This gives rough distributional context — it is **not** real-company data and must not be read as a prediction.

In interactive mode, run `/benchmark` after analysis to see:
- Per-dimension percentile ranking
- Overall percentile
- Similar ideas from the benchmark dataset
- Outcome distribution of similar ideas

> Benchmark is a directional guide, not a prediction. Dataset is small and retrospective.

---

## Batch mode

Run critique on multiple ideas from a text file (one idea per line):

```bash
idea-gauntlet batch ideas.txt --mode quick --output reports/
```

Outputs individual reports to the specified directory, or prints all to stdout.

---

## History and evolution tracking

Save reports and track how scores change as you iterate:

```bash
# Save a report (use --save flag on any command)
idea-gauntlet quick "Your idea" --save

# List all saved reports
idea-gauntlet history

# View a specific report
idea-gauntlet history <id>

# Compare score deltas between two saved reports
idea-gauntlet history <new-id> --evolve <old-id>
```

---

## Interactive Court Defense

When running in **Interactive mode**, you can defend your idea against skeptics in **Court mode**:

1. Start interactive mode: `idea-gauntlet interactive "Your idea"`
2. Set mode to court: `/mode court`
3. Add a defense argument: `/defend "We bypass this distribution risk by partnering with key industry platforms directly."`
4. Run court analysis: `/run`
5. The Judge and Skeptics will dynamically process your defense, debate it, and re-calibrate the scorebars in the report.
6. Clear defenses at any time: `/clear-defenses`

---

## Custom court roles

Load custom roles from a JSON file for court mode:

```bash
idea-gauntlet court "Your idea" --roles my-roles.json
```

Role file format:

```json
[
  {
    "roleName": " distribution skeptic",
    "perspective": "Question how this reaches users without paid acquisition."
  }
]
```

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
