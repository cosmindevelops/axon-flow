/**
 * Minimal tracer abstraction for validation instrumentation.
 */

export interface Span {
  readonly name: string;
  readonly startTime: number;
  end(error?: Error): void;
}

class TestSpan implements Span {
  readonly startTime = Date.now();
  private ended = false;

  constructor(public readonly name: string) {}

  end(_error?: Error): void {
    if (this.ended) {
      return;
    }
    this.ended = true;
  }
}

export class TestTracer {
  startSpan(name: string): Span {
    return new TestSpan(name);
  }
}

export function createTestTracer(): TestTracer {
  return new TestTracer();
}
