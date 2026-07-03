import { loadIdeaInput } from "../../utils/loadIdeaFile.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { resolveProvider } from "../../providers/providerUtils.js";
import { runMvpPlanner } from "../../engines/mvpPlanner.js";
import { buildReport } from "../../core/report.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";

export async function mvpCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  const options = normalizeOptions(rawOptions);
  const providerRes = resolveProvider({
    apiKey: options.apiKey as string,
    baseUrl: options.baseUrl as string,
    model: options.model as string,
    ollama: !!options.ollama,
  });
  if (!providerRes) {
    console.error("No provider available. Set IDEAGAUNTLET_API_KEY, pass --api-key, or use --ollama.");
    process.exit(2);
  }

  const idea = parseIdeaInput({ idea: loadIdeaInput(ideaArg), mode: "mvp", stage: options.stage as string });
  const report = await runMvpPlanner(idea, providerRes.provider);
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
}
