import { globalSetup } from "../../setup/globalSetup.js";

export async function installCommand(flags: Record<string, unknown>): Promise<void> {
  console.log("\nIdeaGauntlet global agent install\n");

  const result = await globalSetup({
    mode: "install",
    force: !!(flags.force ?? flags.f),
    flags,
  });

  // Print per-tool status (detail printed inside globalSetup)
  console.log(
    `\nSummary: ` +
    `${result.created} installed, ${result.updated} updated, ${result.alreadyInstalled} already installed, ` +
    `${result.conflicts} conflicts, ${result.skipped} skipped`
  );

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    for (const err of result.errors) console.log(`  ! ${err}`);
    process.exitCode = 1;
  }
}
