import { getReport } from "./tools.js";
import { buildReport } from "../core/report.js";

/**
 * Build the resources list for the MCP resources/list handler.
 * Each stored report is exposed as two resources:
 *   - Full report (text/markdown)
 *   - Summary (text/plain)
 */
export function listResources(reportIds: string[]) {
  return {
    resources: [
      ...reportIds.map((id) => ({
        uri: `idea-gauntlet://report/${id}`,
        name: `Report ${id}`,
        mimeType: "text/markdown",
      })),
      ...reportIds.map((id) => ({
        uri: `idea-gauntlet://report/${id}/summary`,
        name: `Report ${id} Summary`,
        mimeType: "text/plain",
      })),
    ],
  };
}

/**
 * Read the resource contents for the MCP resources/read handler.
 */
export function readMcpResource(uri: string) {
  const match = uri.match(/^idea-gauntlet:\/\/report\/([a-zA-Z0-9-]+)(\/summary)?$/);
  if (!match) return null;

  const id = match[1];
  const isSummary = !!match[2];

  const report = getReport(id);
  if (!report) return null;

  if (!report.markdown) {
    report.markdown = buildReport(report);
  }

  if (isSummary) {
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: report.coreInsight ?? (report as any).oneLineVerdict ?? report.verdict ?? "No summary available.",
        },
      ],
    };
  } else {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: report.markdown,
        },
      ],
    };
  }
}
