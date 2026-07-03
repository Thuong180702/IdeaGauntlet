import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const IDEA_TEMPLATE = `# My Product Idea

## Title
[Your product name]

## Description
[Describe your product idea in 2-3 sentences. What does it do? Who is it for?]

## Target Users
- [User type 1]
- [User type 2]

## Market
[What market does this serve?]

## Stage
napkin / pre-mvp / mvp / growth

## Constraints
- Team size:
- Budget:
- Timeline:

## Known Competitors
- [Competitor 1]
- [Competitor 2]

## Evidence So Far
- [Any user interviews, signups, or validation data]
`;

const CONFIG_TEMPLATE = `{
  "name": "my-idea-gauntlet",
  "defaultMode": "quick",
  "model": "gpt-4o-mini"
}
`;

export async function initCommand(
  directory?: string,
  options?: Record<string, unknown>,
): Promise<void> {
  const dir = directory
    ? resolve(process.cwd(), directory)
    : resolve(process.cwd(), ".idea-gauntlet");
  const force = !!(options as any)?.force;

  if (existsSync(dir)) {
    const ideasDir = resolve(dir, "ideas");
    const reportsDir = resolve(dir, "reports");
    const configFile = resolve(dir, "config.json");
    const ideaFile = resolve(ideasDir, "my-idea.md");

    if (!force) {
      console.log(`Directory exists: ${dir}`);
      if (!existsSync(ideasDir)) mkdirSync(ideasDir, { recursive: true });
      if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
      if (!existsSync(ideaFile)) writeFileSync(ideaFile, IDEA_TEMPLATE, "utf-8");
      if (!existsSync(configFile)) writeFileSync(configFile, CONFIG_TEMPLATE, "utf-8");
      console.log("✓ Workspace exists. Missing template files created.");
      return;
    }
  } else {
    mkdirSync(dir, { recursive: true });
  }

  mkdirSync(resolve(dir, "ideas"), { recursive: true });
  mkdirSync(resolve(dir, "reports"), { recursive: true });
  writeFileSync(resolve(dir, "ideas", "my-idea.md"), IDEA_TEMPLATE, "utf-8");
  writeFileSync(resolve(dir, "config.json"), CONFIG_TEMPLATE, "utf-8");

  console.log(`✓ IdeaGauntlet workspace created at ${dir}`);
  console.log(`  ${dir}/ideas/my-idea.md`);
  console.log(`  ${dir}/reports/`);
  console.log(`  ${dir}/config.json`);
}