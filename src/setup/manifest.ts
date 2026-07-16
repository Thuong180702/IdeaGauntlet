import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import type { InstallManifest, InstallEntry } from "./types.js";
import { warnIfError } from "../utils/warn.js";

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

export function hashFile(filePath: string): string | null {
  try {
    const content = readFileSync(filePath);
    return createHash("sha256").update(content).digest("hex");
  } catch (err: any) {
    warnIfError(`manifest: hashFile failed for ${filePath}`, err);
    return null;
  }
}

export function readManifest(manifestPath: string): InstallManifest | null {
  try {
    const raw = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(parsed.entries)
    ) {
      return parsed as InstallManifest;
    }
    return null;
  } catch (err: any) {
    warnIfError(`manifest: readManifest failed for ${manifestPath}`, err);
    return null;
  }
}

export function writeManifest(
  manifestPath: string,
  manifest: InstallManifest,
): void {
  const dir = dirname(manifestPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

export function verifyEntry(
  entry: InstallEntry,
): "present" | "modified" | "missing" {
  if (!existsSync(entry.path)) return "missing";

  if (entry.kind === "file") {
    const actualHash = hashFile(entry.path);
    if (actualHash === entry.sha256) return "present";
    return "modified";
  }

  // mcp-config: check the specific entry within the JSON file
  if (entry.kind === "mcp-config") {
    try {
      const raw = readFileSync(entry.path, "utf-8");
      const config = JSON.parse(raw);
      const igEntry = config?.mcpServers?.["idea-gauntlet"];
      if (!igEntry) return "missing";
      const actualHash = hashContent(JSON.stringify(igEntry));
      return actualHash === entry.entrySha256 ? "present" : "modified";
    } catch (err: any) {
      warnIfError(`manifest: verifyEntry MCP config read failed for ${entry.path}`, err);
      return "missing";
    }
  }

  return "missing";
}

export function verifyManifest(
  manifest: InstallManifest,
): { entry: InstallEntry; status: "present" | "modified" | "missing" }[] {
  return manifest.entries.map((entry) => ({
    entry,
    status: verifyEntry(entry),
  }));
}
