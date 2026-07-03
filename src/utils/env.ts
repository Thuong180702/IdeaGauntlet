export function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

export function getApiKey(): string | undefined {
  return getEnv("IDEAGAUNTLET_API_KEY");
}

export function getBaseUrl(): string {
  return getEnv("IDEAGAUNTLET_BASE_URL") ?? "https://api.openai.com/v1";
}

export function getModel(): string {
  return getEnv("IDEAGAUNTLET_MODEL") ?? "gpt-4o-mini";
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export function nodeVersion(): string {
  return process.version;
}

export function isNodeGte(minMajor: number): boolean {
  const match = process.version.match(/^v(\d+)/);
  if (!match) return false;
  return parseInt(match[1], 10) >= minMajor;
}
