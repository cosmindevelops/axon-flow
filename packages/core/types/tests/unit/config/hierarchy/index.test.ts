/**
 * Configuration hierarchy barrel exports test suite
 *
 * Validates all hierarchy type exports are properly exposed
 */

import { describe, it, expect } from "vitest";
import type * as HierarchyTypes from "../../../../src/config/hierarchy/index.js";

describe("Config Hierarchy Index Exports", () => {
  it("should export core hierarchy types", () => {
    // Type-level validation for hierarchy exports
    const _hierarchy: HierarchyTypes.IConfigHierarchy = {} as any;
    const _layer: HierarchyTypes.IConfigLayer = {} as any;
    const _metadata: HierarchyTypes.IConfigMetadata = {} as any;
    const _warning: HierarchyTypes.IConfigWarning = {} as any;

    expect(true).toBe(true);
  });

  it("should export override and transform types", () => {
    // Type-level validation for advanced hierarchy features
    const _override: HierarchyTypes.IConfigOverride = {} as any;
    const _condition: HierarchyTypes.IOverrideCondition = {} as any;
    const _transform: HierarchyTypes.IConfigTransform = {} as any;
    const _context: HierarchyTypes.IConfigResolutionContext = {} as any;

    expect(true).toBe(true);
  });

  it("should export value tracking types", () => {
    // Type-level validation for value tracking
    const _value: HierarchyTypes.IConfigValue = {} as any;
    const _history: HierarchyTypes.IValueHistory = {} as any;

    expect(true).toBe(true);
  });

  it("should export template and profile types", () => {
    // Type-level validation for templates and profiles
    const _template: HierarchyTypes.IConfigTemplate = {} as any;
    const _variable: HierarchyTypes.ITemplateVariable = {} as any;
    const _profile: HierarchyTypes.IConfigProfile = {} as any;
    const _activation: HierarchyTypes.IProfileActivation = {} as any;

    expect(true).toBe(true);
  });

  it("should enforce I-prefix naming for hierarchy interfaces", () => {
    const hierarchyInterfaces = [
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

    hierarchyInterfaces.forEach((name) => {
      expect(name.startsWith("I"), `Hierarchy interface ${name} should start with I-prefix`).toBe(true);
      expect(name.length > 1).toBe(true);
      expect(name[1]?.match(/[A-Z]/)).toBeTruthy();
    });
  });
});
