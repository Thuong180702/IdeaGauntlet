import type { Scorecard } from "../core/types.js";

/**
 * Score Benchmark — a SYNTHETIC calibration reference for score context.
 *
 * These ~50 entries are illustrative archetypes (loosely inspired by common
 * startup patterns), NOT real companies, and the scores/outcomes are
 * hand-authored estimates — not measured data. They exist only to give a
 * user's scores a rough distributional context ("above/below this reference
 * set"), never to predict success. Do not present percentiles as evidence.
 */

export interface BenchmarkEntry {
  id: string;
  idea: string;
  category: string;
  outcome: "success" | "moderate" | "failed" | "pivoted";
  scores: Scorecard;
  year: number;
}

export const BENCHMARK_DATASET: BenchmarkEntry[] = [
  // ─── Success stories ─────────────────────────────────
  { id: "b01", idea: "A simple booking system for haircut salons", category: "SaaS", outcome: "success", year: 2015, scores: { clarity: 8, pain: 8, differentiation: 6, buildability: 8, distribution: 7, monetization: 8, evidence: 5 } },
  { id: "b02", idea: "Group expense splitting for roommates", category: "Consumer", outcome: "success", year: 2014, scores: { clarity: 9, pain: 7, differentiation: 6, buildability: 8, distribution: 7, monetization: 5, evidence: 6 } },
  { id: "b03", idea: "Real-time delivery tracking for small restaurants", category: "B2B", outcome: "success", year: 2017, scores: { clarity: 8, pain: 8, differentiation: 5, buildability: 6, distribution: 8, monetization: 8, evidence: 4 } },
  { id: "b04", idea: "No-code landing page builder for non-technical founders", category: "SaaS", outcome: "success", year: 2016, scores: { clarity: 9, pain: 8, differentiation: 5, buildability: 7, distribution: 8, monetization: 8, evidence: 5 } },
  { id: "b05", idea: "Cloud-based accounting for freelancers", category: "SaaS", outcome: "success", year: 2014, scores: { clarity: 8, pain: 9, differentiation: 4, buildability: 7, distribution: 7, monetization: 9, evidence: 7 } },
  { id: "b06", idea: "On-demand dog walking marketplace", category: "Marketplace", outcome: "success", year: 2016, scores: { clarity: 8, pain: 7, differentiation: 4, buildability: 6, distribution: 8, monetization: 7, evidence: 5 } },
  { id: "b07", idea: "GitHub for designers — version control for design files", category: "SaaS", outcome: "success", year: 2015, scores: { clarity: 7, pain: 7, differentiation: 8, buildability: 6, distribution: 6, monetization: 8, evidence: 4 } },
  { id: "b08", idea: "Automated social media scheduling tool", category: "SaaS", outcome: "success", year: 2016, scores: { clarity: 9, pain: 7, differentiation: 4, buildability: 7, distribution: 8, monetization: 8, evidence: 6 } },
  { id: "b09", idea: "Interactive coding bootcamp platform", category: "EdTech", outcome: "success", year: 2017, scores: { clarity: 8, pain: 8, differentiation: 6, buildability: 6, distribution: 7, monetization: 9, evidence: 7 } },
  { id: "b10", idea: "Remote team standup bot for Slack", category: "SaaS", outcome: "success", year: 2017, scores: { clarity: 9, pain: 7, differentiation: 5, buildability: 8, distribution: 9, monetization: 6, evidence: 5 } },

  // ─── Moderate outcomes ───────────────────────────────
  { id: "b11", idea: "AI-powered resume review service", category: "Consumer", outcome: "moderate", year: 2018, scores: { clarity: 7, pain: 6, differentiation: 5, buildability: 6, distribution: 5, monetization: 6, evidence: 3 } },
  { id: "b12", idea: "Subscription box for healthy snacks", category: "Consumer", outcome: "moderate", year: 2016, scores: { clarity: 8, pain: 5, differentiation: 4, buildability: 7, distribution: 6, monetization: 5, evidence: 4 } },
  { id: "b13", idea: "Local food discovery app for tourists", category: "Consumer", outcome: "moderate", year: 2017, scores: { clarity: 7, pain: 5, differentiation: 5, buildability: 6, distribution: 4, monetization: 5, evidence: 3 } },
  { id: "b14", idea: "Freelance project management tool", category: "SaaS", outcome: "moderate", year: 2016, scores: { clarity: 7, pain: 6, differentiation: 4, buildability: 6, distribution: 6, monetization: 6, evidence: 4 } },
  { id: "b15", idea: "Virtual event networking platform", category: "SaaS", outcome: "moderate", year: 2020, scores: { clarity: 6, pain: 6, differentiation: 5, buildability: 5, distribution: 5, monetization: 6, evidence: 3 } },

  // ─── Failed startups ─────────────────────────────────
  { id: "b16", idea: "Augmented reality menu for restaurants", category: "B2B", outcome: "failed", year: 2018, scores: { clarity: 6, pain: 3, differentiation: 7, buildability: 4, distribution: 3, monetization: 3, evidence: 1 } },
  { id: "b17", idea: "Blockchain-based loyalty program for coffee shops", category: "B2B", outcome: "failed", year: 2019, scores: { clarity: 5, pain: 3, differentiation: 5, buildability: 4, distribution: 3, monetization: 4, evidence: 2 } },
  { id: "b18", idea: "Social network for pet owners", category: "Consumer", outcome: "failed", year: 2016, scores: { clarity: 7, pain: 4, differentiation: 3, buildability: 7, distribution: 3, monetization: 2, evidence: 2 } },
  { id: "b19", idea: "AI fashion stylist app", category: "Consumer", outcome: "failed", year: 2018, scores: { clarity: 6, pain: 4, differentiation: 4, buildability: 5, distribution: 3, monetization: 3, evidence: 2 } },
  { id: "b20", idea: "Hyper-local news aggregation", category: "Consumer", outcome: "failed", year: 2017, scores: { clarity: 6, pain: 4, differentiation: 3, buildability: 6, distribution: 4, monetization: 2, evidence: 2 } },
  { id: "b21", idea: "Meal prep delivery for gym-goers", category: "Consumer", outcome: "failed", year: 2018, scores: { clarity: 7, pain: 5, differentiation: 3, buildability: 4, distribution: 3, monetization: 4, evidence: 2 } },
  { id: "b22", idea: "Video-first dating app", category: "Consumer", outcome: "failed", year: 2019, scores: { clarity: 6, pain: 4, differentiation: 4, buildability: 5, distribution: 3, monetization: 3, evidence: 1 } },
  { id: "b23", idea: "Crowdsourced city parking finder", category: "Consumer", outcome: "failed", year: 2017, scores: { clarity: 7, pain: 6, differentiation: 4, buildability: 5, distribution: 3, monetization: 3, evidence: 2 } },

  // ─── Pivoted ─────────────────────────────────────────
  { id: "b24", idea: "Photo-sharing app with AR filters", category: "Consumer", outcome: "pivoted", year: 2018, scores: { clarity: 7, pain: 4, differentiation: 5, buildability: 5, distribution: 5, monetization: 4, evidence: 2 } },
  { id: "b25", idea: "Task management for creative teams", category: "SaaS", outcome: "pivoted", year: 2017, scores: { clarity: 7, pain: 6, differentiation: 4, buildability: 6, distribution: 6, monetization: 6, evidence: 4 } },
  { id: "b26", idea: "On-demand laundry pickup service", category: "Consumer", outcome: "pivoted", year: 2016, scores: { clarity: 8, pain: 6, differentiation: 3, buildability: 5, distribution: 5, monetization: 4, evidence: 3 } },
  { id: "b27", idea: "Voice-controlled smart home dashboard", category: "Consumer", outcome: "pivoted", year: 2019, scores: { clarity: 6, pain: 5, differentiation: 6, buildability: 4, distribution: 4, monetization: 4, evidence: 2 } },

  // ─── More success stories for balance ─────────────────
  { id: "b28", idea: "Code snippet manager for developers", category: "DevTools", outcome: "success", year: 2018, scores: { clarity: 8, pain: 6, differentiation: 6, buildability: 7, distribution: 7, monetization: 7, evidence: 4 } },
  { id: "b29", idea: "Customer feedback widget for SaaS", category: "SaaS", outcome: "success", year: 2017, scores: { clarity: 9, pain: 7, differentiation: 5, buildability: 8, distribution: 8, monetization: 7, evidence: 5 } },
  { id: "b30", idea: "API monitoring and alerting service", category: "DevTools", outcome: "success", year: 2018, scores: { clarity: 8, pain: 7, differentiation: 6, buildability: 6, distribution: 7, monetization: 8, evidence: 4 } },
  { id: "b31", idea: "Email marketing automation for small Etsy sellers", category: "SaaS", outcome: "success", year: 2019, scores: { clarity: 7, pain: 7, differentiation: 5, buildability: 7, distribution: 8, monetization: 8, evidence: 5 } },
  { id: "b32", idea: "Time tracking for freelance designers", category: "SaaS", outcome: "success", year: 2016, scores: { clarity: 8, pain: 7, differentiation: 4, buildability: 7, distribution: 7, monetization: 7, evidence: 5 } },
  { id: "b33", idea: "Plagiarism checker for universities", category: "EdTech", outcome: "success", year: 2017, scores: { clarity: 8, pain: 8, differentiation: 5, buildability: 6, distribution: 7, monetization: 8, evidence: 6 } },
  { id: "b34", idea: "Cloud storage for creative agencies", category: "SaaS", outcome: "success", year: 2015, scores: { clarity: 7, pain: 7, differentiation: 5, buildability: 6, distribution: 7, monetization: 8, evidence: 4 } },
  { id: "b35", idea: "Instagram scheduling tool for small businesses", category: "SaaS", outcome: "success", year: 2018, scores: { clarity: 9, pain: 7, differentiation: 4, buildability: 7, distribution: 8, monetization: 7, evidence: 5 } },

  // ─── More failures ───────────────────────────────────
  { id: "b36", idea: "Decentralized energy trading platform", category: "B2B", outcome: "failed", year: 2019, scores: { clarity: 5, pain: 4, differentiation: 7, buildability: 3, distribution: 3, monetization: 5, evidence: 1 } },
  { id: "b37", idea: "AI personality-matched roommate finder", category: "Consumer", outcome: "failed", year: 2018, scores: { clarity: 6, pain: 5, differentiation: 4, buildability: 6, distribution: 3, monetization: 3, evidence: 2 } },
  { id: "b38", idea: "Subscription-based VR meditation", category: "Consumer", outcome: "failed", year: 2019, scores: { clarity: 5, pain: 3, differentiation: 6, buildability: 4, distribution: 3, monetization: 4, evidence: 1 } },
  { id: "b39", idea: "Peer-to-peer car lending platform", category: "Marketplace", outcome: "failed", year: 2017, scores: { clarity: 7, pain: 5, differentiation: 4, buildability: 4, distribution: 3, monetization: 4, evidence: 2 } },
  { id: "b40", idea: "AI-generated workout plans via chatbot", category: "Consumer", outcome: "failed", year: 2018, scores: { clarity: 7, pain: 4, differentiation: 3, buildability: 6, distribution: 4, monetization: 3, evidence: 1 } },

  // ─── More pivots ─────────────────────────────────────
  { id: "b41", idea: "Job board for remote-only positions", category: "Marketplace", outcome: "pivoted", year: 2017, scores: { clarity: 8, pain: 6, differentiation: 4, buildability: 7, distribution: 7, monetization: 6, evidence: 3 } },
  { id: "b42", idea: "Live concert streaming for indie venues", category: "Media", outcome: "pivoted", year: 2018, scores: { clarity: 6, pain: 5, differentiation: 5, buildability: 4, distribution: 4, monetization: 4, evidence: 2 } },

  // ─── More moderate ────────────────────────────────────
  { id: "b43", idea: "Digital business card with QR code", category: "Consumer", outcome: "moderate", year: 2018, scores: { clarity: 8, pain: 4, differentiation: 3, buildability: 8, distribution: 6, monetization: 5, evidence: 3 } },
  { id: "b44", idea: "AI-powered content idea generator", category: "SaaS", outcome: "moderate", year: 2019, scores: { clarity: 7, pain: 5, differentiation: 4, buildability: 6, distribution: 6, monetization: 5, evidence: 2 } },
  { id: "b45", idea: "Community platform for niche hobbies", category: "Consumer", outcome: "moderate", year: 2017, scores: { clarity: 6, pain: 5, differentiation: 4, buildability: 6, distribution: 5, monetization: 4, evidence: 3 } },

  // ─── Edge cases ────────────────────────────────────────
  { id: "b46", idea: "Uber for tutors — on-demand tutoring", category: "Marketplace", outcome: "failed", year: 2018, scores: { clarity: 8, pain: 6, differentiation: 3, buildability: 5, distribution: 3, monetization: 4, evidence: 2 } },
  { id: "b47", idea: "Slack-integrated expense reporting", category: "SaaS", outcome: "success", year: 2019, scores: { clarity: 9, pain: 7, differentiation: 6, buildability: 7, distribution: 8, monetization: 7, evidence: 5 } },
  { id: "b48", idea: "NFT marketplace for digital art (2022 hype)", category: "Marketplace", outcome: "failed", year: 2022, scores: { clarity: 6, pain: 4, differentiation: 2, buildability: 5, distribution: 4, monetization: 5, evidence: 1 } },
  { id: "b49", idea: "AI stock market predictor for retail traders", category: "Consumer", outcome: "failed", year: 2018, scores: { clarity: 6, pain: 6, differentiation: 3, buildability: 5, distribution: 5, monetization: 4, evidence: 1 } },
  { id: "b50", idea: "Open-source alternative to paid CRM tools", category: "SaaS", outcome: "pivoted", year: 2018, scores: { clarity: 7, pain: 6, differentiation: 7, buildability: 5, distribution: 6, monetization: 4, evidence: 3 } },
];

