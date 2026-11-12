/**
 * Phase 2: Founder-Market Fit CLI command
 * Usage: idea-gauntlet founder "Your idea" --background "10 years in enterprise cybersecurity, previously CTO at Series B startup"
 */
import { resolveCliProvider } from "../context.js";
import { runFounderMarketFitEngine, formatFounderMarketFitReport } from "../../engines/founderMarketFitEngine.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { loadIdeaInput } from "../../utils/loadIdeaFile.js";

export async function founderCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  if (!ideaArg?.trim()) {
    console.error("Missing idea text. Usage: idea-gauntlet founder \"Your idea\" --background \"...\"");
    process.exit(1);
  }

  const options = normalizeOptions(rawOptions);
  const background = (options.background as string) ?? (options.bg as string) ?? "";
  if (!background.trim()) {
    console.error("Missing founder background. Please provide --background \"<your experience, domain knowledge, skills, network>\".");
    process.exit(1);
  }

  const ideaText = loadIdeaInput(ideaArg);
  const idea = parseIdeaInput({
    idea: ideaText,
    mode: "quick",
    stage: options.stage as string | undefined,
    market: options.market as string | undefined,
    targetUsers: options.targetUsers as string | undefined,
  });

  const provider = await resolveCliProvider(options);

  try {
    console.error("Evaluating founder-market fit...");
    const result = await runFounderMarketFitEngine(idea, provider, background);

    const output = options.json
      ? JSON.stringify(result, null, 2)
      : formatFounderMarketFitReport(result);

    const r = safeWriteOutput(options.output as string | undefined, output, "Founder-market fit report");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
