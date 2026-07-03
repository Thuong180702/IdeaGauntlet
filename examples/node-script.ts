import { runGauntlet, OllamaProvider } from "idea-gauntlet";
import { readFileSync } from "node:fs";

async function main() {
  const ideaText = readFileSync("examples/quietroom.md", "utf-8");
  const provider = new OllamaProvider("llama3");

  const report = await runGauntlet({
    idea: ideaText,
    targetUsers: ["remote workers", "students"],
    market: "global productivity software",
    stage: "pre-mvp",
    mode: "quick",
    provider,
  });

  console.log(report.markdown);
}

main().catch(console.error);
