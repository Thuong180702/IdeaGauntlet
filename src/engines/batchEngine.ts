import type { LLMProvider, IdeaInput, GauntletReport, GauntletMode } from "../core/types.js";
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
  const concurrency = options?.concurrency ?? 3;
  const enableSearch = options?.enableSearch ?? true;
  const total = ideas.length;
  let done = 0;

  // Run each idea's engine
  const runOne = async (idea: IdeaInput): Promise<{ idea: string; report?: GauntletReport; error?: string }> => {
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

  // Concurrency limiter
  const results: Array<{ idea: string; report?: GauntletReport; error?: string }> = [];
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < ideas.length) {
      const currentIndex = index++;
      const result = await runOne(ideas[currentIndex]);
      results.push(result);
    }
  }

  // Launch concurrency workers
  const workers = Array.from({ length: Math.min(concurrency, ideas.length) }, () => runNext());
  await Promise.all(workers);

  // Preserve original order
  results.sort((a, b) =>
    ideas.findIndex((i) => i.idea === a.idea) - ideas.findIndex((i) => i.idea === b.idea),
  );

  return {
    results,
    total,
    succeeded: results.filter((r) => r.report).length,
    failed: results.filter((r) => r.error).length,
  };
}
