import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { GauntletReport, GauntletMode } from "../core/types.js";
import { runGauntlet } from "../core/runGauntlet.js";
import { resolveProvider, formatNoProviderError } from "../providers/providerUtils.js";
import { buildReport } from "../core/report.js";
import { saveReport } from "../history/historyStore.js";
import { generateHtmlReport } from "../visualization/htmlReport.js";
import { benchmarkScores, formatBenchmarkMarkdown } from "../analysis/benchmark.js";
import { generateMvpFlowchart } from "../visualization/mermaidDiagram.js";

// ANSI escape codes
const CYAN = "\u001b[36m";
const GREEN = "\u001b[32m";
const RED = "\u001b[31m";
const YELLOW = "\u001b[33m";
const RESET = "\u001b[0m";

export async function interactiveCommand(
  initialIdea: string,
): Promise<void> {
  console.log("\n\x1B[1mIdeaGauntlet - Interactive Mode\x1B[0m\n");

  const rl = readline.createInterface({ input, output });

  let providerRes = resolveProvider({
    apiKey: process.env.IDEAGAUNTLET_API_KEY,
    baseUrl: process.env.IDEAGAUNTLET_BASE_URL,
    model: process.env.IDEAGAUNTLET_MODEL,
  });

  if (!providerRes) {
    console.log(YELLOW + "No LLM provider configured." + RESET);
    console.log("Please configure a provider to continue:");
    console.log("  1. Configure OpenAI-compatible API key");
    console.log("  2. Use local Ollama");
    console.log("  3. Exit interactive mode");
    console.log("");
    
    const choice = await rl.question("Choice (1-3): ");
    const trimmedChoice = choice.trim();
    if (trimmedChoice === "1") {
      const apiKey = await rl.question("Enter API Key: ");
      const baseUrl = await rl.question("Enter Base URL (default: https://api.openai.com/v1): ");
      const model = await rl.question("Enter Model Name (default: gpt-4o-mini): ");
      
      const keyVal = apiKey.trim();
      const urlVal = baseUrl.trim() || undefined;
      const modelVal = model.trim() || undefined;
      
      if (!keyVal) {
        console.error(RED + "API key is required. Exiting." + RESET);
        rl.close();
        process.exit(2);
      }
      
      providerRes = resolveProvider({
        apiKey: keyVal,
        baseUrl: urlVal,
        model: modelVal,
      });
    } else if (trimmedChoice === "2") {
      const model = await rl.question("Enter Ollama Model Name (default: llama3): ");
      const modelVal = model.trim() || "llama3";
      providerRes = resolveProvider({
        ollama: true,
        model: modelVal,
      });
    } else {
      console.log("Exiting.");
      rl.close();
      return;
    }
    
    if (!providerRes) {
      console.error(RED + "Failed to initialize provider. Exiting." + RESET);
      rl.close();
      process.exit(2);
    }
  }

  let currentIdea = initialIdea || "";
  let currentMode: GauntletMode = "quick";
  let lastReport: GauntletReport | null = null;
  const enableSearch = true;

  // For compare mode: store multiple ideas separately.
  let compareIdeas: string[] = [];

  if (!currentIdea) {
    console.log("Enter your product idea to begin.\n");
    const answer = await rl.question("Idea: ");
    currentIdea = answer.trim();
    if (!currentIdea) {
      console.log("No idea provided. Exiting.");
      rl.close();
      return;
    }
  }

  console.log("Type /help for commands, /quit to exit.\n");

  // Run initial analysis
  console.log("Running " + currentMode + " analysis...\n");
  lastReport = await runGauntletSafe(currentIdea, currentMode, providerRes.provider, enableSearch, compareIdeas);
  if (lastReport) {
    lastReport.markdown = buildReport(lastReport);
    printReport(lastReport);
  }

  // REPL loop
  let running = true;
  while (running) {
    const promptStr = CYAN + "[" + currentMode + "]" + RESET + " > ";
    const command = await rl.question(promptStr);
    const trimmed = command.trim();

    if (!trimmed) continue;

    if (trimmed === "/quit" || trimmed === "/exit") {
      running = false;
      continue;
    }

    if (trimmed === "/help") {
      printHelp();
      continue;
    }

    if (trimmed === "/config") {
      const providerKind = providerRes.provider.kind;
      const providerModel = (providerRes.provider as any).config?.model ?? (providerRes.provider as any).model ?? "unknown";
      console.log("\nCurrent Provider: " + providerKind + " (" + providerModel + ")");
      console.log("Reconfigure provider:");
      console.log("  1. Configure OpenAI-compatible API key");
      console.log("  2. Use local Ollama");
      console.log("  3. Cancel");
      console.log("");
      
      const choice = await rl.question("Choice (1-3): ");
      const trimmedChoice = choice.trim();
      if (trimmedChoice === "1") {
        const apiKey = await rl.question("Enter API Key: ");
        const baseUrl = await rl.question("Enter Base URL (default: https://api.openai.com/v1): ");
        const model = await rl.question("Enter Model Name (default: gpt-4o-mini): ");
        
        const keyVal = apiKey.trim();
        const urlVal = baseUrl.trim() || undefined;
        const modelVal = model.trim() || undefined;
        
        if (keyVal) {
          const newRes = resolveProvider({
            apiKey: keyVal,
            baseUrl: urlVal,
            model: modelVal,
          });
          if (newRes) {
            providerRes = newRes;
            console.log(GREEN + "Provider reconfigured successfully." + RESET + "\n");
          } else {
            console.log(RED + "Failed to resolve provider with input options." + RESET + "\n");
          }
        } else {
          console.log(RED + "API key is required to configure provider." + RESET + "\n");
        }
      } else if (trimmedChoice === "2") {
        const model = await rl.question("Enter Ollama Model Name (default: llama3): ");
        const modelVal = model.trim() || "llama3";
        const newRes = resolveProvider({
          ollama: true,
          model: modelVal,
        });
        if (newRes) {
          providerRes = newRes;
          console.log(GREEN + "Provider reconfigured successfully to Ollama." + RESET + "\n");
        }
      }
      continue;
    }

    if (trimmed.startsWith("/idea ")) {
      const newIdea = trimmed.slice(6).trim();
      if (newIdea) {
        currentIdea = newIdea;
        compareIdeas = []; // reset compare ideas when main idea changes
        console.log(GREEN + "Idea updated." + RESET + "\n");
      }
      continue;
    }

    if (trimmed.startsWith("/mode ")) {
      const newMode = trimmed.slice(6).trim() as GauntletMode;
      if (["quick", "court", "users", "mvp", "compare"].includes(newMode)) {
        currentMode = newMode;
        if (newMode === "compare" && compareIdeas.length === 0) {
          console.log(GREEN + "Mode set to compare." + RESET);
          console.log(YELLOW + "Use /add-idea <text> to add ideas to compare (at least 2)." + RESET + "\n");
        } else {
          console.log(GREEN + "Mode set to " + newMode + "." + RESET + "\n");
        }
      } else {
        console.log(RED + "Invalid mode. Options: quick, court, users, mvp, compare" + RESET + "\n");
      }
      continue;
    }

    // Compare mode: add multiple ideas.
    if (trimmed.startsWith("/add-idea ")) {
      const newIdea = trimmed.slice(10).trim();
      if (newIdea) {
        compareIdeas.push(newIdea);
        console.log(GREEN + "Added idea #" + compareIdeas.length + ": " + newIdea.slice(0, 60) + RESET + "\n");
      }
      continue;
    }

    // Compare mode: list current ideas to compare.
    if (trimmed === "/list-ideas") {
      if (compareIdeas.length === 0) {
        console.log(YELLOW + "No ideas added for comparison yet. Use /add-idea <text>." + RESET + "\n");
      } else {
        console.log("\nIdeas to compare:");
        compareIdeas.forEach((idea, i) => {
          console.log("  " + (i + 1) + ". " + idea.slice(0, 80));
        });
        console.log();
      }
      continue;
    }

    // Compare mode: clear ideas list.
    if (trimmed === "/clear-ideas") {
      compareIdeas = [];
      console.log(GREEN + "Compare ideas list cleared." + RESET + "\n");
      continue;
    }

    if (trimmed === "/run") {
      // Validate compare mode has multiple ideas.
      if (currentMode === "compare") {
        if (compareIdeas.length < 2) {
          console.log(YELLOW + "Compare mode needs at least 2 ideas. Use /add-idea <text> to add them." + RESET + "\n");
          continue;
        }
        console.log("Comparing " + compareIdeas.length + " ideas...\n");
      } else {
        console.log("Running " + currentMode + " analysis...\n");
      }
      lastReport = await runGauntletSafe(currentIdea, currentMode, providerRes.provider, enableSearch, compareIdeas);
      if (lastReport) {
        lastReport.markdown = buildReport(lastReport);
        printReport(lastReport);
      }
      continue;
    }

    if (trimmed === "/benchmark") {
      if (!lastReport?.scores) {
        console.log(YELLOW + "No scores available. Run an analysis first." + RESET + "\n");
        continue;
      }
      const comparison = benchmarkScores(lastReport.scores);
      console.log(formatBenchmarkMarkdown(comparison));
      console.log();
      continue;
    }

    if (trimmed === "/diagram") {
      if (!lastReport) {
        console.log(YELLOW + "No report available. Run an analysis first." + RESET + "\n");
        continue;
      }
      if (lastReport.mode !== "mvp" || !lastReport.enhancedMvpPlan) {
        console.log(YELLOW + "Diagrams available for MVP mode. Use /mode mvp then /run." + RESET + "\n");
        continue;
      }
      const diagram = generateMvpFlowchart(lastReport);
      console.log(diagram);
      console.log();
      continue;
    }

    if (trimmed === "/save") {
      if (!lastReport) {
        console.log(YELLOW + "No report to save. Run an analysis first." + RESET + "\n");
        continue;
      }
      const path = saveReport(lastReport);
      console.log(GREEN + "Report saved: " + path + RESET + "\n");
      continue;
    }

    if (trimmed === "/export html" || trimmed === "/export-html") {
      if (!lastReport) {
        console.log(YELLOW + "No report available. Run an analysis first." + RESET + "\n");
        continue;
      }
      lastReport.markdown = buildReport(lastReport);
      const html = generateHtmlReport(lastReport);
      const filename = "report-" + Date.now() + ".html";
      const { writeFileSync } = await import("node:fs");
      writeFileSync(filename, html, "utf-8");
      console.log(GREEN + "HTML report exported: " + filename + RESET + "\n");
      continue;
    }

    if (trimmed.startsWith("/drill ")) {
      const num = parseInt(trimmed.slice(7));
      if (!lastReport?.risks || lastReport.risks.length === 0) {
        console.log(YELLOW + "No risks to drill into. Run quick or court mode first." + RESET + "\n");
        continue;
      }
      if (isNaN(num) || num < 1 || num > lastReport.risks.length) {
        console.log(RED + "Invalid risk number. Available: 1-" + lastReport.risks.length + RESET + "\n");
        continue;
      }
      const risk = lastReport.risks[num - 1];
      console.log("\n" + RED + "### Risk #" + num + ": " + risk.title + RESET);
      console.log("Severity: " + risk.severity);
      console.log("Explanation: " + risk.explanation);
      if (risk.mitigation) {
        console.log("Mitigation: " + risk.mitigation);
      }
      console.log();

      const drillMore = await rl.question("Drill deeper? Run court mode focused on this risk? (y/n): ");
      if (drillMore.trim().toLowerCase() === "y") {
        const drillIdea = currentIdea + " -- Focus specifically on this risk: " + risk.title + ". " + risk.explanation;
        console.log("\nRunning court analysis focused on this risk...\n");
        lastReport = await runGauntletSafe(drillIdea, "court", providerRes.provider, enableSearch, []);
        if (lastReport) {
          lastReport.markdown = buildReport(lastReport);
          printReport(lastReport);
        }
      }
      continue;
    }

    console.log(YELLOW + "Unknown command: " + trimmed + ". Type /help for available commands." + RESET + "\n");
  }

  rl.close();
  console.log("\nInteractive session ended.\n");
}

