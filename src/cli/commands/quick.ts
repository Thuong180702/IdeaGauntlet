import { loadIdeaInput } from "../../utils/loadIdeaFile.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { founderFromOptions } from "../../core/founderContext.js";
import { resolveCliProvider } from "../context.js";
import { printNextSteps } from "../welcome.js";
import { runImmuneEngine } from "../../engines/immuneEngine.js";
import { buildReport } from "../../core/report.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { saveReport } from "../../history/historyStore.js";

export async function quickCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  const options = normalizeOptions(rawOptions);
  const ideaText = loadIdeaInput(ideaArg);

  // F-12: Apply template defaults (only if not already provided via flags).
  let templateMarket = options.market as string | undefined;
  let templateTargetUsers = options.targetUsers as string | undefined;
  let templateStage = options.stage as string | undefined;
  if (options.template) {
    const { applyTemplate } = await import("../../core/templates.js");
    const tmpl = applyTemplate(ideaText, options.template as string);
    if (tmpl) {
      if (!templateMarket) templateMarket = tmpl.market;
      if (!templateTargetUsers) templateTargetUsers = tmpl.targetUsers?.join(", ");
      if (!templateStage) templateStage = tmpl.stage;
    }
  }

  const idea = parseIdeaInput({
    idea: ideaText,
    founder: founderFromOptions(options),
    mode: "quick",
    stage: templateStage,
    market: templateMarket,
    targetUsers: templateTargetUsers,
  });

  const provider = await resolveCliProvider(options);

  try {
    const enableSearch = !options.noSearch;
    // F-04: Streaming output — show LLM tokens in real-time.
    const onToken = options.stream ? (chunk: string) => process.stderr.write(chunk) : undefined;
    const report = await runImmuneEngine(idea, provider, { enableSearch, onToken });
    if (onToken) process.stderr.write("\n"); // newline after stream
    report.markdown = buildReport(report);

    // Save to history if --save flag
    if (options.save) {
      const savedPath = saveReport(report);
      console.error(`Report saved to history: ${savedPath}`);
    }

    if (report.partial && report.warnings) {
      console.error(`\n⚠ PARTIAL REPORT — ${report.warnings.length} warning(s):\n${report.warnings.map((w: string) => `  - ${w}`).join("\n")}\n`);
    }

    const isJson = !!options.json;
    const format = options.format as string | undefined;
    const output = options.output as string | undefined;

    if (isJson) {
      const r = safeWriteOutput(output, JSON.stringify(report, null, 2), "Report");
      if (!r.ok) { console.error(r.message); process.exit(2); }
    } else if (format === "card") {
      const { generateReportCard } = await import("../../visualization/reportCard.js");
      const card = generateReportCard(report);
      const cardOutput = output ? `${output.replace(/\.(md|html)$/i, "")}.card.html` : undefined;
      const r = safeWriteOutput(cardOutput, card, "Report card");
      if (!r.ok) { console.error(r.message); process.exit(2); }
    } else if (format === "html") {
      const { generateHtmlReport } = await import("../../visualization/htmlReport.js");
      const html = generateHtmlReport(report);
      const htmlOutput = output?.replace(/\.md$/, ".html") ?? undefined;
      const r = safeWriteOutput(htmlOutput, html, "Report");
      if (!r.ok) { console.error(r.message); process.exit(2); }
    } else if (format === "pdf") {
      // F-08: PDF export — print-optimized HTML, open in browser → Ctrl+P → Save as PDF.
      const { generatePrintableHtml } = await import("../../visualization/pdfExport.js");
      const html = generatePrintableHtml(report);
      const pdfOutput = output?.replace(/\.(md|html)$/i, ".print.html") ?? "report.print.html";
      const r = safeWriteOutput(pdfOutput, html, "Report (printable HTML for PDF)");
      if (!r.ok) { console.error(r.message); process.exit(2); }
      console.error(`Printable HTML saved to ${pdfOutput}. Open in browser → Ctrl+P → "Save as PDF".`);
    } else {
      const r = safeWriteOutput(output, report.markdown, "Report");
      if (!r.ok) { console.error(r.message); process.exit(2); }
    }
    printNextSteps("quick", ideaArg);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

