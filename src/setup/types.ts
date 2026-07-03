export type ToolName = "claude" | "codex" | "cursor" | "mcp";

export type InstallMode = "copy" | "symlink";

export interface ToolDetectionContext {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  flags: Record<string, unknown>;
  configHome: string;
}

export type ToolDetectionResult =
  | { detected: true; root: string; source: "flag" | "env" | "standard" }
  | { detected: false; reason: string };

export interface InstallFile {
  path: string;
  content: string;
  description: string;
}

export type InstallEntry =
  | {
      tool: string;
      kind: "file";
      path: string;
      mode: InstallMode;
      sha256: string;
    }
  | {
      tool: "claude";
      kind: "mcp-config";
      path: string;
      configKey: "mcpServers.idea-gauntlet";
      entrySha256: string;
    };

export interface InstallManifest {
  version: string;
  installedAt: string;
  packageRoot: string;
  entries: InstallEntry[];
}

export interface PlannedAction {
  type: "create" | "identical" | "conflict";
  path: string;
  description: string;
  content: string;
}

export interface PlanResult {
  actions: PlannedAction[];
  hasChanges: boolean;
}
