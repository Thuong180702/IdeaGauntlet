/**
 * F-05/P3-12: Ensemble CLI command — run same idea through 2+ providers.
 */
import { resolveProvider } from "../../providers/providerUtils.js";
import { OpenAICompatibleProvider } from "../../providers/openaiCompatibleProvider.js";
import { runEnsemble, formatEnsembleResult } from "../../engines/ensembleEngine.js";
import { safeWriteOutput } from "../../utils/safeWrite.js";
import { getApiKey, getBaseUrl } from "../../utils/env.js";

export async function ensembleCommand(idea: string, options: Record<string, unknown>): Promise<void> {
  if (!idea?.trim()) {
    console.error("Missing idea text");
    process.exit(1);
  }

  const apiKeyRaw = (options.apiKey as string) ?? getApiKey();
  if (!apiKeyRaw) {
    console.error("Missing API key. Set ANTHROPIC_API_KEY, GROQ_API_KEY, or IDEAGAUNTLET_API_KEY.");
    process.exit(1);
  }
  const baseUrl = options.baseUrl as string | undefined;
  const model = options.model as string | undefined;

  // Build providers from comma-separated --models list.
  // Format: "model1,model2" or "provider1:model1,provider2:model2"
  const modelsRaw = (options.models as string) ?? "";
  const modelList = modelsRaw.split(",").map((m) => m.trim()).filter(Boolean);

  if (modelList.length < 2) {
    // Default: run with 2 models if available (e.g. gpt-4o + gpt-4o-mini).
    console.error("Ensemble requires --models <m1,m2> (at least 2 comma-separated model names)");
    process.exit(1);
  }

  const providers = modelList.map((m) => {
    try {
      return new OpenAICompatibleProvider({ model: m, apiKey: apiKeyRaw, baseUrl });
    } catch (err: any) {
      console.error(`Failed to create provider for model "${m}": ${err.message}`);
      process.exit(2);
    }
  });

  console.error(`Running ensemble with ${providers.length} models: ${modelList.join(", ")}...`);

  const result = await runEnsemble({
    idea,
    mode: "quick",
    providers,
    targetUsers: options.targetUsers ? (options.targetUsers as string).split(",") : undefined,
    market: options.market as string | undefined,
    stage: options.stage as string | undefined,
    enableSearch: options.noSearch ? false : true,
  });

  const output = formatEnsembleResult(result);
  const outputFile = options.output as string | undefined;
  const r = safeWriteOutput(outputFile, output, "Ensemble report");
  if (!r.ok) {
    console.error(r.message);
    process.exit(2);
  }
}
