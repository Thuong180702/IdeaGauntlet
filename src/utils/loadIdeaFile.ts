import { readFileSync, existsSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { warnIfError } from "./warn.js";

/** Positional value meaning "read the idea from stdin", e.g. `cat idea.md | idea-gauntlet quick -`. */
export const STDIN_ARG = "-";

function readIdeaFromStdin(): string {
  if (process.stdin.isTTY) {
    throw new Error('No input on stdin. Pipe the idea in, e.g. `cat idea.md | idea-gauntlet quick -`.');
  }
  const content = readFileSync(0, "utf-8").trim();
  if (!content) throw new Error("Stdin was empty — no idea text received.");
  return content;
}

export function loadIdeaInput(ideaArg: string): string {
  if (ideaArg === STDIN_ARG) return readIdeaFromStdin();

  const filePath = isAbsolute(ideaArg) ? ideaArg : resolve(process.cwd(), ideaArg);
  let looksLikeFile = ideaArg.endsWith(".md") || 
                      ideaArg.endsWith(".txt") || 
                      ideaArg.includes("/") || 
                      ideaArg.includes("\\");
  
  if (!looksLikeFile) {
    try {
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        looksLikeFile = true;
      }
    } catch (err: any) {
      warnIfError(`loadIdeaFile: stat check failed for ${ideaArg}`, err);
      looksLikeFile = false;
    }
  }

  if (looksLikeFile) {
    try {
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
