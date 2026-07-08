import { loadIdeaInput } from "../../utils/loadIdeaFile.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { resolveProvider, formatNoProviderError } from "../../providers/providerUtils.js";
import { runCompareEngine } from "../../engines/compareEngine.js";
import { buildReport } from "../../core/report.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";

export async function compareCommand(ideas: string[], rawOptions: Record<string, unknown>): Promise<void> {
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

  const parsed = ideas.map((i) => parseIdeaInput({ idea: loadIdeaInput(i), mode: "compare" }));
  const enableSearch = !options.noSearch;
  const report = await runCompareEngine(parsed, providerRes.provider, { enableSearch });
  report.markdown = buildReport(report);

  const output = options.output as string | undefined;
  const format = options.format as string | undefined;

  if (format === "html") {
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
