import { loadIdeaInput } from "../../utils/loadIdeaFile.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { founderFromOptions } from "../../core/founderContext.js";
import { resolveCliProvider } from "../context.js";
import { printNextSteps } from "../welcome.js";
import { runCourtEngine } from "../../engines/courtEngine.js";
import { buildReport } from "../../core/report.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { saveReport } from "../../history/historyStore.js";

export async function courtCommand(
  ideaArg: string,
  rawOptions: Record<string, unknown>,
): Promise<void> {
  const options = normalizeOptions(rawOptions);
  const ideaText = loadIdeaInput(ideaArg);
  const idea = parseIdeaInput({
    idea: ideaText,
    founder: founderFromOptions(options),
    mode: "court",
    stage: options.stage as string,
  });

  const provider = await resolveCliProvider(options);

  // Load custom roles from file if provided
  let customRoles: import("../../engines/courtPhases.js").RoleDefinition[] | undefined;
  if (options.roles) {
    try {
      const { loadCustomRoles } = await import("../../workflows/roleLoader.js");
      customRoles = loadCustomRoles(options.roles as string);
    } catch (err: any) {
      console.error(`Error loading custom roles: ${err.message}`);
      process.exit(2);
    }
  }

  try {
    const enableSearch = !options.noSearch;
    const report = await runCourtEngine(idea, provider, { enableSearch, customRoles });
    report.markdown = buildReport(report);

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
    } else {
      const r = safeWriteOutput(output, report.markdown, "Report");
      if (!r.ok) { console.error(r.message); process.exit(2); }
    }
    printNextSteps("court", ideaArg);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
