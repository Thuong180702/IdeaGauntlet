import type { IdeaInput, GauntletMode } from "../core/types.js";

export function parseIdeaInput(params: {
  idea: string;
  mode?: GauntletMode;
  stage?: string;
  market?: string;
  targetUsers?: string;
}): IdeaInput {
  return {
    idea: params.idea,
    mode: params.mode,
    stage: (params.stage as any) ?? undefined,
    market: params.market,
    targetUsers: params.targetUsers?.split(",").map((s) => s.trim()).filter(Boolean),
  };
}

export function normalizeOptions<T extends Record<string, unknown>>(opts: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(opts)) {
    const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}
