import { readManifest } from "../../setup/manifest.js";
import { getIdeaGauntletConfigHome, getManifestPath } from "../../setup/paths.js";
import { verifyEntry } from "../../setup/manifest.js";

export async function statusCommand(flags: Record<string, unknown>): Promise<void> {
  const configHome = getIdeaGauntletConfigHome(process.platform, process.env, flags);
  const manifestPath = getManifestPath(configHome);
  const manifest = readManifest(manifestPath);

  if (!manifest) {
    console.log("\nIdeaGauntlet status: not installed globally\n");
    console.log("Run `idea-gauntlet install` to install global integrations.");
    return;
  }

  console.log(`\nIdeaGauntlet global install status (v${manifest.version})\n`);
  console.log(`  Installed: ${manifest.installedAt}`);
  console.log(`  Package:   ${manifest.packageRoot}\n`);

  // Group by tool
  const groups = new Map<string, { entry: typeof manifest.entries[0]; status: string }[]>();
  for (const entry of manifest.entries) {
    const tool = entry.tool;
    if (!groups.has(tool)) groups.set(tool, []);
    const status = verifyEntry(entry);
    groups.get(tool)!.push({ entry, status });
  }

  for (const [tool, items] of groups) {
    console.log(`  ${tool.charAt(0).toUpperCase() + tool.slice(1)}:`);
    for (const item of items) {
      const icon = item.status === "present" ? "✓" : item.status === "modified" ? "⚠" : "✗";
      const label = item.status === "present" ? "installed" : item.status === "modified" ? "modified" : "missing";
      console.log(`    ${icon} ${item.entry.kind === "file" ? item.entry.path : `${item.entry.path} [MCP]`}  (${label})`);
    }
    console.log("");
  }
}
