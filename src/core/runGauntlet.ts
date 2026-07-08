import type { LLMProvider, IdeaInput, GauntletReport, GauntletMode } from "./types.js";
import { runImmuneEngine } from "../engines/immuneEngine.js";
import { runCourtEngine } from "../engines/courtEngine.js";
import { runUserLab } from "../engines/syntheticUserLab.js";
import { runMvpPlanner } from "../engines/mvpPlanner.js";
import { runCompareEngine } from "../engines/compareEngine.js";
import { buildReport } from "./report.js";

export async function runGauntlet(params: {
  idea: string;
  targetUsers?: string[];
  market?: string;
  stage?: string;
  constraints?: Record<string, unknown>;
  mode?: GauntletMode;
  provider?: LLMProvider;
  /** Multiple ideas for compare mode (Bug A fix). */
  compareIdeas?: string[];
}): Promise<GauntletReport> {
  if (!params.provider) {
    throw new Error("LLM provider is required. Pass an OpenAICompatibleProvider, OllamaProvider, or a custom LLMProvider.");
  }

  const input: IdeaInput = {
    idea: params.idea,
    targetUsers: params.targetUsers,
    market: params.market,
    stage: params.stage as any,
    constraints: params.constraints,
    mode: params.mode ?? "quick",
  };

  const mode = params.mode ?? "quick";
  let report: GauntletReport;

  switch (mode) {
    case "quick":
      report = await runImmuneEngine(input, params.provider);
      break;
    case "court":
      report = await runCourtEngine(input, params.provider);
      break;
    case "users":
      report = await runUserLab(input, params.provider);
      break;
    case "mvp":
      report = await runMvpPlanner(input, params.provider);
      break;
    case "compare": {
      // Bug A fix: accept multiple ideas via compareIdeas param
      if (params.compareIdeas && params.compareIdeas.length > 0) {
        const ideas: IdeaInput[] = params.compareIdeas.map((i) => ({
          idea: i,
          mode: "compare" as GauntletMode,
        }));
        report = await runCompareEngine(ideas, params.provider);
      } else {
        // Fallback: single idea comparison
        report = await runCompareEngine([input], params.provider);
      }
      break;
    }
    default:
      report = await runImmuneEngine(input, params.provider);
      break;
  }

  // Bug P fix: single buildReport call here — engines no longer call it internally
  report.markdown = buildReport(report);
  return report;
}
