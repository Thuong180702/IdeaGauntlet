import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, sep } from "node:path";

export type SafeWriteResult =
  | { ok: true; path: string }
  | { ok: false; reason: "traversal" | "exists" | "error"; message: string };

/**
 * Resolve and validate an output path for CLI --output flags.
 * Allows explicit user paths after safe resolution.
 * Returns a result rather than exiting the process, so callers
 * can handle --force or confirmation flows.
 */
export function safeWriteOutput(
  outputPath: string | undefined,
  content: string,
  label?: string,
): SafeWriteResult {
  if (!outputPath) {
    console.log(content);
    return { ok: true, path: "" };
  }

  const resolved = resolve(process.cwd(), outputPath);
  const cwd = process.cwd();
  const isWindows = process.platform === "win32";
  const resStr = isWindows ? resolved.toLowerCase() : resolved;
  const cwdStr = isWindows ? cwd.toLowerCase() : cwd;

  // SEC-03: Always check if resolved path is within CWD, regardless of path content.
  // Previously only checked when path contained '..' segments, allowing absolute
  // paths like /etc/cron.d/evil to bypass the traversal check entirely.
  const isWithinCwd = resStr === cwdStr ||
    resStr.startsWith(cwdStr) &&
    (resStr[cwdStr.length] === sep || cwdStr.endsWith(sep));

  if (!isWithinCwd) {
    return {
      ok: false,
      reason: "traversal",
      message: `Path traversal detected: '${outputPath}'. Use a path within the working directory.`,
    };
  }

  // Warn before overwriting
  if (existsSync(resolved)) {
    return {
      ok: false,
      reason: "exists",
      message: `'${outputPath}' already exists. Use --force to overwrite.`,
    };
  }

  writeFileSync(resolved, content, "utf-8");
  console.log(`${label ?? "File"} written to ${outputPath}`);
  return { ok: true, path: resolved };
}

/**
 * Strict path writer for MCP save_report — only writes inside `.idea-gauntlet/reports/`.
 */
export function safeWriteReport(
  reportId: string,
  content: string,
  workspaceDir: string,
): SafeWriteResult {
  // SEC-04: Validate report ID format to prevent path traversal via crafted IDs.
  if (!/^[a-zA-Z0-9_-]+$/.test(reportId)) {
    return {
      ok: false,
      reason: "traversal",
      message: "Invalid report ID: must be alphanumeric with optional hyphens/underscores.",
    };
  }

  const baseDir = resolve(workspaceDir, ".idea-gauntlet", "reports");
  const filePath = resolve(baseDir, `${reportId}.md`);

  // SEC-04: Case-insensitive comparison on Windows
  const isWindows = process.platform === "win32";
  const filePathNorm = isWindows ? filePath.toLowerCase() : filePath;
  const baseDirNorm = isWindows ? baseDir.toLowerCase() : baseDir;

  if (!filePathNorm.startsWith(baseDirNorm)) {
    return {
      ok: false,
      reason: "traversal",
      message: "Invalid path: report must be written inside .idea-gauntlet/reports/",
    };
  }

  // Bug D fix: synchronous mkdirSync before writeFileSync
  // Previously used async import().then() which caused a race condition
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  writeFileSync(filePath, content, "utf-8");
  return { ok: true, path: filePath };
}
