import { listReports, loadReport, compareReports } from "../../history/historyStore.js";
import { buildReport } from "../../core/report.js";

/**
 * History command — view saved idea reports and track evolution.
 *
 * Usage:
 *   idea-gauntlet history          List all saved reports
 *   idea-gauntlet history <id>     Show a specific report
 *   idea-gauntlet history --evolve <id>  Compare current idea vs saved report
 */
export async function historyCommand(
  id: string | undefined,
  options: Record<string, unknown>,
): Promise<void> {
  const evolveId = options.evolve as string | undefined;
  const diffMode = !!options.diff;

  // --evolve mode: compare two reports
  if (evolveId && id) {
    const delta = compareReports(evolveId, id);
    printScoreDelta(delta);
    return;
  }

  // F-06: --diff mode — auto-find oldest report with same idea text.
  if (diffMode && id) {
    const currentReport = loadReport(id);
    if (!currentReport) {
      console.error(`Report not found: ${id}`);
      process.exit(2);
    }
    const allReports = listReports();
    const sameIdea = allReports
      .filter((e) => e.idea === currentReport.input?.idea?.slice(0, 80) && e.id !== id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (sameIdea.length === 0) {
      console.log("No previous reports found for this idea. Run the same idea again with --save to track evolution.");
      return;
    }
    const oldest = sameIdea[0];
    console.log(`Found oldest report: ${oldest.id} (${oldest.createdAt})\n`);
    const delta = compareReports(oldest.id, id);
    printScoreDelta(delta);
    if (oldest.verdict !== currentReport.verdict) {
      console.log(`\n  Verdict: ${oldest.verdict} → ${currentReport.verdict}`);
    }
    return;
  }

  // Show specific report
  if (id) {
    const report = loadReport(id);
    if (!report) {
      console.error(`Report not found: ${id}`);
      process.exit(2);
    }
    if (!report.markdown) {
      report.markdown = buildReport(report);
    }
    console.log(report.markdown);
    return;
  }

  // List all reports
  const entries = listReports();
  if (entries.length === 0) {
    console.log("No saved reports found.");
    console.log('Use --save with any command to save a report: idea-gauntlet quick "my idea" --save');
    return;
  }

  console.log("\n📌 IdeaGauntlet — Report History\n");
  console.log(
    "  Date                  Mode      Verdict                    Idea",
  );
  console.log(
    "  " + "─".repeat(100),
  );

  for (const entry of entries) {
    const date = entry.createdAt.slice(0, 19).replace("T", " ");
    const mode = entry.mode.padEnd(9);
    const verdict = entry.verdict.padEnd(26);
    const idea = entry.idea.length > 40 ? entry.idea.slice(0, 37) + "..." : entry.idea;
    console.log(`  ${date}  ${mode}  ${verdict}  ${idea}`);
  }

  console.log(`\n  ${entries.length} report(s) saved.`);
  console.log("  Run `idea-gauntlet history <id>` to view a report.");
  console.log("  Run `idea-gauntlet history <new-id> --evolve <old-id>` to compare scores.");
}

function printScoreDelta(delta: ReturnType<typeof compareReports>): void {
  console.log("\n📊 Score Evolution — Idea Evolution Comparison\n");
  console.log(`  Idea: ${delta.idea.slice(0, 80)}\n`);

  if (!delta.oldScores || !delta.newScores) {
    console.log("  Unable to compare — one or both reports missing scores.");
    return;
  }

  const keys: (keyof typeof delta.oldScores)[] = [
    "clarity",
    "pain",
    "differentiation",
    "buildability",
    "distribution",
    "monetization",
    "evidence",
  ];

  console.log("  Dimension       Old  New  Delta");
  console.log("  " + "─".repeat(40));

  for (const key of keys) {
    const oldVal = delta.oldScores[key] ?? 0;
    const newVal = delta.newScores[key] ?? 0;
    const d = delta.deltas[key] ?? 0;
    const sign = d > 0 ? "+" : "";
    const arrow = d > 0 ? "↑" : d < 0 ? "↓" : "→";
    console.log(`  ${key.padEnd(16)} ${oldVal}    ${newVal}    ${sign}${d} ${arrow}`);
  }

  const trendIcon =
    delta.overallTrend === "improved" ? "📈"
    : delta.overallTrend === "declined" ? "📉"
    : delta.overallTrend === "unchanged" ? "➡️"
    : "❓";

  console.log(`\n  Overall: ${trendIcon} ${delta.overallTrend}`);
}
