/**
 * Phase 2: GTM Strategy CLI command
 * Usage: idea-gauntlet gtm "Your idea" [--budget "$5000"] [--timeline "3 months"]
 */
import { resolveCliProvider } from "../context.js";
import { runGTMEngine, formatGTMReport } from "../../engines/gtmEngine.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { founderFromOptions } from "../../core/founderContext.js";
import { loadIdeaInput } from "../../utils/loadIdeaFile.js";

export async function gtmCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  if (!ideaArg?.trim()) {
    console.error("Missing idea text. Usage: idea-gauntlet gtm \"Your idea\"");
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
    console.error("Generating GTM strategy...");
    const result = await runGTMEngine(idea, provider, {
      enableSearch: !options.noSearch,
      budget: options.budget as string | undefined,
      timeline: options.timeline as string | undefined,
    });

    const output = options.json
      ? JSON.stringify(result, null, 2)
      : formatGTMReport(result);

    const r = safeWriteOutput(options.output as string | undefined, output, "GTM report");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
