/**
 * Phase 2: Revenue Model Explorer CLI command
 * Usage: idea-gauntlet revenue "Your idea"
 */
import { resolveCliProvider } from "../context.js";
import { runRevenueModelEngine, formatRevenueModelReport } from "../../engines/revenueModelEngine.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { founderFromOptions } from "../../core/founderContext.js";
import { loadIdeaInput } from "../../utils/loadIdeaFile.js";

export async function revenueCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  if (!ideaArg?.trim()) {
    console.error("Missing idea text. Usage: idea-gauntlet revenue \"Your idea\"");
    process.exit(1);
  }

  const options = normalizeOptions(rawOptions);
  const ideaText = loadIdeaInput(ideaArg);
  const idea = parseIdeaInput({
    idea: ideaText,
    founder: founderFromOptions(options),
    mode: "quick",
    stage: options.stage as string | undefined,
    market: options.market as string | undefined,
    targetUsers: options.targetUsers as string | undefined,
  });

  const provider = await resolveCliProvider(options);

  try {
    console.error("Exploring revenue models...");
    const result = await runRevenueModelEngine(idea, provider, {
      enableSearch: !options.noSearch,
    });

    const output = options.json
      ? JSON.stringify(result, null, 2)
      : formatRevenueModelReport(result);

    const r = safeWriteOutput(options.output as string | undefined, output, "Revenue model report");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
