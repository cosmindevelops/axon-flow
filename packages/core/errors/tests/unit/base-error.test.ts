/**
 * Unit tests for base error classes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BaseAxonError, ChainableError, AggregateAxonError, ErrorFactory } from "../../src/base/base-error.classes.js";
import { ErrorSeverity, ErrorCategory } from "../../src/base/base-error.types.js";
import type { IBaseAxonError } from "../../src/base/base-error.types.js";

describe("BaseAxonError", () => {
  describe("constructor", () => {
    it("should create error with default values", () => {
      const error = new BaseAxonError("Test error");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseAxonError);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.createdAt).toBeInstanceOf(Date);
    });

    it("should create error with custom code and context", () => {
      const error = new BaseAxonError("Custom error", "CUSTOM_CODE", {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SYSTEM,
        component: "TestComponent",
        operation: "testOperation",
      });

      expect(error.code).toBe("CUSTOM_CODE");
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.category).toBe(ErrorCategory.SYSTEM);
      expect(error.context.component).toBe("TestComponent");
      expect(error.context.operation).toBe("testOperation");
    });

    it("should detect environment correctly", () => {
      const error = new BaseAxonError("Test error");

      expect(error.context.environment).toBeDefined();
      expect(error.context.environment?.platform).toBe("node");
      expect(error.context.environment?.version).toBeDefined();
    });

    it("should capture stack trace", () => {
      const error = new BaseAxonError("Stack test");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("BaseAxonError");
      expect(error.stack).toContain("Stack test");
    });
  });

  describe("withContext", () => {
    it("should create new error with additional context", () => {
      const original = new BaseAxonError("Original", "CODE1", {
        component: "Comp1",
      });

      const modified = original.withContext({
        operation: "Op1",
        metadata: { key: "value" },
      });

      expect(modified).not.toBe(original);
      expect(modified.message).toBe(original.message);
      expect(modified.code).toBe(original.code);
      expect(modified.context.component).toBe("Comp1");
      expect(modified.context.operation).toBe("Op1");
      expect(modified.context.metadata).toEqual({ key: "value" });
    });
  });

  describe("withCause", () => {
    it("should create new error with cause", () => {
      const cause = new Error("Cause error");
      const error = new BaseAxonError("Main error");
      const withCause = error.withCause(cause);

      expect(withCause).not.toBe(error);
      expect(withCause.cause).toBe(cause);
    });

    it("should chain multiple causes", () => {
      const rootCause = new Error("Root cause");
      const middleCause = new BaseAxonError("Middle cause").withCause(rootCause);
      const topError = new BaseAxonError("Top error").withCause(middleCause);

      expect(topError.cause).toBe(middleCause);
      expect((topError.cause as IBaseAxonError).cause).toBe(rootCause);
    });
  });

  describe("getFullStack", () => {
    it("should return full stack trace with causes", () => {
      const cause1 = new Error("First cause");
      const cause2 = new BaseAxonError("Second cause").withCause(cause1);
      const error = new BaseAxonError("Main error").withCause(cause2);

      const fullStack = error.getFullStack();

      expect(fullStack).toContain("Main error");
      expect(fullStack).toContain("Caused by:");
      expect(fullStack).toContain("Second cause");
      expect(fullStack).toContain("First cause");
    });
  });

  describe("toJSON", () => {
    it("should serialize error to JSON format", () => {
      const error = new BaseAxonError("Test error", "TEST_CODE", {
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.VALIDATION,
        component: "TestComp",
      });

      const json = error.toJSON();

      expect(json.name).toBe("BaseAxonError");
      expect(json.message).toBe("Test error");
      expect(json.code).toBe("TEST_CODE");
      expect(json.severity).toBe(ErrorSeverity.WARNING);
      expect(json.category).toBe(ErrorCategory.VALIDATION);
      expect(json.context.component).toBe("TestComp");
      expect(json.version).toBe("1.0.0");
    });

    it("should serialize error with cause", () => {
      const cause = new BaseAxonError("Cause error", "CAUSE_CODE");
      const error = new BaseAxonError("Main error", "MAIN_CODE").withCause(cause);

      const json = error.toJSON();

      expect(json.cause).toBeDefined();
      expect(json.cause?.message).toBe("Cause error");
      expect(json.cause?.code).toBe("CAUSE_CODE");
    });
  });

  describe("toString", () => {
    it("should return formatted string representation", () => {
      const error = new BaseAxonError("Test error", "TEST_CODE", {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SECURITY,
      });

      const str = error.toString();

      expect(str).toContain("BaseAxonError");
      expect(str).toContain("TEST_CODE");
      expect(str).toContain("Test error");
      expect(str).toContain("critical");
      expect(str).toContain("security");
    });
  });
});

describe("ChainableError", () => {
  it("should support handler chaining", () => {
    const error = new ChainableError("Chainable error");
    const handler1 = {
      handle: vi.fn(),
      setNext: vi.fn(),
    };
    const handler2 = {
      handle: vi.fn(),
      setNext: vi.fn(),
    };

    error.chain(handler1).chain(handler2);

    expect(handler1.setNext).toHaveBeenCalledWith(handler2);
  });

  it("should process through handler chain", () => {
    const error = new ChainableError("Process error");
    const handler = {
      handle: vi.fn(),
      setNext: vi.fn(),
    };

    error.chain(handler);
    error.process();

    expect(handler.handle).toHaveBeenCalledWith(error);
  });
});

describe("AggregateAxonError", () => {
  it("should create aggregate with multiple errors", () => {
    const error1 = new Error("Error 1");
    const error2 = new BaseAxonError("Error 2");
    const aggregate = new AggregateAxonError("Multiple errors", [error1, error2]);

    expect(aggregate.getErrorCount()).toBe(2);
    expect(aggregate.hasErrors()).toBe(true);
    expect(aggregate.errors).toHaveLength(2);
    expect(aggregate.errors[0]).toBe(error1);
    expect(aggregate.errors[1]).toBe(error2);
  });

  it("should add errors dynamically", () => {
    const aggregate = new AggregateAxonError("Aggregate");

    expect(aggregate.hasErrors()).toBe(false);
    expect(aggregate.getErrorCount()).toBe(0);

    aggregate.addError(new Error("Added error"));

    expect(aggregate.hasErrors()).toBe(true);
    expect(aggregate.getErrorCount()).toBe(1);
  });

  it("should serialize aggregate with all errors", () => {
    const error1 = new BaseAxonError("Error 1", "CODE1");
    const error2 = new BaseAxonError("Error 2", "CODE2");
    const aggregate = new AggregateAxonError("Aggregate", [error1, error2]);

    const json = aggregate.toJSON();

    expect(json.errors).toBeDefined();
    expect(json.errors).toHaveLength(2);
    expect(json.errors![0]?.code).toBe("CODE1");
    expect(json.errors![1]?.code).toBe("CODE2");
  });

  it("should return readonly errors array", () => {
    const aggregate = new AggregateAxonError("Test");
    const errors = aggregate.errors;

    expect(() => {
      (errors as any).push(new Error("Should not work"));
    }).toThrow();
  });
});

describe("ErrorFactory", () => {
  let factory: ErrorFactory;

  beforeEach(() => {
    factory = new ErrorFactory(ErrorSeverity.WARNING, ErrorCategory.APPLICATION);
  });

  it("should create error with default values", () => {
    const error = factory.create("Factory error", "FACTORY_CODE");

    expect(error.message).toBe("Factory error");
    expect(error.code).toBe("FACTORY_CODE");
    expect(error.severity).toBe(ErrorSeverity.WARNING);
    expect(error.category).toBe(ErrorCategory.APPLICATION);
  });

  it("should create error from existing error", () => {
    const original = new Error("Original error");
    const wrapped = factory.createFromError(original, "WRAPPED_CODE");

    expect(wrapped.message).toBe("Original error");
    expect(wrapped.code).toBe("WRAPPED_CODE");
    expect(wrapped.cause).toBe(original);
    expect(wrapped.context.stackTrace).toBe(original.stack);
  });

  it("should create aggregate error", () => {
    const error1 = new Error("Error 1");
    const error2 = new BaseAxonError("Error 2");
    const aggregate = factory.createAggregate("Multiple failures", [error1, error2]);

    expect(aggregate).toBeInstanceOf(AggregateAxonError);
    expect(aggregate.getErrorCount()).toBe(2);
    expect(aggregate.severity).toBe(ErrorSeverity.WARNING);
    expect(aggregate.category).toBe(ErrorCategory.APPLICATION);
  });

  it("should override defaults with options", () => {
    const error = factory.create("Test", "CODE", {
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.SECURITY,
    });

    expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    expect(error.category).toBe(ErrorCategory.SECURITY);
  });
});
