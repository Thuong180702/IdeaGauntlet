/**
 * Assumption Ledger CLI command — falsifiability over judgement.
 * Usage: idea-gauntlet assumptions "Your idea" [--max 6]
 */
import { resolveCliProvider } from "../context.js";
import { runAssumptionLedger, formatAssumptionLedger } from "../../engines/assumptionLedger.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { loadIdeaInput } from "../../utils/loadIdeaFile.js";

export async function assumptionsCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  if (!ideaArg?.trim()) {
    console.error("Missing idea text. Usage: idea-gauntlet assumptions \"Your idea\" [--max 6]");
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
    console.error("Identifying what must be true, and how to prove it isn't...");

    const maxRaw = options.max as string | number | undefined;
    const maxAssumptions = maxRaw === undefined ? undefined : parseInt(String(maxRaw), 10);
    if (maxAssumptions !== undefined && !Number.isFinite(maxAssumptions)) {
      console.error(`Invalid --max value '${String(maxRaw)}'. Expected a number between 3 and 10.`);
      process.exit(1);
    }

    const result = await runAssumptionLedger(idea, provider, {
      maxAssumptions,
      enableSearch: !options.noSearch,
    });

    const output = options.json
      ? JSON.stringify(result, null, 2)
      : formatAssumptionLedger(result);

    const r = safeWriteOutput(options.output as string | undefined, output, "Assumption ledger");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
