import { loadIdeaInput } from "../../utils/loadIdeaFile.js";
import { parseIdeaInput, normalizeOptions } from "../../utils/parseInput.js";
import { resolveProvider, formatNoProviderError } from "../../providers/providerUtils.js";
import { runImmuneEngine } from "../../engines/immuneEngine.js";
import { buildReport } from "../../core/report.js";
import { showOnboardingMenu } from "../onboarding.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { saveReport } from "../../history/historyStore.js";

export async function quickCommand(ideaArg: string, rawOptions: Record<string, unknown>): Promise<void> {
  const options = normalizeOptions(rawOptions);
  const ideaText = loadIdeaInput(ideaArg);

  const idea = parseIdeaInput({
    idea: ideaText,
    mode: "quick",
    stage: options.stage as string,
    market: options.market as string,
    targetUsers: options.targetUsers as string,
  });

  let providerRes = resolveProvider({
    apiKey: options.apiKey as string,
    baseUrl: options.baseUrl as string,
    model: options.model as string,
    ollama: !!options.ollama,
  });

  if (!providerRes) {
    const choice = await showOnboardingMenu();
    switch (choice) {
      case "configure_key": {
        const rl = (await import("node:readline/promises")).createInterface({ input: process.stdin, output: process.stdout });
        const key = await rl.question("Enter API key: ");
        rl.close();
        if (key.trim()) providerRes = resolveProvider({ apiKey: key.trim() });
        break;
      }
      case "setup_agent_native": {
        const { setupCommand } = await import("./setup.js");
        await setupCommand({});
        return;
      }
      case "ollama": {
        providerRes = resolveProvider({ ollama: true, model: options.model as string });
        break;
      }
    }
  }

  if (!providerRes) {
    console.error(formatNoProviderError());
    process.exit(2);
  }

  try {
    const enableSearch = !options.noSearch;
    const report = await runImmuneEngine(idea, providerRes.provider, { enableSearch });
    report.markdown = buildReport(report);

    // Save to history if --save flag
    if (options.save) {
      const savedPath = saveReport(report);
      console.error(`Report saved to history: ${savedPath}`);
    }

    const isJson = !!options.json;
    const output = options.output as string | undefined;

    if (isJson) {
      const r = safeWriteOutput(output, JSON.stringify(report, null, 2), "Report");
      if (!r.ok) { console.error(r.message); process.exit(2); }
    } else {
      const r = safeWriteOutput(output, report.markdown, "Report");
      if (!r.ok) { console.error(r.message); process.exit(2); }
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(3);
  }
}

