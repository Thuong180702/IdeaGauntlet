import type { LLMProvider, IdeaInput, GauntletReport, GauntletMode } from "../core/types.js";
import { buildReport } from "../core/report.js";
import { runImmuneEngine } from "./immuneEngine.js";
import { runCourtEngine } from "./courtEngine.js";
import { runUserLab } from "./syntheticUserLab.js";
import { runMvpPlanner } from "./mvpPlanner.js";
import { withConcurrency } from "../utils/concurrency.js";

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

  const runOne = async (idea: IdeaInput): Promise<{ idea: string; report?: GauntletReport; error?: string }> => {
    const ideaText = idea.idea?.trim();
    if (!ideaText) {
      return { idea: idea.idea ?? "", error: "Empty idea — skipped" };
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
      report.markdown = buildReport(report);
      return { idea: idea.idea, report };
    } catch (err: any) {
      return { idea: idea.idea, error: err.message };
    } finally {
      done++;
      if (options?.onProgress) {
        options.onProgress(done, total);
      }
    }
  };

  const tasks = ideas.map((idea) => () => runOne(idea));
  const finalResults = await withConcurrency(tasks, concurrency);

  return {
    results: finalResults,
    total,
    succeeded: finalResults.filter((r) => r.report).length,
    failed: finalResults.filter((r) => r.error).length,
  };
}
