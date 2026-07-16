import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { normalizeOptions } from "../../utils/parseInput.js";
import { resolveProvider, formatNoProviderError } from "../../providers/providerUtils.js";
import { runBatchEngine } from "../../engines/batchEngine.js";
import { buildReport } from "../../core/report.js";
import type { GauntletMode, IdeaInput } from "../../core/types.js";

/**
 * Batch command — read ideas from a file (one per line), run analysis on each.
 *
 * Usage:
 *   idea-gauntlet batch ideas.txt
 *   idea-gauntlet batch ideas.txt --mode court --output ./reports
 */
export async function batchCommand(
  file: string,
  rawOptions: Record<string, unknown>,
): Promise<void> {
  const options = normalizeOptions(rawOptions);

  // Read ideas file
  const filePath = resolve(file);
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(2);
  }

  const content = readFileSync(filePath, "utf-8");
  const ideaLines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (ideaLines.length === 0) {
    console.error("No ideas found in file. One idea per line, # for comments.");
    process.exit(2);
  }

  const mode = (options.mode as GauntletMode) ?? "quick";
  const enableSearch = !options.noSearch;
  const outputDir = options.output as string | undefined;

  // Resolve provider
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

  // Parse each line as an idea
  const ideas: IdeaInput[] = ideaLines.map((idea) => ({
    idea,
    mode,
  }));

  console.error(`\n🔄 Processing ${ideas.length} idea(s) in ${mode} mode...\n`);

  const result = await runBatchEngine(ideas, providerRes.provider, mode, {
    enableSearch,
    concurrency: 3,
    onProgress: (done, total) => {
      console.error(`  [${done}/${total}] done`);
    },
  });

  // Output results
  console.log("\n📊 Batch Summary\n");
  console.log(`  Total: ${result.total}  Succeeded: ${result.succeeded}  Failed: ${result.failed}\n`);

  // Print summary table
  console.log("  #  Verdict                    Idea");
  console.log("  " + "─".repeat(90));

  result.results.forEach((r, i) => {
    const verdict = r.report?.verdict?.padEnd(26) ?? "ERROR".padEnd(26);
    const ideaText = r.idea.length > 50 ? r.idea.slice(0, 47) + "..." : r.idea;
    console.log(`  ${(i + 1).toString().padStart(2)}  ${verdict}  ${ideaText}`);
    if (r.error) {
      console.log(`     ⚠ ${r.error}`);
    }
  });

  // Save individual reports if output dir specified
  const format = options.format as string | undefined;
  if (outputDir) {
    const absOut = resolve(outputDir);
    if (!existsSync(absOut)) {
      mkdirSync(absOut, { recursive: true });
    }

    const { generateHtmlReport } = format === "html" ? await import("../../visualization/htmlReport.js") : { generateHtmlReport: null };

    for (let i = 0; i < result.results.length; i++) {
      const r = result.results[i];
      if (!r.report) continue;
      r.report.markdown = buildReport(r.report);
      const idx = (i + 1).toString().padStart(3, "0");

      if (format === "html" && generateHtmlReport) {
        const filepath = join(absOut, `report-${idx}.html`);
        writeFileSync(filepath, generateHtmlReport(r.report), "utf-8");
      } else {
        const filepath = join(absOut, `report-${idx}.md`);
        writeFileSync(filepath, r.report.markdown, "utf-8");
      }
    }

    console.log(`\n  Reports saved to: ${absOut}`);
  }

  // Detailed output if JSON requested
  if (options.json) {
    const jsonOutput = JSON.stringify(
      result.results.map((r) => ({
        idea: r.idea,
        verdict: r.report?.verdict,
        scores: r.report?.scores,
        error: r.error,
      })),
      null,
      2,
    );
    console.log(jsonOutput);
  }
}
