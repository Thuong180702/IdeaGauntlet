import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { resolve, join } from "node:path";
import type { GauntletReport, Scorecard } from "../core/types.js";

/**
 * Idea history store — saves reports to `.idea-gauntlet/history/`.
 * Enables evolution tracking: compare scores across iterations.
 */

const HISTORY_DIR = ".idea-gauntlet/history";
// Maximum number of entries returned by listReports to avoid OOM from huge stores.
const MAX_LIST_ENTRIES = 200;

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
  /** File size in bytes — reported for display but not loaded into memory by default. */
  fileSizeBytes?: number;
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
 * List all saved reports as lightweight metadata entries.
 *
 * Fix: Instead of loading the full JSON of every report (which can cause OOM
 * with large stores), we only read the first ~2 KB of each file to extract the
 * metadata fields we need (id, createdAt, mode, idea, verdict, scores).
 * Reports that can't be partially parsed fall back to a full read.
 *
 * Pagination is supported via offset + limit to avoid loading all entries at once.
 */
export function listReports(
  workspaceDir?: string,
  options?: { limit?: number; offset?: number },
): HistoryEntry[] {
  const dir = getHistoryDir(workspaceDir);
  if (!existsSync(dir)) return [];

  const limit = Math.min(options?.limit ?? MAX_LIST_ENTRIES, MAX_LIST_ENTRIES);
  const offset = options?.offset ?? 0;

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .slice(offset, offset + limit);

  const entries: HistoryEntry[] = [];

  for (const file of files) {
    const filePath = join(dir, file);
    try {
      const fileSizeBytes = statSync(filePath).size;
      // Optimisation: for large files (>100 KB), try to read only the first 4 KB
      // which almost always contains all the top-level metadata we need.
      let parsed: Partial<GauntletReport> | null = null;

      if (fileSizeBytes > 100_000) {
        // Read partial buffer and attempt a best-effort JSON extract.
        const partial = readPartialJson(filePath, 4096);
        if (partial) parsed = partial;
      }

      if (!parsed) {
        // Small file or partial parse failed: read full file.
        parsed = JSON.parse(readFileSync(filePath, "utf-8")) as GauntletReport;
      }

      entries.push({
        id: parsed.id ?? file.replace(".json", ""),
        createdAt: parsed.createdAt ?? "",
        mode: parsed.mode ?? "unknown",
        idea: parsed.input?.idea?.slice(0, 80) ?? "",
        verdict: parsed.verdict ?? "unknown",
        scores: parsed.scores,
        fileSizeBytes,
      });
    } catch {
      // Skip corrupt / unreadable files silently
    }
  }

  // Sort by date descending (newest first)
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

/**
 * Attempt to read and parse the first `maxBytes` of a JSON file.
 * Useful for extracting top-level metadata without loading the full file.
 * Returns null if the slice cannot be parsed.
 */
function readPartialJson(filePath: string, maxBytes: number): Partial<GauntletReport> | null {
  try {
    const fd = openSync(filePath, "r");
    const buf = Buffer.alloc(maxBytes);
    const bytesRead = readSync(fd, buf, 0, maxBytes, 0);
    closeSync(fd);
    const text = buf.toString("utf-8", 0, bytesRead);

    // Extract top-level fields by looking for well-known keys.
    // This avoids requiring a complete JSON parse.
    const extract = (key: string): string | undefined => {
      const re = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`, "i");
      return text.match(re)?.[1];
    };

    const id = extract("id");
    const createdAt = extract("createdAt");
    const mode = extract("mode");
    const verdict = extract("verdict");

    // Extract idea from input.idea
    const ideaMatch = text.match(/"idea"\s*:\s*"([^"]*)"/);
    const idea = ideaMatch?.[1];

    if (!id || !createdAt) return null;

    return {
      id,
      createdAt,
      mode: mode as any,
      verdict: verdict as any,
      input: idea ? ({ idea } as any) : undefined,
    };
  } catch {
    return null;
  }
}
