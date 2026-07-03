import { existsSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";

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
  const parts = outputPath.split(/[\\/]/);

  // Detect genuine path traversal: raw `..` segments that escape cwd
  // These are almost always malicious (e.g. `../../../etc/passwd`)
  // Allow absolute paths and sibling references that resolve normally.
  if (!isAbsolute(outputPath) && parts.includes("..")) {
    // Only block if traversal actually escapes the working directory
    const cwd = process.cwd();
    if (!resolved.startsWith(cwd)) {
      return {
        ok: false,
        reason: "traversal",
        message: `Path traversal detected: '${outputPath}'. Use an absolute path or a path within the working directory.`,
      };
    }
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
  const baseDir = resolve(workspaceDir, ".idea-gauntlet", "reports");
  const filePath = resolve(baseDir, `${reportId}.md`);

  if (!filePath.startsWith(baseDir)) {
    return {
      ok: false,
      reason: "traversal",
      message: "Invalid path: report must be written inside .idea-gauntlet/reports/",
    };
  }

  if (!existsSync(baseDir)) {
    import("node:fs").then((fs) => fs.mkdirSync(baseDir, { recursive: true }));
  }

  writeFileSync(filePath, content, "utf-8");
  return { ok: true, path: filePath };
}
