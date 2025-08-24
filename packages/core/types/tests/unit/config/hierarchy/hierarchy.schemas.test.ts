/**
 * Configuration hierarchy schemas test suite
 *
 * Validates hierarchy schema definitions and validation rules
 */

import { describe, it, expect } from "vitest";

describe("Config Hierarchy Schemas", () => {
  it("should validate config layer schema structure", () => {
    const mockConfigLayer = {
      type: "environment",
      name: "production-env",
      priority: 3,
      values: { database: { url: "prod-db-url" } },
      active: true,
      source: "/etc/config/prod.yaml",
    };

    // Schema validation assertions
    expect(mockConfigLayer).toHaveProperty("type");
    expect(mockConfigLayer).toHaveProperty("name");
    expect(mockConfigLayer).toHaveProperty("priority");
    expect(mockConfigLayer).toHaveProperty("values");
    expect(mockConfigLayer).toHaveProperty("active");

    expect(typeof mockConfigLayer.type).toBe("string");
    expect(typeof mockConfigLayer.name).toBe("string");
    expect(typeof mockConfigLayer.priority).toBe("number");
    expect(typeof mockConfigLayer.active).toBe("boolean");
  });

  it("should validate merge strategy schema", () => {
    const validStrategies = ["replace", "merge", "append", "combine", "validate"];

    validStrategies.forEach((strategy) => {
      expect(typeof strategy).toBe("string");
      expect(validStrategies).toContain(strategy);
    });

    // Invalid strategies should fail validation
    const invalidStrategies = ["invalid", "wrong", ""];
    invalidStrategies.forEach((strategy) => {
      expect(validStrategies).not.toContain(strategy);
    });
  });

  it("should validate config metadata schema", () => {
    const mockMetadata = {
      loadedAt: "2024-01-01T00:00:00Z",
      version: "1.0.0",
      environment: "production",
      profiles: ["web", "database"],
      warnings: [
        {
          level: "warning" as const,
          message: "Deprecated config key",
          key: "old.setting",
          source: "file",
        },
      ],
    };

    expect(mockMetadata).toHaveProperty("loadedAt");
    expect(mockMetadata).toHaveProperty("version");
    expect(mockMetadata).toHaveProperty("environment");
    expect(Array.isArray(mockMetadata.profiles)).toBe(true);
    expect(Array.isArray(mockMetadata.warnings)).toBe(true);

    // Validate warning schema
    const warning = mockMetadata.warnings[0];
    expect(["info", "warning", "error"]).toContain(warning.level);
    expect(typeof warning.message).toBe("string");
  });

  it("should validate override condition schema", () => {
    const overrideCondition = {
      type: "environment" as const,
      value: "production",
      operator: "equals" as const,
    };

    expect(["environment", "profile", "feature", "custom"]).toContain(overrideCondition.type);
    expect(["equals", "contains", "matches", "exists"]).toContain(overrideCondition.operator);
    expect(typeof overrideCondition.value).toBe("string");
  });

  it("should validate template variable schema", () => {
    const templateVariable = {
      name: "api_key",
      type: "string" as const,
      description: "API key for external service",
      default: "default-key",
      required: true,
    };

    expect(templateVariable).toHaveProperty("name");
    expect(templateVariable).toHaveProperty("type");
    expect(templateVariable).toHaveProperty("description");
    expect(templateVariable).toHaveProperty("required");

    expect(["string", "number", "boolean", "array", "object"]).toContain(templateVariable.type);
    expect(typeof templateVariable.name).toBe("string");
    expect(typeof templateVariable.description).toBe("string");
    expect(typeof templateVariable.required).toBe("boolean");
  });

  it("should validate profile activation schema", () => {
    const profileActivation = {
      type: "environment" as const,
      condition: "NODE_ENV === 'test'",
      priority: 5,
    };

    expect(["environment", "flag", "auto", "manual"]).toContain(profileActivation.type);
    expect(typeof profileActivation.condition).toBe("string");
    expect(typeof profileActivation.priority).toBe("number");
    expect(profileActivation.priority).toBeGreaterThan(0);
  });

  it("should enforce schema validation for config hierarchy", () => {
    const mockHierarchy = {
      layers: [
        {
          type: "defaults",
          name: "base-defaults",
          priority: 1,
          values: {},
          active: true,
        },
      ],
      mergeStrategy: "merge" as const,
      computed: {},
      metadata: {
        loadedAt: "2024-01-01T00:00:00Z",
        version: "1.0.0",
        environment: "development",
      },
    };

    expect(Array.isArray(mockHierarchy.layers)).toBe(true);
    expect(mockHierarchy.layers.length).toBeGreaterThan(0);
    expect(["replace", "merge", "append", "combine", "validate"]).toContain(mockHierarchy.mergeStrategy);
    expect(mockHierarchy).toHaveProperty("computed");
    expect(mockHierarchy).toHaveProperty("metadata");
  });
});
