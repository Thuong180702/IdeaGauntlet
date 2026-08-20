/**
 * Phase 3: Pitch Deck Generator CLI command
 * Usage: idea-gauntlet pitch "Your idea" [--template yc|sequoia|a16z] [--company "Acme"]
 */
import { resolveProvider, formatNoProviderError } from "../../providers/providerUtils.js";
import { runPitchGenerator, formatPitchDeckReport } from "../../engines/pitchGenerator.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { loadIdeaInput } from "../../utils/loadIdeaFile.js";

export async function pitchCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  if (!ideaArg?.trim()) {
    console.error("Missing idea text. Usage: idea-gauntlet pitch \"Your idea\" [--template yc|sequoia|a16z]");
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
    console.error("Drafting investor pitch deck...");
    const result = await runPitchGenerator(idea, providerRes.provider, {
      template: (options.template as "yc" | "sequoia" | "a16z") ?? "yc",
      companyName: options.company as string | undefined,
      enableSearch: !options.noSearch,
    });

    const output = options.json
      ? JSON.stringify(result, null, 2)
      : formatPitchDeckReport(result);

    const r = safeWriteOutput(options.output as string | undefined, output, "Pitch deck");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
