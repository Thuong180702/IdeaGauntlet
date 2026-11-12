/**
 * Loud failure for analyses that could not be produced.
 *
 * A placeholder that looks like a finding ("moderate fit", "low compliance
 * risk") is worse than no answer: a founder may act on it. When the model call
 * fails or returns nothing usable, engines throw this instead of filling the
 * report with defaults — the same rule the assumption ledger follows.
 */
export class AnalysisFailedError extends Error {
  constructor(
    public readonly analysis: string,
    public readonly reason: string,
  ) {
    super(
      `${analysis} could not be produced: ${reason}\n` +
        "Nothing was generated — IdeaGauntlet does not fill gaps with placeholder analysis.\n" +
        "Retry, check the provider with `idea-gauntlet doctor`, or use a more capable model (--model).",
    );
    this.name = "AnalysisFailedError";
  }
}

function isMissing(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

/** True when the model returned JSON with nothing in it (`{}`), which is a failed answer, not an empty finding. */
export function isEmptyAnalysis(parsed: unknown): boolean {
  return parsed === null || parsed === undefined || (typeof parsed === "object" && Object.keys(parsed as object).length === 0);
}

/**
 * Return `parsed` if it carries every field the analysis cannot exist without;
 * otherwise throw. `required` should list only the fields whose absence makes
 * the result meaningless — optional detail is still defaulted by the engine.
 */
export function requireAnalysis<T>(parsed: T | null | undefined, analysis: string, required: string[]): T {
  if (isEmptyAnalysis(parsed)) {
    throw new AnalysisFailedError(analysis, "the model did not return a usable structured answer");
  }
  const missing = required.filter((key) => isMissing((parsed as Record<string, unknown>)[key]));
  if (missing.length > 0) {
    throw new AnalysisFailedError(analysis, `the model's answer was missing ${missing.join(", ")}`);
  }
  return parsed as T;
}

/** Normalise any thrown value (provider error, parse error) into an AnalysisFailedError. */
export function toAnalysisFailure(analysis: string, err: unknown): AnalysisFailedError {
  if (err instanceof AnalysisFailedError) return err;
  return new AnalysisFailedError(analysis, err instanceof Error ? err.message : String(err));
}