async function runGauntletSafe(
  idea: string,
  mode: GauntletMode,
  provider: any,
  enableSearch: boolean,
  compareIdeas: string[],
): Promise<GauntletReport | null> {
  try {
    if (mode === "compare" && compareIdeas.length >= 2) {
      return await runGauntlet({
        idea: compareIdeas[0],
        mode,
        provider,
        enableSearch,
        compareIdeas,
      });
    }
    return await runGauntlet({
      idea,
      mode,
      provider,
      enableSearch,
    });
  } catch (err: any) {
    console.error(RED + "Error: " + err.message + RESET + "\n");
    return null;
  }
}

function printReport(report: GauntletReport): void {
  console.log("=".repeat(80));
  console.log(report.markdown ?? buildReport(report));
  console.log("=".repeat(80) + "\n");
}

function printHelp(): void {
  console.log("\nInteractive Commands:");
  console.log("  /idea <text>      - Update idea text");
  console.log("  /mode <mode>      - Switch mode (quick, court, users, mvp, compare)");
  console.log("  /config           - View or change LLM provider config");
  console.log("  /run              - Run analysis with current idea + mode");
  console.log("  /add-idea <text>  - Add an idea to compare list (compare mode)");
  console.log("  /list-ideas       - List ideas in compare list");
  console.log("  /clear-ideas      - Clear compare ideas list");
  console.log("  /benchmark        - Compare scores to benchmark dataset");
  console.log("  /diagram          - Generate Mermaid diagram (MVP mode only)");
  console.log("  /save             - Save current report to history store");
  console.log("  /export html      - Export HTML report");
  console.log("  /drill <n>        - Drill down into risk #n + optional court re-run");
  console.log("  /help             - Show this help");
  console.log("  /quit             - Exit interactive mode\n");
}
