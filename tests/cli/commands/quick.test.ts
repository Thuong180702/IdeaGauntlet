import { describe, it, expect } from "vitest";
import { resolveProvider } from "../../../src/providers/providerUtils.js";

describe("quick command", () => {
  it("can be imported and has expected shape", async () => {
    const mod = await import("../../../src/cli/commands/quick.js");
    expect(mod.quickCommand).toBeDefined();
    expect(typeof mod.quickCommand).toBe("function");
  });
});

describe("provider resolution", () => {
  it("returns null when no provider config is available", () => {
    const original = process.env.IDEAGAUNTLET_API_KEY;
    delete process.env.IDEAGAUNTLET_API_KEY;
    const result = resolveProvider({});
    expect(result).toBeNull();
    if (original) process.env.IDEAGAUNTLET_API_KEY = original;
  });

  it("can resolve Ollama provider explicitly", () => {
    const result = resolveProvider({ ollama: true, model: "llama3" });
    expect(result).not.toBeNull();
    expect(result!.source).toBe("ollama");
  });
});

describe("onboarding", () => {
  it("can be imported", async () => {
    const mod = await import("../../../src/cli/onboarding.js");
    expect(mod.showOnboardingMenu).toBeDefined();
  });
});
