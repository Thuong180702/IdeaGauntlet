# IdeaGauntlet

**Put your idea through trial before users do.**

IdeaGauntlet is an open-source CLI and library that attacks a product idea the way a
skeptical investor, a competitor, and an uninterested customer would — then tells you the
cheapest test that could prove it wrong this week.

[![npm version](https://img.shields.io/npm/v/idea-gauntlet)](https://www.npmjs.com/package/idea-gauntlet)
[![CI](https://github.com/Thuong180702/IdeaGauntlet/actions/workflows/ci.yml/badge.svg)](https://github.com/Thuong180702/IdeaGauntlet/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/idea-gauntlet)](LICENSE)
[![node](https://img.shields.io/node/v/idea-gauntlet)](https://nodejs.org)

![IdeaGauntlet running a quick critique: verdict, scorecard, top risks, and the fastest test to run this week](https://raw.githubusercontent.com/Thuong180702/IdeaGauntlet/main/assets/demo.gif)

```bash
npx idea-gauntlet quick "an AI agent that attends your meetings for you"
```

---

## Contents

- [Get started](#get-started)
- [Tell it what you have](#tell-it-what-you-have)
- [Commands](#commands)
- [What it refuses to fake](#what-it-refuses-to-fake)
- [Options](#options)
- [Output formats](#output-formats)
- [Use it elsewhere](#use-it-elsewhere) — Claude Code / Cursor / Codex, MCP, TypeScript, REST, GitHub Action
- [Configuration](#configuration)

---

## Get started

**1. Install** (or skip this and use `npx idea-gauntlet ...`)

```bash
npm install -g idea-gauntlet
```

**2. Pick a model** — one of:

```bash
export ANTHROPIC_API_KEY=sk-ant-...      # Anthropic
export GROQ_API_KEY=gsk_...              # Groq
idea-gauntlet quick "..." --ollama --model llama3   # local, free
```

Any OpenAI-compatible endpoint works too (OpenAI, OpenRouter, Together, LM Studio…) — see
[Configuration](#configuration). Already use **Claude Code, Cursor, or Codex**? You need no
key at all: [use it there](#claude-code--cursor--codex).

**3. Run it**

```bash
idea-gauntlet quick "A focus-room app for remote workers"
```

Stuck? `idea-gauntlet` with no arguments prints a getting-started screen, and
`idea-gauntlet doctor` tells you which model will be used and what to fix.

The idea can be inline text, a `.md` / `.txt` file, or `-` to read stdin:

```bash
idea-gauntlet court idea.md
cat idea.md | idea-gauntlet assumptions -
```

### Example

Two real reports for [`examples/IDEA.md`](examples/IDEA.md):
[quick](examples/sample-quick-report.md) · [court](examples/sample-court-report.md)

> 🔪 **Focusmate has done exactly this since 2016 — "FocusRoom" as described is a feature, not a company; without a niche it can't defend, you're volunteering to fight a funded incumbent with a worse version of their product.**

| Dimension | Score | Basis | Evidence |
|---|---|---|---|
| Differentiation | 2/10 | `sourced` | Focusmate already offers paired 50-min silent coworking since 2016 |
| Distribution | 3/10 | `judgment` | Two-sided cold start: an empty room is worthless |
| Buildability | 8/10 | `judgment` | A fake-door page plus manual matching is enough to test |

---

## Tell it what you have

Generic advice ("run paid ads", "a 14-day sprint") is useless if you have $500 and evenings
only. Tell IdeaGauntlet your resources and every command fits its plan to them: tests you
can afford, real calendar time at your pace, your existing audience used first, and your
skill gaps called out as risks.

```bash
idea-gauntlet mvp idea.md \
  --background "Backend dev, 6 years. No mobile, design or sales experience" \
  --budget "$3000" \
  --time "10h/week alongside a full-time job" \
  --deadline "decide in 4 months whether to quit" \
  --assets "Admin of a 2,000-member Facebook group of cafe owners; a cafe that will pilot"
```

Set it once in `.ideagauntlet.json` instead of repeating flags:

```json
{
  "founder": {
    "background": "Backend dev, no sales experience",
    "team": "solo",
    "budget": "$3000",
    "time": "10h/week",
    "assets": "2,000-member Facebook group of cafe owners"
  }
}
```

This is about what is *feasible for you*, not what is *true about the market*: your
self-description is never treated as evidence and can never make a score `sourced`.

---

## Commands

**Start here**

| Command | What you get |
|---|---|
| `quick <idea>` | Verdict, scorecard, top risks and assumptions, competitors, the fastest test to run |
| `court <idea>` | Seven specialist roles debate the idea; a judge rules. Slower, deeper |
| `assumptions <idea>` | What must be true, the number that kills each assumption, and which to test first |

**Plan the next step**

| Command | What you get |
|---|---|
| `mvp <idea>` | A minimal validation plan: what not to build, experiments, kill criteria, pivots |
| `users <idea>` | Synthetic personas with objections and interview questions (fictional — not research) |
| `interview <idea>` | A simulated customer-discovery interview with one persona |
| `compare <a> <b> ...` | Side-by-side scoring to decide which idea to validate first |

**Go deeper**

| Command | What you get |
|---|---|
| `gtm <idea>` | Beachhead segment, ranked channels, first-100-customers playbook, budget split |
| `compete <idea>` | Competitor profiles, positioning map, attack vectors (`--depth deep`) |
| `revenue <idea>` | Revenue models ranked by fit, with pricing tiers |
| `founder <idea>` | Founder-market fit: advantages, gaps, co-founder profile (needs `--background`) |
| `evolve <idea>` | The main bottleneck and three structural pivots (`--focus monetization`) |
| `compliance <idea>` | Regulatory and privacy risks — GDPR, HIPAA, AI Act… (`--regions us,eu`) |
| `pitch <idea>` | Investor deck outline (`--template yc \| sequoia \| a16z`) |

**Run in bulk, track over time**

| Command | What you get |
|---|---|
| `batch <file>` | Screen many ideas, one per line (`--mode quick \| court \| users \| mvp`) |
| `ensemble <idea>` | Same idea through several models; consensus and disagreement (`--models a,b`) |
| `history [id]` | Reports saved with `--save`; `--evolve <old-id>` shows score changes |
| `trend [id]` | Re-research a saved idea for new competitors |
| `interactive [idea]` | REPL: refine the idea, switch modes, `/defend` against the court, `/drill` into a risk |

**Setup and integration:** `doctor`, `setup`, `install`, `uninstall`, `status`, `init`,
`templates`, `mcp`, `serve`, `team`. Run `idea-gauntlet <command> --help` for any of them.

> Synthetic users and simulated interviews are fictional archetypes. Scores are diagnostic
> signals, not predictions. Neither replaces talking to real customers.

---

## What it refuses to fake

### Scores say whether they are evidence or a guess

Every score is labelled `sourced` (backed by research that was actually retrieved) or
`judgment` (the model's opinion). A model cannot promote its own guess: the sources it
cites are checked against the retrieved research, and any citation that isn't there is
stripped, flagged as unverified, and the score drops to `judgment`. Each report states the
ratio plainly:

> **Evidence-backed:** 1/3 scored dimensions `●○○` — 1 claimed citation was not found in the
> research and was not counted.

With no research available (`--no-search`, or offline), every score is `judgment` and the
report says so.

### Assumptions come with a number that kills them

```bash
idea-gauntlet assumptions "A focus-room app for remote workers"
```

| # | Assumption | If false | Test | Time | Cost | Kill threshold |
|---|---|---|---|---|---|---|
| 1 | Remote workers will pay $10/mo rather than use a free timer | FATAL | Fake-door page + payment link | 3d | $50 | Fewer than 8 of 40 visitors leave an email |
| 2 | A new room is never empty at peak hours | FATAL | Manually match 20 volunteers for a week | 7d | $0 | Under 60% of requested slots matched |

> **Resolving every fatal assumption:** 10 days, $50.

A threshold must contain a number, decided before you run the test. The order is computed
in code (criticality × uncertainty × cheapness), not left to the model.

### Failures are failures

If the model call fails or returns nothing usable, you get an error — not a plausible-looking
placeholder. A report that is only partly usable says so at the top of the file.

---

## Options

**Your situation** — all analysis commands

| Option | Example |
|---|---|
| `--background <text>` | `"Backend dev, no sales experience"` |
| `--team <text>` | `"solo"` / `"2 founders: dev + designer"` |
| `--budget <amount>` | `"$3000"` |
| `--time <text>` | `"10h/week alongside a job"` |
| `--deadline <text>` | `"decide in 4 months"` |
| `--assets <text>` | `"newsletter with 1,200 subscribers"` |

**The idea** — most analysis commands

| Option | Example |
|---|---|
| `--stage <stage>` | `napkin`, `pre-mvp`, `mvp`, `growth` |
| `--market <text>` | `"independent cafes in Vietnam"` |
| `--target-users <list>` | `"cafe owners,baristas"` |

**Output and model** — all analysis commands

| Option | Purpose |
|---|---|
| `-o, --output <file>` | Write to a file instead of stdout |
| `--json` | Machine-readable output |
| `--format <fmt>` | `html` (quick, court, users, mvp, compare), `card` (quick, court), `pdf` (quick) |
| `--lang <code>` | Answer in `vi`, `es`, `fr`, `de`, `ja`, `zh`, `ko`, `pt`, `it`, `ru`, `ar` |
| `--save` | Keep the report in history (quick, court, users, mvp, compare) |
| `--no-search` | Skip web research (faster, but every score becomes `judgment`) |
| `--model`, `--ollama`, `--api-key`, `--base-url` | Choose the model for this run |
| `--quiet` | Hide warnings |

`--lang` translates prose only; verdicts, score keys, numbers, and citations stay as-is so
evidence checking still works.

---

## Output formats

```bash
idea-gauntlet quick "Your idea" -o report.md                   # Markdown (default)
idea-gauntlet court "Your idea" --format html -o report.html   # styled page, radar chart, diagrams
idea-gauntlet quick "Your idea" --format card -o idea.html     # writes idea.card.html
idea-gauntlet quick "Your idea" --json                         # for scripts
```

`--format card` renders a single 1200×630 image-sized page — verdict, score radar, top
risks, and the one-line takeaway — made to screenshot and share.

---

## Use it elsewhere

### Claude Code / Cursor / Codex

`npm install -g idea-gauntlet` installs skills, agents, and rules for the tools it detects
(non-destructive, reversible with `idea-gauntlet uninstall`). Then just ask:

```text
Use IdeaGauntlet court mode to stress-test this idea:
A focus-room app for remote workers that pairs people into silent 50-minute sessions.
I'm a solo developer with $2,000 and 10 hours a week.
```

No IdeaGauntlet key is needed — your coding tool supplies the model. If a tool was not
detected, run `idea-gauntlet install`; to commit the files into one repo instead, run
`idea-gauntlet setup --all`.

### MCP

```bash
idea-gauntlet mcp
```

Exposes 20 tools (`quick_critique`, `run_court`, `build_assumption_ledger`,
`run_gtm_strategy`, …). Every idea tool accepts an optional `founder` object with the
same fields as the CLI flags.

### TypeScript

```ts
import { runGauntlet, runAssumptionLedger, ClaudeProvider } from "idea-gauntlet";

const provider = new ClaudeProvider({ apiKey: process.env.ANTHROPIC_API_KEY! });

const report = await runGauntlet({
  idea: "A focus-room app for remote workers",
  mode: "quick", // quick | court | users | mvp | compare
  founder: { budget: "$2000", time: "10h/week", background: "solo developer" },
  provider,
});
console.log(report.markdown);

const ledger = await runAssumptionLedger({ idea: "A focus-room app" }, provider);
```

Every engine is exported (`runGTMEngine`, `runCompetitiveIntelligenceEngine`,
`runRevenueModelEngine`, …). Bring your own model by implementing `LLMProvider`
(`{ kind: "custom", complete(prompt, options) }`). Deep-dive engines reject with
`AnalysisFailedError` when the model gives no usable answer.

### REST API

```bash
idea-gauntlet serve --port 3000 --api-token "$(openssl rand -hex 16)"
```

Binds to `127.0.0.1` by default. Use `--host 0.0.0.0` only together with `--api-token`
(or `IDEAGAUNTLET_API_TOKEN`).

### GitHub Action

Critique `IDEA.md` on every pull request that changes it:

```yaml
- uses: Thuong180702/IdeaGauntlet@v1
  with:
    idea-file: IDEA.md
    mode: court            # or quick
    api-key: ${{ secrets.IDEAGAUNTLET_API_KEY }}
```

A complete workflow that posts the verdict as a PR comment is in
[`.github/workflows/example-idea-gauntlet.yml`](.github/workflows/example-idea-gauntlet.yml).

---

## Configuration

**Environment variables**

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Use Anthropic (default model `claude-sonnet-5`) |
| `GROQ_API_KEY` | Use Groq (default model `llama-3.3-70b-versatile`) |
| `IDEAGAUNTLET_API_KEY`, `IDEAGAUNTLET_BASE_URL`, `IDEAGAUNTLET_MODEL` | Any OpenAI-compatible endpoint |
| `IDEAGAUNTLET_LANG` | Default report language |
| `IDEAGAUNTLET_SEARCH_PROVIDER`, `IDEAGAUNTLET_SEARCH_API_KEY` | Use Serper for web research instead of the free sources |
| `IDEAGAUNTLET_QUIET` | Hide warnings |

**`.ideagauntlet.json`** — looked up from the current directory upward. CLI flags win.

```json
{
  "model": "claude-sonnet-5",
  "lang": "vi",
  "founder": { "budget": "$3000", "time": "10h/week" }
}
```

**Custom court roles** — `idea-gauntlet court idea.md --roles roles.json`. A role with an
existing `id` replaces it; a new `id` is added.

```json
[
  {
    "id": "regulator",
    "name": "Food Safety Regulator",
    "stance": "skeptic",
    "mandate": "Attack anything that touches food handling or hygiene rules.",
    "mustAddress": ["Which permits are required?", "What happens after a failed inspection?"]
  }
]
```

---

## Development

```bash
npm install
npm run lint && npm run typecheck && npm test && npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CHANGELOG.md](CHANGELOG.md).

## License

MIT
