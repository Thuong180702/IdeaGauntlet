/**
 * F-07: Trend command — re-research an idea and compare against history.
 * Usage: `idea-gauntlet trend <idea-id>`
 */

import { analyzeTrend, formatTrendResult, listTrendableIdeas } from "../../engines/trendMonitor.js";
import { performResearch } from "../../search/searchOrchestrator.js";
import { loadReport } from "../../history/historyStore.js";
import type { IdeaInput } from "../../core/types.js";

export async function trendCommand(
  ideaId: string | undefined,
  options: Record<string, unknown>,
): Promise<void> {
  if (!ideaId || ideaId === "list") {
    // List trendable ideas
    const ideas = listTrendableIdeas();
    if (ideas.length === 0) {
      console.log("No saved reports with research data. Run `idea-gauntlet quick <idea> --save` first.");
      return;
    }
    console.log("Ideas with research data for trend analysis:");
    for (const i of ideas) {
      console.log(`  ${i.id}  [${i.mode}]  ${i.idea.slice(0, 60)}...  (${i.createdAt})`);
    }
    return;
  }

  // Load old report to get the idea text
  const oldReport = loadReport(ideaId);
  if (!oldReport) {
    console.error(`Report not found: ${ideaId}`);
    process.exit(1);
  }

  if (!oldReport.webResearch) {
    console.error(`Report ${ideaId} has no research data. Run with --search and --save first.`);
    process.exit(1);
  }

  console.log("Re-running research for trend analysis...");
  const idea: IdeaInput = {
    idea: oldReport.input.idea,
    targetUsers: oldReport.input.targetUsers,
    market: oldReport.input.market,
    stage: oldReport.input.stage,
    mode: oldReport.mode,
  };

  try {
    const currentResearch = await performResearch(idea, oldReport.mode as any);
    const trend = analyzeTrend(ideaId, currentResearch);
    if (!trend) {
      console.error("Failed to analyze trend.");
      process.exit(1);
    }
    console.log(formatTrendResult(trend));
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
