import { loadIdeaInput } from "../../utils/loadIdeaFile.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { resolveProvider, formatNoProviderError } from "../../providers/providerUtils.js";
import { runCourtEngine } from "../../engines/courtEngine.js";
import { buildReport } from "../../core/report.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";

export async function courtCommand(
  ideaArg: string,
  rawOptions: Record<string, unknown>,
): Promise<void> {
  const options = normalizeOptions(rawOptions);
  const ideaText = loadIdeaInput(ideaArg);
  const idea = parseIdeaInput({
    idea: ideaText,
    mode: "court",
    stage: options.stage as string,
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
    const report = await runCourtEngine(idea, providerRes.provider);
    report.markdown = buildReport(report);

    const isJson = !!options.json;
    const output = options.output as string | undefined;

    if (isJson) {
      const r = safeWriteOutput(output, JSON.stringify(report, null, 2), "Report");
      if (!r.ok) { console.error(r.message); process.exit(2); }
    } else {
      const r = safeWriteOutput(output, report.markdown, "Report");
      if (!r.ok) { console.error(r.message); process.exit(2); }
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(3);
  }
}
