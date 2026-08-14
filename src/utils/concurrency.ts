/**
 * Shared concurrency utility for running async tasks with a limit.
 */

export async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number = 3,
): Promise<T[]> {
  if (tasks.length === 0) return [];
  const safeConcurrency = Math.max(1, Math.floor(concurrency));
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from(
    { length: Math.min(safeConcurrency, tasks.length) },
    () => runNext(),
  );

  await Promise.all(workers);
  return results;
}
