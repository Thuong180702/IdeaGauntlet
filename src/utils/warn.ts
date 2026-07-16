/**
 * Lightweight warning utility — replaces silent `catch {}` blocks.
 * Logs to stderr so it doesn't pollute stdout (important for --json mode).
 */

/** True when --quiet or IDEAGAUNTLET_QUIET env is set. */
let _quiet = false;

export function setQuiet(value: boolean): void {
  _quiet = value;
}

export function isQuiet(): boolean {
  return _quiet || !!process.env.IDEAGAUNTLET_QUIET;
}

/**
 * Emit a warning to stderr. Suppressed in quiet mode.
 */
export function warn(message: string): void {
  if (!isQuiet()) {
    process.stderr.write(`\u001b[33m[warn]\u001b[0m ${message}\n`);
  }
}

/**
 * Emit a warning for a caught error, extracting the message.
 */
export function warnIfError(context: string, err: unknown): void {
  if (isQuiet()) return;
  const msg = err instanceof Error ? err.message : String(err);
  warn(`${context}: ${msg}`);
}
