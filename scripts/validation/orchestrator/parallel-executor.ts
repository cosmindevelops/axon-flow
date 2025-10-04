/**
 * Simple concurrency controller for running validation tasks in parallel.
 */

export class ParallelExecutor {
  constructor(private readonly concurrency: number) {
    if (concurrency < 1) {
      throw new Error('Concurrency must be at least 1');
    }
  }

  async run<T>(tasks: readonly (() => Promise<T>)[]): Promise<T[]> {
    if (tasks.length === 0) {
      return [];
    }

    const results: T[] = new Array<T>(tasks.length);
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (cursor < tasks.length) {
        const index = cursor;
        cursor += 1;
        const task = tasks[index];
        results[index] = await task();
      }
    };

    const active = Math.min(this.concurrency, tasks.length);
    const workers: Promise<void>[] = [];
    for (let i = 0; i < active; i += 1) {
      workers.push(worker());
    }
    await Promise.all(workers);
    return results;
  }
}
