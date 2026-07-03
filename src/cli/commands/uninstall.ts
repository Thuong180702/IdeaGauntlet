import { globalSetup } from "../../setup/globalSetup.js";

export async function uninstallCommand(flags: Record<string, unknown>): Promise<void> {
  console.log("\nIdeaGauntlet global agent uninstall\n");

  const result = await globalSetup({
    mode: "remove",
    force: !!(flags.force ?? flags.f),
    flags,
  });

  console.log(
    `\nSummary: ${result.removed} removed, ${result.skipped} skipped`
  );

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    for (const err of result.errors) console.log(`  ! ${err}`);
    process.exitCode = 1;
  }
}
