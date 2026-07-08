import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import type { RoleDefinition } from "../engines/courtPhases.js";

/**
 * Custom role loader — reads a JSON file and validates roles.
 *
 * JSON format:
 * [
 *   {
 *     "id": "my-role",
 *     "name": "My Custom Role",
 *     "stance": "skeptic",
 *     "mandate": "Attacks specific areas...",
 *     "mustAddress": ["Question 1", "Question 2", ...]
 *   },
 *   ...
 * ]
 *
 * Custom roles replace default roles with matching IDs.
 * New roles are appended to the defaults.
 */

const RoleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  stance: z.enum(["skeptic", "defender", "neutral", "user", "judge"]),
  mandate: z.string().min(1),
  mustAddress: z.array(z.string()).min(1),
});

const RolesFileSchema = z.array(RoleSchema);

export function loadCustomRoles(filePath: string): RoleDefinition[] {
  const absPath = resolve(filePath);
  const content = readFileSync(absPath, "utf-8");

  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (err: any) {
    throw new Error(`Invalid JSON in roles file: ${err.message}`);
  }

  const result = RolesFileSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid roles file format:\n${issues}`);
  }

  return result.data as RoleDefinition[];
}
