/**
 * Phase 3: Regulatory & Compliance Scanner CLI command
 * Usage: idea-gauntlet compliance "Your idea" [--regions us,eu]
 */
import { resolveProvider, formatNoProviderError } from "../../providers/providerUtils.js";
import { runComplianceScanner, formatComplianceReport } from "../../engines/complianceScanner.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { loadIdeaInput } from "../../utils/loadIdeaFile.js";

export async function complianceCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  if (!ideaArg?.trim()) {
    console.error("Missing idea text. Usage: idea-gauntlet compliance \"Your idea\" [--regions us,eu]");
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
    console.error("Scanning regulatory and privacy obligations...");
    const regionsRaw = options.regions as string | undefined;
    const regions = regionsRaw ? regionsRaw.split(",").map((r) => r.trim()).filter(Boolean) : undefined;

    const result = await runComplianceScanner(idea, providerRes.provider, {
      regions,
      enableSearch: !options.noSearch,
    });

    const output = options.json
      ? JSON.stringify(result, null, 2)
      : formatComplianceReport(result);

    const r = safeWriteOutput(options.output as string | undefined, output, "Compliance report");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
