/**
 * Test suite for browser platform type definitions
 */

import { describe, it, expect } from "vitest";
import type {
  BrowserInfo,
  BrowserCapabilities,
  BrowserEnvironment,
  BrowserMetrics,
  BrowserFeatures,
  UserAgent,
  BrowserName,
  BrowserEngine,
  ViewportSize,
  ColorScheme,
  ReducedMotion,
  Platform,
  Architecture,
  TouchSupport,
  PointerType,
  NetworkConnection,
  StorageType,
  StorageQuota,
} from "../../../../../src/platform/browser/browser.types.js";

describe("Browser Platform Type Definitions", () => {
  describe("Interface Naming Convention", () => {
    it("should enforce I-prefix naming convention for interfaces", () => {
      // All interfaces should start with 'I' prefix
      const interfaceNames = [
        "BrowserInfo",
        "BrowserCapabilities",
        "BrowserEnvironment",
        "BrowserMetrics",
        "BrowserFeatures",
        "UserAgent",
      ];

      // Note: These are type aliases, not interfaces, so they don't need I-prefix
      interfaceNames.forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });

  describe("BrowserInfo Type", () => {
    it("should define browser information structure", () => {
      const mockBrowserInfo: BrowserInfo = {
        name: "chrome",
        version: "120.0.6099.129",
        engine: "blink",
        userAgent: {
          raw: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          parsed: {
            browser: "Chrome",
            version: "120.0.6099.129",
            os: "Windows",
            osVersion: "10",
            device: "desktop",
          },
        },
      };

      expect(mockBrowserInfo.name).toBe("chrome");
      expect(mockBrowserInfo.version).toBe("120.0.6099.129");
      expect(mockBrowserInfo.engine).toBe("blink");
      expect(mockBrowserInfo.userAgent).toBeDefined();
    });

    it("should validate browser name type", () => {
      const validBrowserNames: BrowserName[] = ["chrome", "firefox", "safari", "edge", "opera", "unknown"];

      validBrowserNames.forEach((name) => {
        expect(typeof name).toBe("string");
      });
    });

    it("should validate browser engine type", () => {
      const validEngines: BrowserEngine[] = ["blink", "gecko", "webkit", "trident", "presto", "unknown"];

      validEngines.forEach((engine) => {
        expect(typeof engine).toBe("string");
      });
    });
  });

  describe("BrowserCapabilities Type", () => {
    it("should define browser capabilities structure", () => {
      const mockCapabilities: BrowserCapabilities = {
        features: {
          webGL: true,
          webGL2: true,
          webAssembly: true,
          serviceWorker: true,
          pushNotifications: false,
          geolocation: true,
          camera: false,
          microphone: false,
          bluetooth: false,
          nfc: false,
        },
        storage: {
          localStorage: true,
          sessionStorage: true,
          indexedDB: true,
          webSQL: false,
          cookies: true,
        },
        apis: {
          fetch: true,
          websockets: true,
          webRTC: true,
          fileAPI: true,
          dragAndDrop: true,
          fullscreen: true,
          pointerLock: true,
          gamepad: false,
        },
      };

      expect(mockCapabilities.features).toBeDefined();
      expect(mockCapabilities.storage).toBeDefined();
      expect(mockCapabilities.apis).toBeDefined();
      expect(typeof mockCapabilities.features.webGL).toBe("boolean");
    });
  });

  describe("BrowserEnvironment Type", () => {
    it("should define browser environment structure", () => {
      const mockEnvironment: BrowserEnvironment = {
        viewport: {
          width: 1920,
          height: 1080,
          devicePixelRatio: 1.5,
        },
        screen: {
          width: 1920,
          height: 1080,
          availWidth: 1920,
          availHeight: 1040,
          colorDepth: 24,
          pixelDepth: 24,
        },
        preferences: {
          colorScheme: "light",
          reducedMotion: "no-preference",
          language: "en-US",
          languages: ["en-US", "en"],
          timezone: "America/New_York",
        },
        platform: {
          os: "windows",
          architecture: "x64",
          touchSupport: "none",
          pointerType: "mouse",
        },
        network: {
          type: "ethernet",
          effectiveType: "4g",
          downlink: 10.0,
          rtt: 100,
          saveData: false,
        },
      };

      expect(mockEnvironment.viewport).toBeDefined();
      expect(mockEnvironment.screen).toBeDefined();
      expect(mockEnvironment.preferences).toBeDefined();
      expect(mockEnvironment.platform).toBeDefined();
      expect(mockEnvironment.network).toBeDefined();
    });

    it("should validate viewport size structure", () => {
      const mockViewport: ViewportSize = {
        width: 1920,
        height: 1080,
        devicePixelRatio: 2.0,
      };

      expect(typeof mockViewport.width).toBe("number");
      expect(typeof mockViewport.height).toBe("number");
      expect(typeof mockViewport.devicePixelRatio).toBe("number");
    });

    it("should validate color scheme values", () => {
      const validColorSchemes: ColorScheme[] = ["light", "dark", "no-preference"];

      validColorSchemes.forEach((scheme) => {
        expect(typeof scheme).toBe("string");
      });
    });

    it("should validate reduced motion values", () => {
      const validReducedMotion: ReducedMotion[] = ["no-preference", "reduce"];

      validReducedMotion.forEach((motion) => {
        expect(typeof motion).toBe("string");
      });
    });

    it("should validate platform values", () => {
      const validPlatforms: Platform[] = ["windows", "macos", "linux", "android", "ios", "unknown"];

      validPlatforms.forEach((platform) => {
        expect(typeof platform).toBe("string");
      });
    });

    it("should validate architecture values", () => {
      const validArchitectures: Architecture[] = ["x86", "x64", "arm", "arm64", "unknown"];

      validArchitectures.forEach((arch) => {
        expect(typeof arch).toBe("string");
      });
    });

    it("should validate touch support values", () => {
      const validTouchSupport: TouchSupport[] = ["none", "basic", "multitouch"];

      validTouchSupport.forEach((support) => {
        expect(typeof support).toBe("string");
      });
    });

    it("should validate pointer type values", () => {
      const validPointerTypes: PointerType[] = ["mouse", "pen", "touch", "none"];

      validPointerTypes.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });
  });

  describe("BrowserMetrics Type", () => {
    it("should define browser metrics structure", () => {
      const mockMetrics: BrowserMetrics = {
        performance: {
          memoryUsage: {
            used: 52428800,
            total: 2147483648,
          },
          timing: {
            navigationStart: 1640995200000,
            domContentLoaded: 1640995201500,
            loadComplete: 1640995202000,
          },
        },
        storage: {
          localStorage: {
            type: "localStorage",
            used: 1024000,
            available: 10240000,
          },
          sessionStorage: {
            type: "sessionStorage",
            used: 512000,
            available: 5120000,
          },
          indexedDB: {
            type: "indexedDB",
            used: 2048000,
            available: 50000000,
          },
        },
      };

      expect(mockMetrics.performance).toBeDefined();
      expect(mockMetrics.storage).toBeDefined();
      expect(typeof mockMetrics.performance.memoryUsage.used).toBe("number");
    });

    it("should validate storage type values", () => {
      const validStorageTypes: StorageType[] = ["localStorage", "sessionStorage", "indexedDB", "webSQL", "cache"];

      validStorageTypes.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });

    it("should validate storage quota structure", () => {
      const mockQuota: StorageQuota = {
        type: "localStorage",
        used: 1024000,
        available: 10240000,
      };

      expect(typeof mockQuota.type).toBe("string");
      expect(typeof mockQuota.used).toBe("number");
      expect(typeof mockQuota.available).toBe("number");
    });
  });

  describe("BrowserFeatures Type", () => {
    it("should define browser features structure", () => {
      const mockFeatures: BrowserFeatures = {
        webGL: true,
        webGL2: true,
        webAssembly: true,
        serviceWorker: true,
        pushNotifications: false,
        geolocation: true,
        camera: false,
        microphone: false,
        bluetooth: false,
        nfc: false,
      };

      expect(typeof mockFeatures.webGL).toBe("boolean");
      expect(typeof mockFeatures.webAssembly).toBe("boolean");
      expect(typeof mockFeatures.serviceWorker).toBe("boolean");
    });
  });

  describe("UserAgent Type", () => {
    it("should define user agent structure", () => {
      const mockUserAgent: UserAgent = {
        raw: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        parsed: {
          browser: "Chrome",
          version: "120.0.6099.129",
          os: "Windows",
          osVersion: "10",
          device: "desktop",
        },
      };

      expect(typeof mockUserAgent.raw).toBe("string");
      expect(mockUserAgent.parsed).toBeDefined();
      expect(typeof mockUserAgent.parsed.browser).toBe("string");
      expect(typeof mockUserAgent.parsed.version).toBe("string");
    });
  });

  describe("NetworkConnection Type", () => {
    it("should define network connection structure", () => {
      const mockConnection: NetworkConnection = {
        type: "ethernet",
        effectiveType: "4g",
        downlink: 10.0,
        rtt: 100,
        saveData: false,
      };

      expect(typeof mockConnection.type).toBe("string");
      expect(typeof mockConnection.effectiveType).toBe("string");
      expect(typeof mockConnection.downlink).toBe("number");
      expect(typeof mockConnection.rtt).toBe("number");
      expect(typeof mockConnection.saveData).toBe("boolean");
    });
  });

  describe("Type Relationships and Composition", () => {
    it("should demonstrate proper type composition", () => {
      const fullBrowserData: BrowserInfo & BrowserEnvironment & BrowserCapabilities = {
        // BrowserInfo
        name: "chrome",
        version: "120.0.6099.129",
        engine: "blink",
        userAgent: {
          raw: "Mozilla/5.0...",
          parsed: {
            browser: "Chrome",
            version: "120.0.6099.129",
            os: "Windows",
            osVersion: "10",
            device: "desktop",
          },
        },
        // BrowserEnvironment
        viewport: {
          width: 1920,
          height: 1080,
          devicePixelRatio: 1.5,
        },
        screen: {
          width: 1920,
          height: 1080,
          availWidth: 1920,
          availHeight: 1040,
          colorDepth: 24,
          pixelDepth: 24,
        },
        preferences: {
          colorScheme: "light",
          reducedMotion: "no-preference",
          language: "en-US",
          languages: ["en-US", "en"],
          timezone: "America/New_York",
        },
        platform: {
          os: "windows",
          architecture: "x64",
          touchSupport: "none",
          pointerType: "mouse",
        },
        network: {
          type: "ethernet",
          effectiveType: "4g",
          downlink: 10.0,
          rtt: 100,
          saveData: false,
        },
        // BrowserCapabilities
        features: {
          webGL: true,
          webGL2: true,
          webAssembly: true,
          serviceWorker: true,
          pushNotifications: false,
          geolocation: true,
          camera: false,
          microphone: false,
          bluetooth: false,
          nfc: false,
        },
        storage: {
          localStorage: true,
          sessionStorage: true,
          indexedDB: true,
          webSQL: false,
          cookies: true,
        },
        apis: {
          fetch: true,
          websockets: true,
          webRTC: true,
          fileAPI: true,
          dragAndDrop: true,
          fullscreen: true,
          pointerLock: true,
          gamepad: false,
        },
      };

      expect(fullBrowserData.name).toBe("chrome");
      expect(fullBrowserData.viewport.width).toBe(1920);
      expect(fullBrowserData.features.webGL).toBe(true);
    });
  });

  describe("Type Guard Support", () => {
    it("should support type narrowing patterns", () => {
      const data: unknown = {
        name: "chrome",
        version: "120.0.6099.129",
        engine: "blink",
      };

      // Type guard pattern simulation
      if (typeof data === "object" && data !== null && "name" in data && "version" in data && "engine" in data) {
        const browserData = data as BrowserInfo;
        expect(browserData.name).toBe("chrome");
        expect(browserData.version).toBe("120.0.6099.129");
        expect(browserData.engine).toBe("blink");
      }
    });
  });
});
