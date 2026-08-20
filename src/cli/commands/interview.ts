/**
 * Phase 3: AI-Simulated User Interview CLI command
 * Usage: idea-gauntlet interview "Your idea" [--persona "Freelance Designer"]
 */
import { resolveProvider, formatNoProviderError } from "../../providers/providerUtils.js";
import { runUserInterviewEngine, formatUserInterviewReport } from "../../engines/userInterviewEngine.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { loadIdeaInput } from "../../utils/loadIdeaFile.js";

export async function interviewCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  if (!ideaArg?.trim()) {
    console.error("Missing idea text. Usage: idea-gauntlet interview \"Your idea\" [--persona \"...\"]");
    process.exit(1);
  }

  const options = normalizeOptions(rawOptions);
  const ideaText = loadIdeaInput(ideaArg);
  const idea = parseIdeaInput({
    idea: ideaText,
    mode: "users",
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
    console.error("Simulating customer discovery interview...");
    const result = await runUserInterviewEngine(idea, providerRes.provider, {
      personaArchetype: options.persona as string | undefined,
    });

    const output = options.json
      ? JSON.stringify(result, null, 2)
      : formatUserInterviewReport(result);

    const r = safeWriteOutput(options.output as string | undefined, output, "User interview report");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
