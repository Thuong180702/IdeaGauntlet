/**
 * Phase 3: Idea Evolution Coach CLI command
 * Usage: idea-gauntlet evolve "Your idea" [--focus distribution|monetization|pain]
 */
import { resolveCliProvider } from "../context.js";
import { runEvolutionCoach, formatIdeaEvolutionReport } from "../../engines/evolutionCoach.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { loadIdeaInput } from "../../utils/loadIdeaFile.js";

export async function evolveCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  if (!ideaArg?.trim()) {
    console.error("Missing idea text. Usage: idea-gauntlet evolve \"Your idea\" [--focus distribution]");
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

  const provider = await resolveCliProvider(options);

  try {
    console.error("Diagnosing weaknesses & evolving idea variants...");
    const result = await runEvolutionCoach(idea, provider, {
      focusDimension: options.focus as any,
      enableSearch: !options.noSearch,
    });

    const output = options.json
      ? JSON.stringify(result, null, 2)
      : formatIdeaEvolutionReport(result);

    const r = safeWriteOutput(options.output as string | undefined, output, "Idea evolution report");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
