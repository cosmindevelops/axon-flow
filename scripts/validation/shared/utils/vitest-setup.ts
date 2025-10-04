/** Global Vitest setup for validation suite. */
import { expect } from 'vitest';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T> {
    toBeValidIU(): void;
    toBeValidCriteria(): void;
  }
}

expect.extend({
  toBeValidIU(received: number) {
    const pass = Number.isInteger(received) && received >= 1 && received <= 35;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid IU identifier`
          : `Expected ${received} to be in range 1-35`,
    };
  },
  toBeValidCriteria(received: number) {
    const pass = Number.isInteger(received) && received >= 1 && received <= 20;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid criteria identifier`
          : `Expected ${received} to be in range 1-20`,
    };
  },
});
