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
