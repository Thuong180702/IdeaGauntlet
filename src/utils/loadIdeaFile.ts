import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export function loadIdeaInput(ideaArg: string): string {
  if (ideaArg.endsWith(".md") || ideaArg.includes("/") || ideaArg.includes("\\")) {
    try {
      const filePath = isAbsolute(ideaArg) ? ideaArg : resolve(process.cwd(), ideaArg);
      const content = readFileSync(filePath, "utf-8").trim();
      if (!content) throw new Error(`File is empty: ${ideaArg}`);
      return content;
    } catch (err: any) {
      if (err.code === "ENOENT") return ideaArg;
      throw err;
    }
  }
  return ideaArg;
}
