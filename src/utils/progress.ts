/**
 * Lightweight progress indicator — minimal stderr spinner.
 * Suppresses in --quiet mode or when stdout is not a TTY.
 */

import { isQuiet } from "./warn.js";

let _active: { msg: string; timer: ReturnType<typeof setInterval> } | null = null;

function isInteractive(): boolean {
  return process.stderr.isTTY === true && !isQuiet();
}

export function startProgress(msg: string): void {
  if (!isInteractive()) return;
  stopProgress();
  let dots = 0;
  _active = {
    msg,
    timer: setInterval(() => {
      dots = (dots + 1) % 4;
      process.stderr.write(`\r${msg}${".".repeat(dots)}   `);
    }, 500),
  };
}

export function stopProgress(done?: string): void {
  if (!_active) {
    if (done && isInteractive()) process.stderr.write(`\r${done}\n`);
    return;
  }
  clearInterval(_active.timer);
  process.stderr.write(`\r${" ".repeat(_active.msg.length + 8)}\r`);
  if (done) process.stderr.write(`${done}\n`);
  _active = null;
}

/** Run async fn with progress indicator. Returns fn result. */
export async function withProgress<T>(msg: string, fn: () => Promise<T>): Promise<T> {
  startProgress(msg);
  try {
    const result = await fn();
    stopProgress(`✓ ${msg}`);
    return result;
  } catch (err) {
    stopProgress(`✗ ${msg}`);
    throw err;
  }
}
