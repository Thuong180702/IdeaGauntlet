import { globalSetup } from "../../setup/globalSetup.js";
import { projectSetup } from "../../setup/projectSetup.js";
import { installCommand } from "./install.js";
import { uninstallCommand } from "./uninstall.js";
import { statusCommand } from "./status.js";

export async function setupCommand(options: Record<string, unknown>): Promise<void> {
  const isGlobal = !!(options.global);
  const isRemove = !!(options.remove);
  const isStatus = !!(options.status);

  if (isGlobal) {
    if (isRemove) {
      return uninstallCommand(options);
    }
    if (isStatus) {
      return statusCommand(options);
    }
    // --global with no remove/status → install
    return installCommand(options);
  }

  // Project-local setup (existing behavior, refactored)
  return projectSetup(options);
}
