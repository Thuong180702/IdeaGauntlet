import type { LLMProvider, IdeaInput, GauntletReport, GauntletMode, IdeaStage, FounderContext } from "./types.js";
import { normalizeFounderContext } from "./founderContext.js";
import { IdeaStageSchema } from "./types.js";
import { runImmuneEngine } from "../engines/immuneEngine.js";
import { runCourtEngine } from "../engines/courtEngine.js";
import { runUserLab } from "../engines/syntheticUserLab.js";
import { runMvpPlanner } from "../engines/mvpPlanner.js";
import { runCompareEngine } from "../engines/compareEngine.js";
import { buildReport } from "./report.js";
import { detectInjectionAttempts } from "../utils/promptGuard.js";
import { warn } from "../utils/warn.js";

export async function runGauntlet(params: {
  idea: string;
  targetUsers?: string[];
  market?: string;
  stage?: string;
  constraints?: Record<string, unknown>;
  /** What the founder has to work with (budget, time, skills, assets). Shapes feasibility, never evidence. */
  founder?: FounderContext;
  mode?: GauntletMode;
  provider?: LLMProvider;
  /** Multiple ideas for compare mode (Bug A fix). */
  compareIdeas?: string[];
  /** Enable web search before LLM analysis. Default: true. */
  enableSearch?: boolean;
  /** Custom roles for court mode. */
  customRoles?: import("../engines/courtPhases.js").RoleDefinition[];
  /** Founder defense arguments. */
  defenseArguments?: string[];
}): Promise<GauntletReport> {
  if (!params.provider) {
    throw new Error("LLM provider is required. Pass an OpenAICompatibleProvider, OllamaProvider, or a custom LLMProvider.");
  }

  let stage: IdeaStage | undefined;
  if (params.stage) {
    const stageResult = IdeaStageSchema.safeParse(params.stage);
    if (!stageResult.success) {
      throw new Error(`Invalid stage "${params.stage}". Expected one of: "napkin", "pre-mvp", "mvp", "growth".`);
    }
    stage = stageResult.data;
  }

  // SEC-02: the idea is always wrapped as data before it reaches a model, so a
  // match is not blocked — it is surfaced, because a user pasting an idea that
  // contains directive language deserves to know the model was told to ignore it.
  const injectionHits = detectInjectionAttempts(params.idea);
  if (injectionHits.length > 0) {
    warn(
      `promptGuard: idea text contains ${injectionHits.length} instruction-like pattern(s); ` +
        "they are passed as data and will be ignored by the analysis.",
    );
  }

  const input: IdeaInput = {
    idea: params.idea,
    targetUsers: params.targetUsers,
    market: params.market,
    stage,
    constraints: params.constraints,
    founder: normalizeFounderContext(params.founder),
    mode: params.mode ?? "quick",
  };

  const mode = params.mode ?? "quick";
  const enableSearch = params.enableSearch !== false;
  const engineOptions = { enableSearch };
  let report: GauntletReport;

  switch (mode) {
    case "quick":
      report = await runImmuneEngine(input, params.provider, engineOptions);
      break;
    case "court":
      report = await runCourtEngine(input, params.provider, {
        enableSearch,
        customRoles: params.customRoles,
        defenseArguments: params.defenseArguments,
      });
      break;
    case "users":
      report = await runUserLab(input, params.provider, 6, engineOptions);
      break;
    case "mvp":
      report = await runMvpPlanner(input, params.provider, engineOptions);
      break;
    case "compare": {
      // Bug A fix: accept multiple ideas via compareIdeas param
      if (params.compareIdeas && params.compareIdeas.length > 0) {
        const ideas: IdeaInput[] = params.compareIdeas.map((i) => ({
          idea: i,
          mode: "compare" as GauntletMode,
        }));
        report = await runCompareEngine(ideas, params.provider, engineOptions);
      } else {
        // Fallback: single idea comparison
        report = await runCompareEngine([input], params.provider, engineOptions);
      }
      break;
    }
    default:
      report = await runImmuneEngine(input, params.provider, engineOptions);
      break;
  }

  // Bug P fix: single buildReport call here — engines no longer call it internally
  report.markdown = buildReport(report);
  return report;
}
