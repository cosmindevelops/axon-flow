/**
 * Test suite for utils management classes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Utils Management Classes", () => {
  describe("ValidationManager", () => {
    let validationManager: any;

    beforeEach(() => {
      // Mock ValidationManager class implementation
      class ValidationManager {
        private validators = new Map<string, (value: unknown) => boolean>();
        private validationResults = new Map<string, any>();
        private counter = 0;

        addValidator(name: string, validatorFn: (value: unknown) => boolean): void {
          this.validators.set(name, validatorFn);
        }

        removeValidator(name: string): boolean {
          return this.validators.delete(name);
        }

        validate(validatorName: string, value: unknown): boolean {
          const validator = this.validators.get(validatorName);
          if (!validator) {
            throw new Error(`Validator '${validatorName}' not found`);
          }

          const result = validator(value);
          this.validationResults.set(`${validatorName}-${this.counter++}`, {
            validator: validatorName,
            value: value,
            result: result,
            timestamp: new Date().toISOString(),
          });

          return result;
        }

        validateAll(value: unknown): Record<string, boolean> {
          const results: Record<string, boolean> = {};

          for (const [name, validator] of this.validators) {
            results[name] = validator(value);
          }

          return results;
        }

        getValidators(): string[] {
          return Array.from(this.validators.keys());
        }

        hasValidator(name: string): boolean {
          return this.validators.has(name);
        }

        clearValidators(): void {
          this.validators.clear();
        }

        getValidationHistory(): Array<any> {
          return Array.from(this.validationResults.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );
        }

        clearHistory(): void {
          this.validationResults.clear();
        }
      }

      validationManager = new ValidationManager();
    });

    it("should initialize with no validators", () => {
      expect(validationManager.getValidators().length).toBe(0);
    });

    it("should add and use validators", () => {
      const isString = (value: unknown): boolean => typeof value === "string";
      const isNumber = (value: unknown): boolean => typeof value === "number";

      validationManager.addValidator("string", isString);
      validationManager.addValidator("number", isNumber);

      expect(validationManager.hasValidator("string")).toBe(true);
      expect(validationManager.hasValidator("number")).toBe(true);
      expect(validationManager.getValidators()).toEqual(["string", "number"]);

      expect(validationManager.validate("string", "hello")).toBe(true);
      expect(validationManager.validate("string", 123)).toBe(false);
      expect(validationManager.validate("number", 42)).toBe(true);
      expect(validationManager.validate("number", "hello")).toBe(false);
    });

    it("should validate against all validators", () => {
      const isString = (value: unknown): boolean => typeof value === "string";
      const hasLength = (value: unknown): boolean => typeof value === "string" && value.length > 0;

      validationManager.addValidator("isString", isString);
      validationManager.addValidator("hasLength", hasLength);

      const results1 = validationManager.validateAll("hello");
      const results2 = validationManager.validateAll("");
      const results3 = validationManager.validateAll(123);

      expect(results1).toEqual({ isString: true, hasLength: true });
      expect(results2).toEqual({ isString: true, hasLength: false });
      expect(results3).toEqual({ isString: false, hasLength: false });
    });

    it("should remove validators", () => {
      const isString = (value: unknown): boolean => typeof value === "string";

      validationManager.addValidator("string", isString);
      expect(validationManager.hasValidator("string")).toBe(true);

      const removed = validationManager.removeValidator("string");
      expect(removed).toBe(true);
      expect(validationManager.hasValidator("string")).toBe(false);

      const removedAgain = validationManager.removeValidator("string");
      expect(removedAgain).toBe(false);
    });

    it("should throw error for unknown validator", () => {
      expect(() => {
        validationManager.validate("unknown", "value");
      }).toThrow("Validator 'unknown' not found");
    });

    it("should track validation history", () => {
      const isString = (value: unknown): boolean => typeof value === "string";
      validationManager.addValidator("string", isString);

      validationManager.validate("string", "hello");
      validationManager.validate("string", 123);

      const history = validationManager.getValidationHistory();
      expect(history.length).toBe(2);
      expect(history[0].validator).toBe("string");
      expect(history[0].result).toBe(true);
      expect(history[1].validator).toBe("string");
      expect(history[1].result).toBe(false);
    });

    it("should clear validators and history", () => {
      const isString = (value: unknown): boolean => typeof value === "string";
      validationManager.addValidator("string", isString);
      validationManager.validate("string", "test");

      expect(validationManager.getValidators().length).toBe(1);
      expect(validationManager.getValidationHistory().length).toBe(1);

      validationManager.clearValidators();
      validationManager.clearHistory();

      expect(validationManager.getValidators().length).toBe(0);
      expect(validationManager.getValidationHistory().length).toBe(0);
    });
  });

  describe("FormatterRegistry", () => {
    let formatterRegistry: any;

    beforeEach(() => {
      // Mock FormatterRegistry class implementation
      class FormatterRegistry {
        private formatters = new Map<string, (value: any, options?: any) => string>();

        register<T>(name: string, formatter: (value: T, options?: any) => string): void {
          this.formatters.set(name, formatter);
        }

        unregister(name: string): boolean {
          return this.formatters.delete(name);
        }

        format<T>(formatterName: string, value: T, options?: any): string {
          const formatter = this.formatters.get(formatterName);
          if (!formatter) {
            throw new Error(`Formatter '${formatterName}' not found`);
          }

          return formatter(value, options);
        }

        hasFormatter(name: string): boolean {
          return this.formatters.has(name);
        }

        getFormatters(): string[] {
          return Array.from(this.formatters.keys());
        }

        clear(): void {
          this.formatters.clear();
        }
      }

      formatterRegistry = new FormatterRegistry();
    });

    it("should register and use formatters", () => {
      const dateFormatter = (date: Date): string => date.toLocaleDateString();
      const currencyFormatter = (amount: number, options: { currency?: string } = {}): string => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: options.currency || "USD",
        }).format(amount);
      };

      formatterRegistry.register("date", dateFormatter);
      formatterRegistry.register("currency", currencyFormatter);

      expect(formatterRegistry.hasFormatter("date")).toBe(true);
      expect(formatterRegistry.hasFormatter("currency")).toBe(true);
      expect(formatterRegistry.getFormatters()).toEqual(["date", "currency"]);

      const testDate = new Date("2024-01-15");
      const testAmount = 1234.56;

      const formattedDate = formatterRegistry.format("date", testDate);
      const formattedCurrency = formatterRegistry.format("currency", testAmount);
      const formattedEur = formatterRegistry.format("currency", testAmount, { currency: "EUR" });

      expect(typeof formattedDate).toBe("string");
      expect(typeof formattedCurrency).toBe("string");
      expect(formattedCurrency).toContain("$");
      expect(typeof formattedEur).toBe("string");
    });

    it("should handle formatter options", () => {
      const numberFormatter = (num: number, options: { decimals?: number; prefix?: string } = {}): string => {
        const formatted = num.toFixed(options.decimals || 2);
        return options.prefix ? `${options.prefix}${formatted}` : formatted;
      };

      formatterRegistry.register("number", numberFormatter);

      const result1 = formatterRegistry.format("number", 123.456);
      const result2 = formatterRegistry.format("number", 123.456, { decimals: 4 });
      const result3 = formatterRegistry.format("number", 123.456, { prefix: "#" });

      expect(result1).toBe("123.46");
      expect(result2).toBe("123.4560");
      expect(result3).toBe("#123.46");
    });

    it("should throw error for unknown formatter", () => {
      expect(() => {
        formatterRegistry.format("unknown", "value");
      }).toThrow("Formatter 'unknown' not found");
    });
  });

  describe("ParserManager", () => {
    let parserManager: any;

    beforeEach(() => {
      // Mock ParserManager class implementation
      class ParserManager {
        private parsers = new Map<string, (input: string) => any>();
        private parseErrors = new Map<string, Error>();

        addParser<T>(name: string, parser: (input: string) => T): void {
          this.parsers.set(name, parser);
        }

        removeParser(name: string): boolean {
          return this.parsers.delete(name);
        }

        parse<T>(parserName: string, input: string): T {
          const parser = this.parsers.get(parserName);
          if (!parser) {
            throw new Error(`Parser '${parserName}' not found`);
          }

          try {
            const result = parser(input);
            this.parseErrors.delete(parserName);
            return result;
          } catch (error) {
            this.parseErrors.set(parserName, error as Error);
            throw error;
          }
        }

        safeParse<T>(parserName: string, input: string): { success: true; data: T } | { success: false; error: Error } {
          try {
            const data = this.parse<T>(parserName, input);
            return { success: true, data };
          } catch (error) {
            return { success: false, error: error as Error };
          }
        }

        hasParser(name: string): boolean {
          return this.parsers.has(name);
        }

        getParsers(): string[] {
          return Array.from(this.parsers.keys());
        }

        getLastError(parserName: string): Error | undefined {
          return this.parseErrors.get(parserName);
        }

        clearErrors(): void {
          this.parseErrors.clear();
        }
      }

      parserManager = new ParserManager();
    });

    it("should add and use parsers", () => {
      const jsonParser = (input: string): any => JSON.parse(input);
      const intParser = (input: string): number => {
        const parsed = parseInt(input, 10);
        if (isNaN(parsed)) {
          throw new Error("Invalid integer");
        }
        return parsed;
      };

      parserManager.addParser("json", jsonParser);
      parserManager.addParser("int", intParser);

      expect(parserManager.hasParser("json")).toBe(true);
      expect(parserManager.hasParser("int")).toBe(true);

      const jsonResult = parserManager.parse("json", '{"name": "test"}');
      const intResult = parserManager.parse("int", "42");

      expect(jsonResult).toEqual({ name: "test" });
      expect(intResult).toBe(42);
    });

    it("should handle parsing errors", () => {
      const jsonParser = (input: string): any => JSON.parse(input);
      parserManager.addParser("json", jsonParser);

      expect(() => {
        parserManager.parse("json", "invalid json");
      }).toThrow();

      const error = parserManager.getLastError("json");
      expect(error).toBeInstanceOf(Error);
    });

    it("should provide safe parsing", () => {
      const intParser = (input: string): number => {
        const parsed = parseInt(input, 10);
        if (isNaN(parsed)) {
          throw new Error("Invalid integer");
        }
        return parsed;
      };

      parserManager.addParser("int", intParser);

      const successResult = parserManager.safeParse("int", "42");
      const failureResult = parserManager.safeParse("int", "invalid");

      expect(successResult.success).toBe(true);
      if (successResult.success) {
        expect(successResult.data).toBe(42);
      }

      expect(failureResult.success).toBe(false);
      if (!failureResult.success) {
        expect(failureResult.error).toBeInstanceOf(Error);
      }
    });
  });

  describe("TypeGuardRegistry", () => {
    let typeGuardRegistry: any;

    beforeEach(() => {
      // Mock TypeGuardRegistry class implementation
      class TypeGuardRegistry {
        private guards = new Map<string, (value: unknown) => boolean>();

        register<T>(name: string, guard: (value: unknown) => value is T): void {
          this.guards.set(name, guard);
        }

        unregister(name: string): boolean {
          return this.guards.delete(name);
        }

        check<T>(guardName: string, value: unknown): value is T {
          const guard = this.guards.get(guardName);
          if (!guard) {
            throw new Error(`Type guard '${guardName}' not found`);
          }

          return guard(value);
        }

        checkAll(value: unknown): Record<string, boolean> {
          const results: Record<string, boolean> = {};

          for (const [name, guard] of this.guards) {
            results[name] = guard(value);
          }

          return results;
        }

        hasGuard(name: string): boolean {
          return this.guards.has(name);
        }

        getGuards(): string[] {
          return Array.from(this.guards.keys());
        }

        findMatchingGuards(value: unknown): string[] {
          const matches: string[] = [];

          for (const [name, guard] of this.guards) {
            if (guard(value)) {
              matches.push(name);
            }
          }

          return matches;
        }
      }

      typeGuardRegistry = new TypeGuardRegistry();
    });

    it("should register and use type guards", () => {
      const isString = (value: unknown): value is string => typeof value === "string";
      const isNumber = (value: unknown): value is number => typeof value === "number";
      const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

      typeGuardRegistry.register("string", isString);
      typeGuardRegistry.register("number", isNumber);
      typeGuardRegistry.register("array", isArray);

      expect(typeGuardRegistry.hasGuard("string")).toBe(true);
      expect(typeGuardRegistry.check("string", "hello")).toBe(true);
      expect(typeGuardRegistry.check("string", 123)).toBe(false);
      expect(typeGuardRegistry.check("number", 42)).toBe(true);
      expect(typeGuardRegistry.check("array", [])).toBe(true);
    });

    it("should find all matching guards", () => {
      const isString = (value: unknown): value is string => typeof value === "string";
      const isNonEmpty = (value: unknown): value is string => typeof value === "string" && value.length > 0;
      const isNumber = (value: unknown): value is number => typeof value === "number";

      typeGuardRegistry.register("string", isString);
      typeGuardRegistry.register("nonEmpty", isNonEmpty);
      typeGuardRegistry.register("number", isNumber);

      const matches1 = typeGuardRegistry.findMatchingGuards("hello");
      const matches2 = typeGuardRegistry.findMatchingGuards("");
      const matches3 = typeGuardRegistry.findMatchingGuards(42);

      expect(matches1).toEqual(["string", "nonEmpty"]);
      expect(matches2).toEqual(["string"]);
      expect(matches3).toEqual(["number"]);
    });
  });

  describe("UtilityChain", () => {
    it("should support method chaining for transformations", () => {
      // Mock UtilityChain class for functional programming patterns
      class UtilityChain<T> {
        constructor(private value: T) {}

        map<U>(fn: (value: T) => U): UtilityChain<U> {
          return new UtilityChain(fn(this.value));
        }

        filter(predicate: (value: T) => boolean): UtilityChain<T | null> {
          return new UtilityChain(predicate(this.value) ? this.value : null);
        }

        tap(fn: (value: T) => void): UtilityChain<T> {
          fn(this.value);
          return this;
        }

        get(): T {
          return this.value;
        }

        static of<T>(value: T): UtilityChain<T> {
          return new UtilityChain(value);
        }
      }

      const result = UtilityChain.of("  hello world  ")
        .map((s) => s.trim())
        .map((s) => s.toUpperCase())
        .map((s) => s.replace(" ", "_"))
        .get();

      expect(result).toBe("HELLO_WORLD");

      const filterResult = UtilityChain.of(42)
        .filter((n) => n > 0)
        .map((n) => n && n * 2)
        .get();

      expect(filterResult).toBe(84);
    });
  });

  describe("CacheManager", () => {
    it("should provide caching functionality", () => {
      // Mock CacheManager for memoization and caching
      class CacheManager<K, V> {
        private cache = new Map<K, V>();
        private timestamps = new Map<K, number>();
        private maxSize: number;
        private ttl: number;

        constructor(maxSize: number = 100, ttl: number = 60000) {
          this.maxSize = maxSize;
          this.ttl = ttl;
        }

        get(key: K): V | undefined {
          const timestamp = this.timestamps.get(key);
          if (timestamp && Date.now() - timestamp > this.ttl) {
            this.cache.delete(key);
            this.timestamps.delete(key);
            return undefined;
          }
          return this.cache.get(key);
        }

        set(key: K, value: V): void {
          if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.timestamps.delete(firstKey);
          }

          this.cache.set(key, value);
          this.timestamps.set(key, Date.now());
        }

        has(key: K): boolean {
          const value = this.get(key); // This will handle TTL checking
          return value !== undefined;
        }

        delete(key: K): boolean {
          this.timestamps.delete(key);
          return this.cache.delete(key);
        }

        clear(): void {
          this.cache.clear();
          this.timestamps.clear();
        }

        size(): number {
          // Clean expired entries first
          const now = Date.now();
          for (const [key, timestamp] of this.timestamps) {
            if (now - timestamp > this.ttl) {
              this.cache.delete(key);
              this.timestamps.delete(key);
            }
          }
          return this.cache.size;
        }
      }

      const cache = new CacheManager<string, number>(3, 1000);

      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);

      expect(cache.get("a")).toBe(1);
      expect(cache.get("b")).toBe(2);
      expect(cache.get("c")).toBe(3);
      expect(cache.size()).toBe(3);

      // Test size limit
      cache.set("d", 4);
      expect(cache.size()).toBe(3);
      expect(cache.has("a")).toBe(false); // Should be evicted

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });
});
