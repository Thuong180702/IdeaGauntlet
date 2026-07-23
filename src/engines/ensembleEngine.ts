/**
 * F-05: Multi-model ensemble — run same idea through 2+ providers,
 * aggregate scores, show disagreement. Reduces single-model bias.
 */

import type { LLMProvider, GauntletReport, Scorecard, GauntletMode } from "../core/types.js";
import { runGauntlet } from "../core/runGauntlet.js";
import { warn } from "../utils/warn.js";

export interface EnsembleResult {
  reports: GauntletReport[];
  aggregateScores?: Scorecard;
  disagreement: Partial<Record<keyof Scorecard, number>>;
  consensusVerdict: string;
}

export async function runEnsemble(params: {
  idea: string;
  mode: GauntletMode;
  providers: LLMProvider[];
  targetUsers?: string[];
  market?: string;
  stage?: string;
  enableSearch?: boolean;
}): Promise<EnsembleResult> {
  const { idea, mode, providers } = params;
  if (providers.length < 2) {
    throw new Error("Ensemble requires at least 2 providers");
  }

  // Run all providers in parallel.
  const results = await Promise.allSettled(
    providers.map((provider) =>
      runGauntlet({
        idea: params.idea,
        targetUsers: params.targetUsers,
        market: params.market,
        stage: params.stage,
        mode,
        provider,
        enableSearch: params.enableSearch,
      })
    )
  );

  const reports: GauntletReport[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      reports.push(r.value);
    } else {
      warn(`ensemble: Provider failed: ${r.reason?.message ?? "unknown"}`);
    }
  }

  if (reports.length === 0) {
    return {
      reports: [],
      disagreement: {},
      consensusVerdict: "all_models_failed",
    };
  }

  // Aggregate scores — average across models that produced scores.
  const scored = reports.filter((r) => r.scores);
  let aggregateScores: Scorecard | undefined;
  const disagreement: Partial<Record<keyof Scorecard, number>> = {};

  if (scored.length > 0) {
    const dims: (keyof Scorecard)[] = [
      "clarity", "pain", "differentiation",
      "buildability", "distribution", "monetization", "evidence",
    ];

    aggregateScores = {} as Scorecard;
    for (const dim of dims) {
      const values = scored
        .map((r) => r.scores![dim])
        .filter((v) => v !== undefined && v !== 0); // skip unassessed (0)

      if (values.length > 0) {
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        (aggregateScores as any)[dim] = avg;

        // Disagreement = max - min
        const max = Math.max(...values);
        const min = Math.min(...values);
        if (values.length > 1) {
          disagreement[dim] = max - min;
        }
      } else {
        (aggregateScores as any)[dim] = 0;
      }
    }
  }

  // Consensus verdict — most common among successful reports.
  const verdicts = reports.map((r) => r.verdict);
  const verdictCounts: Record<string, number> = {};
  for (const v of verdicts) {
    verdictCounts[v] = (verdictCounts[v] ?? 0) + 1;
  }
  let consensusVerdict = reports[0].verdict;
  let maxCount = 0;
  for (const [v, c] of Object.entries(verdictCounts)) {
    if (c > maxCount) {
      maxCount = c;
      consensusVerdict = v as any;
    }
  }

  return {
    reports,
    aggregateScores,
    disagreement,
    consensusVerdict,
  };
}

export function formatEnsembleResult(result: EnsembleResult): string {
  const lines: string[] = [];
  lines.push("# Ensemble Analysis Report\n");
  lines.push(`**Models:** ${result.reports.length} models ran successfully\n`);

  if (result.aggregateScores) {
    lines.push("## Aggregate Scores (Average)\n");
    lines.push("| Dimension | Score | Disagreement |");
    lines.push("|---|---|---|");
    const dims: (keyof Scorecard)[] = [
      "clarity", "pain", "differentiation",
      "buildability", "distribution", "monetization", "evidence",
    ];
    for (const dim of dims) {
      const score = result.aggregateScores[dim];
      const disagree = result.disagreement[dim] ?? 0;
      const warn = disagree >= 3 ? " ⚠️" : "";
      lines.push(`| ${dim} | ${score}/10 | ${disagree}${warn} |`);
    }
    lines.push("");
  }

  lines.push(`## Consensus Verdict\n\n**${result.consensusVerdict}**\n`);

  // Highlight high disagreement dimensions
  const highDisagree = Object.entries(result.disagreement)
    .filter(([, v]) => (v ?? 0) >= 3);
  if (highDisagree.length > 0) {
    lines.push("> ⚠️ **High disagreement** on: " +
      highDisagree.map(([k]) => k).join(", ") +
      " — investigate further.\n");
  }

  // Individual model summaries
  lines.push("## Per-Model Results\n");
  for (let i = 0; i < result.reports.length; i++) {
    const r = result.reports[i];
    lines.push(`### Model ${i + 1}: ${r.verdict}`);
    if (r.scores) {
      lines.push(`Scores: clarity=${r.scores.clarity}, pain=${r.scores.pain}, diff=${r.scores.differentiation}, build=${r.scores.buildability}, dist=${r.scores.distribution}, monet=${r.scores.monetization}, ev=${r.scores.evidence}`);
    }
    if (r.brutalTakeaway) lines.push(`> ${r.brutalTakeaway}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("*Ensemble analysis reduces single-model bias. High disagreement (>3 points) signals uncertainty.*\n");
  return lines.join("\n");
}
