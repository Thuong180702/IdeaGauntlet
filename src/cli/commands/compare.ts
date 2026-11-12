import { loadIdeaInput } from "../../utils/loadIdeaFile.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { resolveCliProvider } from "../context.js";
import { runCompareEngine } from "../../engines/compareEngine.js";
import { buildReport } from "../../core/report.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { saveReport } from "../../history/historyStore.js";

export async function compareCommand(ideas: string[], rawOptions: Record<string, unknown>): Promise<void> {
  const options = normalizeOptions(rawOptions);
  const provider = await resolveCliProvider(options);

  const parsed = ideas.map((i) => parseIdeaInput({ idea: loadIdeaInput(i), mode: "compare" }));
  const enableSearch = !options.noSearch;
  const report = await runCompareEngine(parsed, provider, { enableSearch });
  report.markdown = buildReport(report);

  if (options.save) {
    const savedPath = saveReport(report);
    console.error(`Report saved to history: ${savedPath}`);
  }

  if (report.partial && report.warnings) {
    console.error(`\n⚠ PARTIAL REPORT — ${report.warnings.length} warning(s):\n${report.warnings.map((w: string) => `  - ${w}`).join("\n")}\n`);
  }

  const isJson = !!options.json;
  const output = options.output as string | undefined;
  const format = options.format as string | undefined;

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
