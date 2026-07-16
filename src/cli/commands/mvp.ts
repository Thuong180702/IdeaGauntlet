import { loadIdeaInput } from "../../utils/loadIdeaFile.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { resolveProvider, formatNoProviderError } from "../../providers/providerUtils.js";
import { runMvpPlanner } from "../../engines/mvpPlanner.js";
import { buildReport } from "../../core/report.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { saveReport } from "../../history/historyStore.js";

export async function mvpCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  const options = normalizeOptions(rawOptions);
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

  const idea = parseIdeaInput({ idea: loadIdeaInput(ideaArg), mode: "mvp", stage: options.stage as string });
  const enableSearch = !options.noSearch;
  const report = await runMvpPlanner(idea, providerRes.provider, { enableSearch });
  report.markdown = buildReport(report);

  if (options.save) {
    const savedPath = saveReport(report);
    console.error(`Report saved to history: ${savedPath}`);
  }

  const isJson = !!options.json;
  const format = options.format as string | undefined;
  const output = options.output as string | undefined;

  if (isJson) {
    const r = safeWriteOutput(output, JSON.stringify(report, null, 2), "Report");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  } else if (format === "html") {
    const { generateHtmlReport } = await import("../../visualization/htmlReport.js");
    const html = generateHtmlReport(report);
    const htmlOutput = output?.replace(/\.md$/, ".html") ?? undefined;
    const r = safeWriteOutput(htmlOutput, html, "Report");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  } else {
    const r = safeWriteOutput(output, report.markdown, "Report");
    if (!r.ok) { console.error(r.message); process.exit(2); }
  }
}
