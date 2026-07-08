#!/usr/bin/env node
import { cac } from "cac";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { quickCommand } from "./commands/quick.js";
import { courtCommand } from "./commands/court.js";
import { usersCommand } from "./commands/users.js";
import { mvpCommand } from "./commands/mvp.js";
import { compareCommand } from "./commands/compare.js";
import { initCommand } from "./commands/init.js";
import { setupCommand } from "./commands/setup.js";
import { doctorCommand } from "./commands/doctor.js";
import { mcpCommand } from "./commands/mcp.js";
import { installCommand } from "./commands/install.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { statusCommand } from "./commands/status.js";
import { batchCommand } from "./commands/batch.js";
import { historyCommand } from "./commands/history.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "../../package.json"), "utf-8")
);

const cli = cac("idea-gauntlet");

cli.version(pkg.version);
cli.help();

const providerOptions = (cmd: any) => cmd
  .option("--model <model>", "LLM model override")
  .option("--base-url <url>", "OpenAI-compatible API base URL override")
  .option("--api-key <key>", "API key override")
  .option("--ollama", "Use local Ollama provider");

providerOptions(
  cli.command("quick <idea>", "Run a fast adversarial critique")
    .option("--stage <stage>", "Idea stage: napkin, pre-mvp, mvp, growth")
    .option("--market <market>", "Target market description")
    .option("--target-users <users>", "Comma-separated target users")
    .option("--json", "Output JSON instead of Markdown")
    .option("--output <file>", "Write to file")
    .option("--no-search", "Disable web search before analysis")
    .option("--save", "Save report to history for evolution tracking")
).action((idea: string, options: Record<string, unknown>) => quickCommand(idea, options));

providerOptions(
  cli.command("court <idea>", "Run a court-style debate")
    .option("--stage <stage>", "Idea stage")
    .option("--json", "Output JSON")
    .option("--output <file>", "Write to file")
    .option("--no-search", "Disable web search before analysis")
    .option("--roles <file>", "Load custom court roles from JSON file")
).action((idea: string, options: Record<string, unknown>) => courtCommand(idea, options));

providerOptions(
  cli.command("users <idea>", "Generate synthetic user personas")
    .option("--personas <number>", "Number of personas", { default: "6" })
    .option("--stage <stage>", "Idea stage")
    .option("--json", "Output JSON")
    .option("--output <file>", "Write to file")
    .option("--no-search", "Disable web search before analysis")
).action((idea: string, options: Record<string, unknown>) => usersCommand(idea, options));

providerOptions(
  cli.command("mvp <idea>", "Generate a validation/MVP plan")
    .option("--stage <stage>", "Idea stage")
    .option("--json", "Output JSON")
    .option("--output <file>", "Write to file")
    .option("--no-search", "Disable web search before analysis")
).action((idea: string, options: Record<string, unknown>) => mvpCommand(idea, options));

providerOptions(
  cli.command("compare <...ideas>", "Compare multiple product ideas")
    .option("--output <file>", "Write to file")
    .option("--no-search", "Disable web search before analysis")
).action((ideas: string[], options: Record<string, unknown>) => compareCommand(ideas, options));

cli.command("init [directory]", "Scaffold an IdeaGauntlet workspace template")
  .option("--name <name>", "Project name")
  .option("--force", "Overwrite existing files")
  .action((directory, options) => initCommand(directory, options));

cli.command("setup", "Generate integration files for Claude/Cursor/Codex/MCP")
  .option("--all", "Install all integrations non-interactively in current project")
  .option("--dry-run", "Show what would be written without writing")
  .option("--force", "Overwrite existing files without confirmation")
  .option("--targets <targets>", "Comma-separated targets to install")
  .option("--global", "Use global tool config directories instead of project")
  .option("--remove", "Remove integrations (with --global)")
  .option("--status", "Show integration status (with --global)")
  .option("--claude-dir <path>", "Claude Code config directory override (with --global)")
  .option("--codex-dir <path>", "Codex config directory override (with --global)")
  .option("--cursor-dir <path>", "Cursor config directory override (with --global)")
  .option("--config-home <path>", "IdeaGauntlet config directory override (with --global)")
  .action((options) => setupCommand(options));

cli.command("install", "Install global Claude/Codex/Cursor integrations")
  .option("--force", "Overwrite existing files")
  .option("--claude-dir <path>", "Claude Code config directory override")
  .option("--codex-dir <path>", "Codex config directory override")
  .option("--cursor-dir <path>", "Cursor config directory override")
  .option("--config-home <path>", "IdeaGauntlet config directory override")
  .action((options) => installCommand(options));

cli.command("uninstall", "Remove global Claude/Codex/Cursor integrations")
  .option("--force", "Remove even if files were modified")
  .option("--config-home <path>", "IdeaGauntlet config directory override")
  .action((options) => uninstallCommand(options));

cli.command("status", "Show global install status")
  .option("--config-home <path>", "IdeaGauntlet config directory override")
  .action((options) => statusCommand(options));

cli.command("doctor", "Check environment and configuration")
  .option("--verbose", "Detailed output")
  .action((options) => doctorCommand(options));

cli.command("mcp", "Start the MCP stdio server")
  .option("--port <port>", "HTTP port (for HTTP transport)")
  .option("--http", "Use HTTP transport instead of stdio")
  .action((options) => mcpCommand(options));

providerOptions(
  cli.command("batch <file>", "Run quick critique on multiple ideas from a file")
    .option("--mode <mode>", "Gauntlet mode: quick, court, users, mvp (default: quick)")
    .option("--output <dir>", "Write all reports to directory")
    .option("--json", "Output JSON")
    .option("--no-search", "Disable web search before analysis")
).action((file: string, options: Record<string, unknown>) => batchCommand(file, options));

cli.command("history [id]", "View saved idea reports and track evolution")
  .option("--evolve <id>", "Compare against a saved report to see score delta")
  .action((id: string | undefined, options: Record<string, unknown>) => historyCommand(id, options));

cli.parse();
