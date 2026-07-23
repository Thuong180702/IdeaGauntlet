/**
 * F-11: Custom workflow config — lets users override scoring weights,
 * court roles, and research defaults via .ideagauntlet-workflow.json.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export interface CustomWorkflowConfig {
  /** Override default scoring weights per dimension (1-3 multiplier). */
  scoreWeights?: Partial<Record<string, number>>;
  /** Override default court roles by ID. */
  customRoles?: Array<{
    id: string;
    name: string;
    stance: "skeptic" | "defender" | "user";
    mandate: string;
    mustAddress: string[];
  }>;
  /** Research config overrides. */
  research?: {
    maxQueries?: number;
    maxResultsPerQuery?: number;
    maxPagesToFetch?: number;
    skipProviders?: string[];
  };
  /** LLM parameters overrides. */
  llm?: {
    temperature?: number;
    maxTokens?: number;
  };
}

const CONFIG_FILE = ".ideagauntlet-workflow.json";

let _cachedConfig: CustomWorkflowConfig | null = null;
let _cached = false;

export function loadWorkflowConfig(workspaceDir?: string): CustomWorkflowConfig {
  if (_cached) return _cachedConfig ?? {};

  const configPath = resolve(workspaceDir ?? process.cwd(), CONFIG_FILE);
  if (!existsSync(configPath)) {
    _cachedConfig = {};
    _cached = true;
    return {};
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    _cachedConfig = JSON.parse(raw);
    _cached = true;
    return _cachedConfig ?? {};
  } catch {
    _cachedConfig = {};
    _cached = true;
    return {};
  }
}

/**
 * Apply score weight overrides to a scorecard.
 * Weight multiplies the score, clamped to 1-10.
 */
export function applyScoreWeights(
  scores: Record<string, number>,
  weights: Partial<Record<string, number>> | undefined,
): Record<string, number> {
  if (!weights) return scores;
  const result = { ...scores };
  for (const [dim, weight] of Object.entries(weights)) {
    if (typeof weight === "number" && weight > 0 && result[dim] !== undefined) {
      result[dim] = Math.min(10, Math.max(1, Math.round(result[dim] * weight / 2)));
    }
  }
  return result;
}

/** Generate a template config file for users to customize. */
export function generateConfigTemplate(): string {
  return JSON.stringify({
    scoreWeights: {
      clarity: 2,
      pain: 3,
      differentiation: 3,
      buildability: 1,
      distribution: 2,
      monetization: 2,
      evidence: 1,
    },
    customRoles: [
      {
        id: "domain-skeptic",
        name: "Domain Expert Skeptic",
        stance: "skeptic",
        mandate: "Challenge domain-specific assumptions",
        mustAddress: [
          "Is the domain expertise correct?",
          "Are there regulatory barriers?",
          "What domain-specific failure modes exist?",
        ],
      },
    ],
    research: {
      maxQueries: 5,
      maxResultsPerQuery: 8,
      maxPagesToFetch: 8,
      skipProviders: [],
    },
    llm: {
      temperature: 0.4,
      maxTokens: 4096,
    },
  }, null, 2);
}
