import type { LLMProvider, IdeaInput, GauntletReport, GauntletMode } from "../core/types.js";
import { buildReport } from "../core/report.js";
import { runImmuneEngine } from "./immuneEngine.js";
import { runCourtEngine } from "./courtEngine.js";
import { runUserLab } from "./syntheticUserLab.js";
import { runMvpPlanner } from "./mvpPlanner.js";

/**
 * Batch engine — processes multiple ideas concurrently.
 * Uses a concurrency limiter to avoid overwhelming the LLM provider.
 */

export interface BatchResult {
  results: Array<{
    idea: string;
    report?: GauntletReport;
    error?: string;
  }>;
  total: number;
  succeeded: number;
  failed: number;
}

export async function runBatchEngine(
  ideas: IdeaInput[],
  provider: LLMProvider,
  mode: GauntletMode = "quick",
  options?: {
    enableSearch?: boolean;
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<BatchResult> {
  if (!ideas || ideas.length === 0) {
    return { results: [], total: 0, succeeded: 0, failed: 0 };
  }

  const concurrency = options?.concurrency ?? 3;
  const enableSearch = options?.enableSearch ?? true;
  const total = ideas.length;
  let done = 0;

  // Run each idea's engine and build its markdown report.
  // BUG-02: Track original index for stable sort instead of findIndex.
  const runOne = async (idea: IdeaInput, originalIndex: number): Promise<{ idea: string; report?: GauntletReport; error?: string; originalIndex: number }> => {
    const ideaText = idea.idea?.trim();
    if (!ideaText) {
      return { idea: idea.idea ?? "", error: "Empty idea — skipped", originalIndex };
    }

    try {
      let report: GauntletReport;
      switch (mode) {
        case "quick":
          report = await runImmuneEngine(idea, provider, { enableSearch });
          break;
        case "court":
          report = await runCourtEngine(idea, provider, { enableSearch });
          break;
        case "users":
          report = await runUserLab(idea, provider, 6, { enableSearch });
          break;
        case "mvp":
          report = await runMvpPlanner(idea, provider, { enableSearch });
          break;
        default:
          report = await runImmuneEngine(idea, provider, { enableSearch });
          break;
      }
      // Fix: build the markdown so callers always get a populated report.markdown.
      report.markdown = buildReport(report);
      return { idea: idea.idea, report, originalIndex };
    } catch (err: any) {
      return { idea: idea.idea, error: err.message, originalIndex };
    } finally {
      done++;
      if (options?.onProgress) {
        options.onProgress(done, total);
      }
    }
  };

  // Concurrency limiter
  const results: Array<{ idea: string; report?: GauntletReport; error?: string; originalIndex: number }> = [];
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < ideas.length) {
      const currentIndex = index++;
      const result = await runOne(ideas[currentIndex], currentIndex);
      results.push(result);
    }
  }

  // Launch concurrency workers
  const workers = Array.from({ length: Math.min(concurrency, ideas.length) }, () => runNext());
  await Promise.all(workers);

  // Preserve original order using tracked index (stable, O(n log n) not O(n²))
  results.sort((a, b) => a.originalIndex - b.originalIndex);

  // Strip originalIndex from results
  const finalResults = results.map(({ idea, report, error }) => ({ idea, report, error }));

  return {
    results: finalResults,
    total,
    succeeded: finalResults.filter((r) => r.report).length,
    failed: finalResults.filter((r) => r.error).length,
  };
}
