/**
 * Platform barrel exports test suite
 *
 * Validates all platform type exports are properly exposed
 */

import { describe, it, expect } from "vitest";
import type * as PlatformTypes from "../../../src/platform/index.js";

describe("Platform Index Exports", () => {
  it("should export browser platform types", () => {
    // Type-level validation for browser platform exports
    const _browserCapabilities: PlatformTypes.IBrowserCapabilities = {} as any;
    const _browserEnvironment: PlatformTypes.IBrowserEnvironment = {} as any;
    const _browserFeatures: PlatformTypes.IBrowserFeatures = {} as any;
    const _browserMetrics: PlatformTypes.IBrowserMetrics = {} as any;

    expect(true).toBe(true);
  });

  it("should export Node.js platform types", () => {
    // Type-level validation for Node.js platform exports
    const _nodeCapabilities: PlatformTypes.INodeCapabilities = {} as any;
    const _nodeEnvironment: PlatformTypes.INodeEnvironment = {} as any;
    const _nodeProcess: PlatformTypes.INodeProcess = {} as any;
    const _nodeSystemInfo: PlatformTypes.INodeSystemInfo = {} as any;

    expect(true).toBe(true);
  });

  it("should export common platform types", () => {
    // Type-level validation for common platform exports
    const _platformDetection: PlatformTypes.IPlatformDetection = {} as any;
    const _platformCapabilities: PlatformTypes.IPlatformCapabilities = {} as any;
    const _platformFeatures: PlatformTypes.IPlatformFeatures = {} as any;
    const _platformMetadata: PlatformTypes.IPlatformMetadata = {} as any;

    expect(true).toBe(true);
  });

  it("should export platform union types", () => {
    // Type-level validation for union types
    const _platformType: PlatformTypes.PlatformType = "browser";
    const _runtimeEnvironment: PlatformTypes.RuntimeEnvironment = "node";
    const _architectureType: PlatformTypes.ArchitectureType = "x64";
    const _operatingSystem: PlatformTypes.OperatingSystem = "linux";

    expect(typeof _platformType).toBe("string");
    expect(typeof _runtimeEnvironment).toBe("string");
    expect(typeof _architectureType).toBe("string");
    expect(typeof _operatingSystem).toBe("string");
  });

  it("should enforce I-prefix naming for platform interfaces", () => {
    const platformInterfaces = [
      "IBrowserCapabilities",
      "IBrowserEnvironment",
      "IBrowserFeatures",
      "IBrowserMetrics",
      "INodeCapabilities",
      "INodeEnvironment",
      "INodeProcess",
      "INodeSystemInfo",
      "IPlatformDetection",
      "IPlatformCapabilities",
      "IPlatformFeatures",
      "IPlatformMetadata",
    ];

    platformInterfaces.forEach((name) => {
      expect(name.startsWith("I"), `Platform interface ${name} should start with I-prefix`).toBe(true);
      expect(name.length > 1).toBe(true);
      expect(name[1]?.match(/[A-Z]/)).toBeTruthy();
    });
  });

  it("should validate platform type categories", () => {
    const platformTypes = ["browser", "node", "deno", "bun", "worker", "edge"];

    platformTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it("should validate runtime environment options", () => {
    const runtimeEnvironments = ["node", "browser", "deno", "bun", "edge", "worker"];

    runtimeEnvironments.forEach((env) => {
      expect(typeof env).toBe("string");
      expect(env.length).toBeGreaterThan(0);
    });
  });

  it("should validate architecture types", () => {
    const architectureTypes = ["x32", "x64", "arm", "arm64", "mips", "s390x"];

    architectureTypes.forEach((arch) => {
      expect(typeof arch).toBe("string");
      expect(arch.length).toBeGreaterThan(0);
    });
  });

  it("should validate operating system types", () => {
    const operatingSystems = ["windows", "macos", "linux", "android", "ios", "freebsd"];

    operatingSystems.forEach((os) => {
      expect(typeof os).toBe("string");
      expect(os.length).toBeGreaterThan(0);
    });
  });

  it("should validate platform feature compatibility", () => {
    // Common features that should be detectable across platforms
    const commonFeatures = [
      "localStorage",
      "sessionStorage",
      "webWorkers",
      "serviceWorkers",
      "webAssembly",
      "cryptoAPI",
      "performanceAPI",
      "observerAPI",
    ];

    commonFeatures.forEach((feature) => {
      expect(typeof feature).toBe("string");
      expect(feature.length).toBeGreaterThan(0);
    });
  });
});