// ─── Benchmark comparison logic ─────────────────────────

export interface PercentileResult {
  dimension: keyof Scorecard;
  score: number;
  percentile: number;
  interpretation: string;
}

export interface BenchmarkComparison {
  totalCompared: number;
  percentiles: PercentileResult[];
  overallPercentile: number;
  similarOutcomes: BenchmarkEntry[];
  summary: string;
}

/**
 * Compare user scores against the benchmark dataset.
 * Returns percentile for each dimension + overall.
 */
export function benchmarkScores(
  scores: Scorecard,
  unassessed?: (keyof Scorecard)[],
): BenchmarkComparison {
  const skip = new Set(unassessed ?? []);
  const dimensions: (keyof Scorecard)[] = ([
    "clarity",
    "pain",
    "differentiation",
    "buildability",
    "distribution",
    "monetization",
    "evidence",
  ] as (keyof Scorecard)[]).filter((d) => !skip.has(d));

  const percentiles: PercentileResult[] = dimensions.map((dim) => {
    const userScore = scores[dim] ?? 0;
    const benchmarkScores = BENCHMARK_DATASET.map((e) => e.scores[dim] ?? 0);
    const below = benchmarkScores.filter((s) => s < userScore).length;
    const percentile = Math.round((below / benchmarkScores.length) * 100);

    let interpretation = "";
    if (percentile >= 80) interpretation = "Top tier — better than most benchmark ideas";
    else if (percentile >= 60) interpretation = "Above average — promising signal";
    else if (percentile >= 40) interpretation = "Average — comparable to benchmark median";
    else if (percentile >= 20) interpretation = "Below average — needs improvement";
    else interpretation = "Bottom tier — critical weakness";

    return { dimension: dim, score: userScore, percentile, interpretation };
  });

  // Overall percentile — use median of all dimension percentiles
  const sortedPercentiles = percentiles.map((p) => p.percentile).sort((a, b) => a - b);
  const mid = Math.floor(sortedPercentiles.length / 2);
  const overallPercentile = sortedPercentiles.length % 2 === 0
    ? Math.round((sortedPercentiles[mid - 1] + sortedPercentiles[mid]) / 2)
    : sortedPercentiles[mid];

  // Find similar ideas — closest match by overall score profile
  const userTotal = dimensions.reduce((sum, d) => sum + (scores[d] ?? 0), 0);
  const similarOutcomes = BENCHMARK_DATASET
    .map((entry) => {
      const entryTotal = dimensions.reduce((sum, d) => sum + entry.scores[d], 0);
      const distance = Math.abs(userTotal - entryTotal);
      return { entry, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map((r) => r.entry);

  const summary = `This idea scores better than ${overallPercentile}% of ${BENCHMARK_DATASET.length} benchmark ideas. ${
    overallPercentile >= 60 ? "Strong overall profile." :
    overallPercentile >= 40 ? "Mixed signals — some dimensions need work." :
    "Below benchmark average — significant concerns."
  }`;

  return {
    totalCompared: BENCHMARK_DATASET.length,
    percentiles,
    overallPercentile,
    similarOutcomes,
    summary,
  };
}

/**
 * Format benchmark comparison as Markdown table.
 */
export function formatBenchmarkMarkdown(comparison: BenchmarkComparison): string {
  const lines: string[] = [];
  lines.push("### 📊 Score Benchmark Comparison\n");
  lines.push(`Compared against a **synthetic reference set of ${comparison.totalCompared} idea archetypes** (illustrative, not real companies).\n`);

  lines.push("| Dimension | Your Score | Percentile | Interpretation |");
  lines.push("|-----------|-----------|------------|----------------|");
  for (const p of comparison.percentiles) {
    lines.push(`| ${p.dimension} | ${p.score}/10 | Top ${100 - p.percentile}% | ${p.interpretation} |`);
  }
  lines.push(`| **Overall** | | **Top ${100 - comparison.overallPercentile}%** | ${comparison.summary} |`);

  lines.push("\n### Similar Ideas in Benchmark\n");
  for (const entry of comparison.similarOutcomes) {
    const outcomeEmoji = entry.outcome === "success" ? "✅" : entry.outcome === "failed" ? "❌" : entry.outcome === "pivoted" ? "🔄" : "➖";
    lines.push(`- ${outcomeEmoji} **${entry.idea}** (${entry.category}, ${entry.outcome}, ${entry.year})`);
  }

  lines.push("\n> ⚠️ Benchmark is based on a small dataset and should be used as a directional guide, not a prediction.");

  return lines.join("\n");
}
