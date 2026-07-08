import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import type { GauntletReport, Scorecard } from "../core/types.js";

/**
 * Idea history store — saves reports to `.idea-gauntlet/history/`.
 * Enables evolution tracking: compare scores across iterations.
 */

const HISTORY_DIR = ".idea-gauntlet/history";

function getHistoryDir(workspaceDir?: string): string {
  return resolve(workspaceDir ?? process.cwd(), HISTORY_DIR);
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  mode: string;
  idea: string;
  verdict: string;
  scores?: Scorecard;
}

export interface ScoreDelta {
  idea: string;
  oldScores?: Scorecard;
  newScores?: Scorecard;
  deltas: Partial<Record<keyof Scorecard, number>>;
  overallTrend: "improved" | "declined" | "unchanged" | "unknown";
}

/**
 * Save a report to the history store.
 * Returns the path where the report was saved.
 */
export function saveReport(report: GauntletReport, workspaceDir?: string): string {
  const dir = getHistoryDir(workspaceDir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = join(dir, `${report.id}.json`);
  writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");
  return filePath;
}

/**
 * Load a report from the history store by ID.
 */
export function loadReport(id: string, workspaceDir?: string): GauntletReport | null {
  const filePath = join(getHistoryDir(workspaceDir), `${id}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as GauntletReport;
  } catch {
    return null;
  }
}

/**
 * List all saved reports as metadata entries.
 */
export function listReports(workspaceDir?: string): HistoryEntry[] {
  const dir = getHistoryDir(workspaceDir);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const entries: HistoryEntry[] = [];

  for (const file of files) {
    try {
      const report = JSON.parse(readFileSync(join(dir, file), "utf-8")) as GauntletReport;
      entries.push({
        id: report.id,
        createdAt: report.createdAt,
        mode: report.mode,
        idea: report.input?.idea?.slice(0, 80) ?? "",
        verdict: report.verdict,
        scores: report.scores,
      });
    } catch {
      // Skip corrupt files
    }
  }

  // Sort by date descending
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return entries;
}

/**
 * Compare scores between two reports.
 */
export function compareReports(
  oldId: string,
  newId: string,
  workspaceDir?: string,
): ScoreDelta {
  const oldReport = loadReport(oldId, workspaceDir);
  const newReport = loadReport(newId, workspaceDir);

  const oldScores = oldReport?.scores;
  const newScores = newReport?.scores;

  const deltas: Partial<Record<keyof Scorecard, number>> = {};
  let totalDelta = 0;

  if (oldScores && newScores) {
    const keys: (keyof Scorecard)[] = [
      "clarity",
      "pain",
      "differentiation",
      "buildability",
      "distribution",
      "monetization",
      "evidence",
    ];
    for (const key of keys) {
      const delta = (newScores[key] ?? 0) - (oldScores[key] ?? 0);
      deltas[key] = delta;
      totalDelta += delta;
    }
  }

  let overallTrend: ScoreDelta["overallTrend"] = "unknown";
  if (oldScores && newScores) {
    if (totalDelta > 0) overallTrend = "improved";
    else if (totalDelta < 0) overallTrend = "declined";
    else overallTrend = "unchanged";
  }

  return {
    idea: newReport?.input?.idea ?? "",
    oldScores,
    newScores,
    deltas,
    overallTrend,
  };
}
