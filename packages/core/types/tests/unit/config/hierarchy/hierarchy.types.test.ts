/**
 * Configuration hierarchy types test suite
 *
 * Validates hierarchy type definitions and type inference
 */

import { describe, it, expect } from "vitest";
import type {
  IConfigHierarchy,
  IConfigLayer,
  IConfigMetadata,
  IConfigWarning,
  IConfigOverride,
  IOverrideCondition,
  IConfigTransform,
  IConfigResolutionContext,
  IConfigValue,
  IValueHistory,
  IConfigTemplate,
  ITemplateVariable,
  IConfigProfile,
  IProfileActivation,
  ConfigLayer,
  MergeStrategy,
} from "../../../../src/config/hierarchy/hierarchy.types.js";

describe("Config Hierarchy Types", () => {
  it("should enforce I-prefix naming convention for interfaces", () => {
    const interfaceNames = [
      "IConfigHierarchy",
      "IConfigLayer",
      "IConfigMetadata",
      "IConfigWarning",
      "IConfigOverride",
      "IOverrideCondition",
      "IConfigTransform",
      "IConfigResolutionContext",
      "IConfigValue",
      "IValueHistory",
      "IConfigTemplate",
      "ITemplateVariable",
      "IConfigProfile",
      "IProfileActivation",
    ];

    interfaceNames.forEach((name) => {
      expect(name.startsWith("I")).toBe(true);
      expect(name.length > 1).toBe(true);
      expect(name[1]?.match(/[A-Z]/)).toBeTruthy();
    });
  });

  it("should validate ConfigLayer union type", () => {
    const validLayers: ConfigLayer[] = ["defaults", "file", "environment", "commandline", "runtime"];

    validLayers.forEach((layer) => {
      const _layer: ConfigLayer = layer;
      expect(typeof _layer).toBe("string");
    });

    // Type-level validation
    const _defaultsLayer: ConfigLayer = "defaults";
    const _fileLayer: ConfigLayer = "file";
    const _envLayer: ConfigLayer = "environment";
    const _cmdLayer: ConfigLayer = "commandline";
    const _runtimeLayer: ConfigLayer = "runtime";

    expect(true).toBe(true); // If this compiles, types are valid
  });

  it("should validate MergeStrategy union type", () => {
    const validStrategies: MergeStrategy[] = ["replace", "merge", "append", "combine", "validate"];

    validStrategies.forEach((strategy) => {
      const _strategy: MergeStrategy = strategy;
      expect(typeof _strategy).toBe("string");
    });

    // Type-level validation
    const _replace: MergeStrategy = "replace";
    const _merge: MergeStrategy = "merge";
    const _append: MergeStrategy = "append";
    const _combine: MergeStrategy = "combine";
    const _validate: MergeStrategy = "validate";

    expect(true).toBe(true);
  });

  it("should validate IConfigHierarchy interface structure", () => {
    // Type-level validation
    const mockHierarchy: IConfigHierarchy<any> = {
      layers: [],
      mergeStrategy: "merge",
      computed: {},
      metadata: {
        loadedAt: "2024-01-01T00:00:00Z",
        version: "1.0.0",
        environment: "development",
      },
    };

    expect(Array.isArray(mockHierarchy.layers)).toBe(true);
    expect(typeof mockHierarchy.mergeStrategy).toBe("string");
    expect(typeof mockHierarchy.computed).toBe("object");
    expect(typeof mockHierarchy.metadata).toBe("object");
  });

  it("should validate IConfigLayer interface structure", () => {
    const mockLayer: IConfigLayer<any> = {
      type: "environment",
      name: "production",
      priority: 3,
      values: { key: "value" },
      active: true,
      source: "/etc/config.yaml",
    };

    expect(typeof mockLayer.type).toBe("string");
    expect(typeof mockLayer.name).toBe("string");
    expect(typeof mockLayer.priority).toBe("number");
    expect(typeof mockLayer.values).toBe("object");
    expect(typeof mockLayer.active).toBe("boolean");
    expect(typeof mockLayer.source).toBe("string");
  });

  it("should validate IConfigWarning interface structure", () => {
    const mockWarning: IConfigWarning = {
      level: "warning",
      message: "Deprecated configuration key",
      key: "old.key",
      source: "file",
    };

    expect(["info", "warning", "error"]).toContain(mockWarning.level);
    expect(typeof mockWarning.message).toBe("string");
    expect(typeof mockWarning.key).toBe("string");
    expect(typeof mockWarning.source).toBe("string");
  });

  it("should validate IConfigOverride interface structure", () => {
    const mockOverride: IConfigOverride = {
      path: "database.url",
      value: "new-db-url",
      source: "environment",
      priority: 5,
      conditional: {
        type: "environment",
        value: "production",
        operator: "equals",
      },
    };

    expect(typeof mockOverride.path).toBe("string");
    expect(mockOverride.value).toBeDefined();
    expect(typeof mockOverride.source).toBe("string");
    expect(typeof mockOverride.priority).toBe("number");
    expect(typeof mockOverride.conditional).toBe("object");
  });

  it("should validate generic type parameters", () => {
    // Test generic type handling
    interface TestConfig {
      database: { url: string; port: number };
      api: { key: string };
    }

    const typedHierarchy: IConfigHierarchy<TestConfig> = {
      layers: [],
      mergeStrategy: "merge",
      computed: {
        database: { url: "test-url", port: 5432 },
        api: { key: "test-key" },
      },
      metadata: {
        loadedAt: "2024-01-01T00:00:00Z",
        version: "1.0.0",
        environment: "test",
      },
    };

    expect(typedHierarchy.computed).toHaveProperty("database");
    expect(typedHierarchy.computed).toHaveProperty("api");
    expect(typeof typedHierarchy.computed.database.url).toBe("string");
    expect(typeof typedHierarchy.computed.database.port).toBe("number");
  });

  it("should validate template and profile types", () => {
    const mockTemplate: IConfigTemplate<any> = {
      name: "web-service",
      description: "Web service configuration template",
      template: { port: 3000 },
      variables: [
        {
          name: "port",
          type: "number",
          description: "Server port",
          default: 3000,
          required: true,
        },
      ],
    };

    const mockProfile: IConfigProfile<any> = {
      name: "production",
      description: "Production environment profile",
      values: { environment: "production" },
      extends: ["base"],
      activation: {
        type: "environment",
        condition: "NODE_ENV === 'production'",
      },
    };

    expect(typeof mockTemplate.name).toBe("string");
    expect(Array.isArray(mockTemplate.variables)).toBe(true);
    expect(typeof mockProfile.name).toBe("string");
    expect(Array.isArray(mockProfile.extends)).toBe(true);
  });
});
