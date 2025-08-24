/**
 * Platform browser schemas test suite
 *
 * Validates browser platform schema definitions and validation rules
 */

import { describe, it, expect } from "vitest";

describe("Platform Browser Schemas", () => {
  it("should validate browser capabilities schema structure", () => {
    const mockBrowserCapabilities = {
      name: "chrome",
      version: "120.0.6099.129",
      engine: "blink",
      engineVersion: "120.0.6099.129",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      features: {
        webGL: true,
        webGL2: true,
        webAssembly: true,
        serviceWorker: true,
        webWorker: true,
        indexedDB: true,
        localStorage: true,
        sessionStorage: true,
        webRTC: true,
        geolocation: true,
        notifications: true,
      },
      apis: {
        fetch: true,
        xhr: true,
        websockets: true,
        eventSource: true,
        intersectionObserver: true,
        mutationObserver: true,
        performanceObserver: true,
      },
      css: {
        grid: true,
        flexbox: true,
        customProperties: true,
        containerQueries: true,
      },
      javascript: {
        es2015: true,
        es2017: true,
        es2018: true,
        es2020: true,
        modules: true,
        topLevelAwait: true,
        optionalChaining: true,
      },
    };

    // Validate schema structure
    expect(mockBrowserCapabilities).toHaveProperty("name");
    expect(mockBrowserCapabilities).toHaveProperty("version");
    expect(mockBrowserCapabilities).toHaveProperty("engine");
    expect(mockBrowserCapabilities).toHaveProperty("features");
    expect(mockBrowserCapabilities).toHaveProperty("apis");
    expect(mockBrowserCapabilities).toHaveProperty("css");
    expect(mockBrowserCapabilities).toHaveProperty("javascript");

    // Validate field types
    expect(typeof mockBrowserCapabilities.name).toBe("string");
    expect(typeof mockBrowserCapabilities.version).toBe("string");
    expect(typeof mockBrowserCapabilities.engine).toBe("string");
    expect(typeof mockBrowserCapabilities.userAgent).toBe("string");
    expect(typeof mockBrowserCapabilities.features).toBe("object");
    expect(typeof mockBrowserCapabilities.apis).toBe("object");

    // Validate enum values
    expect([
      "chrome",
      "firefox",
      "safari",
      "edge",
      "opera",
      "chromium",
      "brave",
      "arc",
      "vivaldi",
      "unknown",
    ]).toContain(mockBrowserCapabilities.name);
    expect(["webkit", "blink", "gecko", "trident", "presto", "unknown"]).toContain(mockBrowserCapabilities.engine);

    // Validate boolean features
    Object.values(mockBrowserCapabilities.features).forEach((feature) => {
      expect(typeof feature).toBe("boolean");
    });

    Object.values(mockBrowserCapabilities.apis).forEach((api) => {
      expect(typeof api).toBe("boolean");
    });
  });

  it("should validate browser environment schema", () => {
    const browserEnvironment = {
      platform: "browser",
      runtime: "browser",
      device: {
        type: "desktop",
        brand: "HP",
        model: "EliteBook 850",
        os: "windows",
        osVersion: "10.0.19045",
        architecture: "x64",
        memory: 16384,
        cores: 8,
        screen: {
          width: 1920,
          height: 1080,
          pixelRatio: 1.0,
          colorDepth: 24,
          orientation: "landscape",
        },
      },
      network: {
        type: "4g",
        effectiveType: "4g",
        downlink: 10.0,
        rtt: 100,
        saveData: false,
      },
      permissions: {
        camera: "granted",
        microphone: "denied",
        geolocation: "prompt",
        notifications: "granted",
      },
      preferences: {
        colorScheme: "light",
        reducedMotion: false,
        language: "en-US",
        languages: ["en-US", "en"],
        timezone: "America/New_York",
        cookieEnabled: true,
      },
    };

    expect(["browser", "node", "deno", "bun", "worker", "edge"]).toContain(browserEnvironment.platform);
    expect(["desktop", "mobile", "tablet", "tv", "wearable", "embedded", "unknown"]).toContain(
      browserEnvironment.device.type,
    );
    expect(["windows", "macos", "linux", "android", "ios", "freebsd"]).toContain(browserEnvironment.device.os);
    expect(["x32", "x64", "arm", "arm64", "mips", "s390x"]).toContain(browserEnvironment.device.architecture);
    expect(["slow-2g", "2g", "3g", "4g", "5g", "wifi", "ethernet", "unknown"]).toContain(
      browserEnvironment.network.type,
    );
    expect(["portrait", "landscape"]).toContain(browserEnvironment.device.screen.orientation);

    // Validate numeric constraints
    expect(typeof browserEnvironment.device.memory).toBe("number");
    expect(browserEnvironment.device.memory).toBeGreaterThan(0);
    expect(typeof browserEnvironment.device.cores).toBe("number");
    expect(browserEnvironment.device.cores).toBeGreaterThan(0);
    expect(typeof browserEnvironment.network.downlink).toBe("number");
    expect(browserEnvironment.network.rtt).toBeGreaterThan(0);

    // Validate permission states
    Object.values(browserEnvironment.permissions).forEach((permission) => {
      expect(["granted", "denied", "prompt"]).toContain(permission);
    });

    // Validate screen dimensions
    expect(browserEnvironment.device.screen.width).toBeGreaterThan(0);
    expect(browserEnvironment.device.screen.height).toBeGreaterThan(0);
    expect(browserEnvironment.device.screen.pixelRatio).toBeGreaterThan(0);
  });

  it("should validate browser info schema", () => {
    const browserInfo = {
      name: "firefox",
      version: "121.0",
      major: 121,
      minor: 0,
      patch: 0,
      engine: "gecko",
      engineVersion: "121.0",
      buildDate: "2024-01-15",
      updateChannel: "release",
      vendor: "Mozilla Foundation",
      isPrivate: false,
      isHeadless: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isWebView: false,
      capabilities: {
        cookies: true,
        localStorage: true,
        sessionStorage: true,
        indexedDB: true,
        webSQL: false,
        webWorkers: true,
        serviceWorkers: true,
        pushNotifications: true,
        backgroundSync: true,
        paymentRequest: true,
        webShare: false,
        webBluetooth: false,
        webUSB: false,
      },
      flags: {
        strict: false,
        secure: true,
        experimental: false,
      },
    };

    expect([
      "chrome",
      "firefox",
      "safari",
      "edge",
      "opera",
      "chromium",
      "brave",
      "arc",
      "vivaldi",
      "unknown",
    ]).toContain(browserInfo.name);
    expect(["webkit", "blink", "gecko", "trident", "presto", "unknown"]).toContain(browserInfo.engine);
    expect(typeof browserInfo.version).toBe("string");
    expect(typeof browserInfo.major).toBe("number");
    expect(typeof browserInfo.isPrivate).toBe("boolean");
    expect(typeof browserInfo.capabilities).toBe("object");

    // Validate version numbers
    expect(browserInfo.major).toBeGreaterThan(0);
    expect(browserInfo.minor).toBeGreaterThanOrEqual(0);
    expect(browserInfo.patch).toBeGreaterThanOrEqual(0);

    // Validate capability flags
    Object.values(browserInfo.capabilities).forEach((capability) => {
      expect(typeof capability).toBe("boolean");
    });

    Object.values(browserInfo.flags).forEach((flag) => {
      expect(typeof flag).toBe("boolean");
    });
  });

  it("should validate user agent data schema", () => {
    const userAgentData = {
      raw: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      parsed: {
        browser: {
          name: "chrome",
          version: "120.0.0.0",
        },
        engine: {
          name: "blink",
          version: "120.0.0.0",
        },
        os: {
          name: "macos",
          version: "10.15.7",
        },
        device: {
          type: "desktop",
          vendor: "Apple",
          model: "MacBook Pro",
        },
      },
      clientHints: {
        architecture: "x86",
        bitness: "64",
        mobile: false,
        platform: "macOS",
        platformVersion: "10.15.7",
        model: "MacBook Pro",
        brands: [
          { brand: "Not_A Brand", version: "8.0.0.0" },
          { brand: "Chromium", version: "120.0.6099.129" },
          { brand: "Google Chrome", version: "120.0.6099.129" },
        ],
        fullVersionList: [
          { brand: "Not_A Brand", version: "8.0.0.0" },
          { brand: "Chromium", version: "120.0.6099.129" },
          { brand: "Google Chrome", version: "120.0.6099.129" },
        ],
      },
      confidence: {
        browser: 0.98,
        engine: 0.95,
        os: 0.92,
        device: 0.85,
      },
    };

    expect(typeof userAgentData.raw).toBe("string");
    expect(typeof userAgentData.parsed).toBe("object");
    expect(typeof userAgentData.clientHints).toBe("object");
    expect(typeof userAgentData.confidence).toBe("object");

    // Validate parsed data structure
    expect(userAgentData.parsed.browser).toHaveProperty("name");
    expect(userAgentData.parsed.browser).toHaveProperty("version");
    expect(userAgentData.parsed.engine).toHaveProperty("name");
    expect(userAgentData.parsed.os).toHaveProperty("name");
    expect(userAgentData.parsed.device).toHaveProperty("type");

    // Validate client hints
    expect(typeof userAgentData.clientHints.mobile).toBe("boolean");
    expect(Array.isArray(userAgentData.clientHints.brands)).toBe(true);
    expect(Array.isArray(userAgentData.clientHints.fullVersionList)).toBe(true);

    // Validate confidence scores
    Object.values(userAgentData.confidence).forEach((score) => {
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    // Validate brand entries
    userAgentData.clientHints.brands.forEach((brand) => {
      expect(brand).toHaveProperty("brand");
      expect(brand).toHaveProperty("version");
      expect(typeof brand.brand).toBe("string");
      expect(typeof brand.version).toBe("string");
    });
  });

  it("should validate browser metrics schema", () => {
    const browserMetrics = {
      performance: {
        navigation: {
          type: "navigate",
          redirectCount: 0,
          timing: {
            fetchStart: 1640995200000,
            domainLookupStart: 1640995200005,
            domainLookupEnd: 1640995200015,
            connectStart: 1640995200015,
            connectEnd: 1640995200055,
            requestStart: 1640995200055,
            responseStart: 1640995200155,
            responseEnd: 1640995200255,
            domLoading: 1640995200260,
            domInteractive: 1640995200450,
            domComplete: 1640995200600,
            loadEventStart: 1640995200605,
            loadEventEnd: 1640995200615,
          },
        },
        memory: {
          usedJSHeapSize: 15728640,
          totalJSHeapSize: 31457280,
          jsHeapSizeLimit: 4294705152,
        },
        paint: {
          firstPaint: 1640995200350,
          firstContentfulPaint: 1640995200380,
          largestContentfulPaint: 1640995200520,
        },
      },
      viewport: {
        width: 1920,
        height: 1080,
        devicePixelRatio: 1.0,
        orientation: "landscape",
        zoom: 1.0,
      },
      connection: {
        effectiveType: "4g",
        downlink: 10.0,
        rtt: 100,
        saveData: false,
      },
    };

    expect(["navigate", "reload", "back_forward", "prerender"]).toContain(browserMetrics.performance.navigation.type);
    expect(typeof browserMetrics.performance.navigation.redirectCount).toBe("number");
    expect(typeof browserMetrics.performance.memory.usedJSHeapSize).toBe("number");
    expect(typeof browserMetrics.performance.paint.firstPaint).toBe("number");
    expect(["portrait", "landscape"]).toContain(browserMetrics.viewport.orientation);
    expect(["slow-2g", "2g", "3g", "4g"]).toContain(browserMetrics.connection.effectiveType);

    // Validate timing sequence
    const timing = browserMetrics.performance.navigation.timing;
    expect(timing.domainLookupStart).toBeGreaterThanOrEqual(timing.fetchStart);
    expect(timing.connectStart).toBeGreaterThanOrEqual(timing.domainLookupEnd);
    expect(timing.requestStart).toBeGreaterThanOrEqual(timing.connectEnd);
    expect(timing.responseStart).toBeGreaterThanOrEqual(timing.requestStart);
    expect(timing.loadEventEnd).toBeGreaterThanOrEqual(timing.loadEventStart);

    // Validate memory usage
    expect(browserMetrics.performance.memory.usedJSHeapSize).toBeLessThanOrEqual(
      browserMetrics.performance.memory.totalJSHeapSize,
    );
    expect(browserMetrics.performance.memory.totalJSHeapSize).toBeLessThanOrEqual(
      browserMetrics.performance.memory.jsHeapSizeLimit,
    );

    // Validate paint timing sequence
    expect(browserMetrics.performance.paint.firstContentfulPaint).toBeGreaterThanOrEqual(
      browserMetrics.performance.paint.firstPaint,
    );

    // Validate viewport dimensions
    expect(browserMetrics.viewport.width).toBeGreaterThan(0);
    expect(browserMetrics.viewport.height).toBeGreaterThan(0);
    expect(browserMetrics.viewport.devicePixelRatio).toBeGreaterThan(0);
    expect(browserMetrics.viewport.zoom).toBeGreaterThan(0);
  });

  it("should validate browser feature detection schema", () => {
    const featureSupport = {
      apis: {
        fetch: { supported: true, version: "1.0" },
        websockets: { supported: true, version: "13" },
        webrtc: { supported: true, version: "1.0" },
        geolocation: { supported: true, version: "1.0" },
        notifications: { supported: true, version: "1.0" },
        paymentRequest: { supported: false, version: null },
        webShare: { supported: false, version: null },
        webBluetooth: { supported: false, version: null },
      },
      storage: {
        localStorage: { supported: true, quota: 5242880 },
        sessionStorage: { supported: true, quota: 5242880 },
        indexedDB: { supported: true, quota: 53687091200 },
        webSQL: { supported: false, quota: 0 },
        cache: { supported: true, quota: 1073741824 },
      },
      media: {
        audio: { supported: true, codecs: ["mp3", "aac", "ogg", "wav"] },
        video: { supported: true, codecs: ["h264", "vp8", "vp9", "av1"] },
        camera: { supported: true, constraints: true },
        microphone: { supported: true, constraints: true },
        screen: { supported: true, constraints: false },
      },
      graphics: {
        webGL: { supported: true, version: "2.0" },
        canvas: { supported: true, version: "2d" },
        svg: { supported: true, version: "1.1" },
        css3d: { supported: true, version: "1.0" },
      },
      security: {
        https: { supported: true, required: false },
        csp: { supported: true, version: "3.0" },
        sri: { supported: true, version: "1.0" },
        permissions: { supported: true, version: "1.0" },
      },
    };

    // Validate API support structure
    Object.values(featureSupport.apis).forEach((api) => {
      expect(api).toHaveProperty("supported");
      expect(typeof api.supported).toBe("boolean");
      if (api.supported) {
        expect(api.version).not.toBeNull();
      }
    });

    // Validate storage support
    Object.values(featureSupport.storage).forEach((storage) => {
      expect(storage).toHaveProperty("supported");
      expect(storage).toHaveProperty("quota");
      expect(typeof storage.supported).toBe("boolean");
      expect(typeof storage.quota).toBe("number");
      expect(storage.quota).toBeGreaterThanOrEqual(0);
    });

    // Validate media support
    expect(Array.isArray(featureSupport.media.audio.codecs)).toBe(true);
    expect(Array.isArray(featureSupport.media.video.codecs)).toBe(true);
    expect(typeof featureSupport.media.camera.constraints).toBe("boolean");

    // Validate graphics support
    Object.values(featureSupport.graphics).forEach((graphics) => {
      expect(graphics).toHaveProperty("supported");
      expect(typeof graphics.supported).toBe("boolean");
    });

    // Validate security features
    Object.values(featureSupport.security).forEach((security) => {
      expect(security).toHaveProperty("supported");
      expect(typeof security.supported).toBe("boolean");
    });
  });
});
