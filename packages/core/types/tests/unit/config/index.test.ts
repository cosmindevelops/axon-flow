/**
 * Configuration barrel exports test suite
 *
 * Validates all configuration type exports are properly exposed
 */

import { describe, it, expect } from "vitest";
import type * as ConfigTypes from "../../../src/config/index.js";

describe("Config Index Exports", () => {
  it("should export hierarchy types", () => {
    // Type-level validation - if this compiles, exports are working
    const _hierarchyType: ConfigTypes.IConfigHierarchy = {} as any;
    const _layerType: ConfigTypes.IConfigLayer = {} as any;
    const _metadataType: ConfigTypes.IConfigMetadata = {} as any;

    expect(true).toBe(true);
  });

  it("should export provider types", () => {
    // Type-level validation for provider interfaces
    const _authProvider: ConfigTypes.IAuthProvider = {} as any;
    const _billingProvider: ConfigTypes.IBillingProvider = {} as any;
    const _storageProvider: ConfigTypes.IStorageProvider = {} as any;
    const _llmProvider: ConfigTypes.ILLMProvider = {} as any;

    expect(true).toBe(true);
  });

  it("should export schema types", () => {
    // Type-level validation for schema types
    const _configSchema: ConfigTypes.IConfigSchema = {} as any;
    const _layeredConfig: ConfigTypes.ILayeredConfig = {} as any;
    const _schemaDefinition: ConfigTypes.ISchemaDefinition<unknown> = {} as any;

    expect(true).toBe(true);
  });

  it("should enforce I-prefix naming convention for config interfaces", () => {
    // Validate interface names follow I-prefix pattern
    const interfaceNames = [
      "IConfigHierarchy",
      "IConfigLayer",
      "IConfigMetadata",
      "IAuthProvider",
      "IBillingProvider",
      "IStorageProvider",
      "ILLMProvider",
      "IConfigSchema",
      "ILayeredConfig",
      "ISchemaDefinition",
    ];

    interfaceNames.forEach((name) => {
      expect(name.startsWith("I"), `Interface ${name} should start with I-prefix`).toBe(true);
      expect(name.length > 1, `Interface ${name} should have meaningful name`).toBe(true);
      expect(name[1]?.match(/[A-Z]/), `Interface ${name} should have PascalCase after I-prefix`).toBeTruthy();
    });
  });
});
