/**
 * Phase 2: Competitive Intelligence Deep Dive CLI command
 * Usage: idea-gauntlet compete "Your idea" [--depth deep]
 */
import { resolveProvider, formatNoProviderError } from "../../providers/providerUtils.js";
import { runCompetitiveIntelligenceEngine, formatCompetitiveIntelligenceReport } from "../../engines/competitiveIntelligenceEngine.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { loadIdeaInput } from "../../utils/loadIdeaFile.js";

export async function competeCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  if (!ideaArg?.trim()) {
    console.error("Missing idea text. Usage: idea-gauntlet compete \"Your idea\"");
    process.exit(1);
  }

  const options = normalizeOptions(rawOptions);
  const ideaText = loadIdeaInput(ideaArg);
  const idea = parseIdeaInput({
    idea: ideaText,
    mode: "quick",
    stage: options.stage as string | undefined,
    market: options.market as string | undefined,
    targetUsers: options.targetUsers as string | undefined,
  });

  const providerRes = resolveProvider({
    apiKey: options.apiKey as string,
    baseUrl: options.baseUrl as string,
    model: options.model as string,
    ollama: !!options.ollama,
  });

  if (!providerRes) {
    console.error(formatNoProviderError());
    process.exit(2);
  }

  try {
    console.error("Mapping competitor landscape...");
    const result = await runCompetitiveIntelligenceEngine(idea, providerRes.provider, {
      enableSearch: !options.noSearch,
      depth: (options.depth as "quick" | "deep") ?? "quick",
    });

    const output = options.json
      ? JSON.stringify(result, null, 2)
      : formatCompetitiveIntelligenceReport(result);

    const r = safeWriteOutput(options.output as string | undefined, output, "Competitive intelligence report");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
