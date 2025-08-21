/**
 * Tests for cross-platform type definitions
 */

import { describe, expect, it } from "vitest";
import {
  platformDetection,
  type ICrypto,
  type IEnvironment,
  type IEventEmitter,
  type IFetchOptions,
  type IFetchResponse,
  type IFileStats,
  type IFileSystem,
  type INetwork,
  type IPlatformInfo,
  type IStorage,
  type ITimer,
  type IWebSocket,
} from "../../src/platform/common.types.js";

describe("Platform Common Types", () => {
  describe("Platform Detection", () => {
    it("should detect platform type", () => {
      // In test environment, this will likely return "node"
      const platformType = platformDetection.getPlatformType();
      expect(["node", "browser", "webworker", "electron-main", "electron-renderer", "react-native"]).toContain(
        platformType,
      );
    });

    it("should check if running in Node.js", () => {
      const isNode = platformDetection.isNode();
      expect(typeof isNode).toBe("boolean");

      // In vitest/node environment, this should be true
      if (typeof process !== "undefined" && process.versions !== undefined) {
        expect(isNode).toBe(true);
      }
    });

    it("should check if running in browser", () => {
      const isBrowser = platformDetection.isBrowser();
      expect(typeof isBrowser).toBe("boolean");

      // In node test environment, this should be false
      if (typeof (globalThis as any).window === "undefined") {
        expect(isBrowser).toBe(false);
      }
    });

    it("should check other platform types", () => {
      expect(typeof platformDetection.isWebWorker()).toBe("boolean");
      expect(typeof platformDetection.isElectronMain()).toBe("boolean");
      expect(typeof platformDetection.isElectronRenderer()).toBe("boolean");
      expect(typeof platformDetection.isReactNative()).toBe("boolean");
    });
  });

  describe("IPlatformInfo", () => {
    it("should define platform information", () => {
      const info: IPlatformInfo = {
        type: "node",
        version: "20.0.0",
        isDevelopment: true,
        isProduction: false,
        isTest: true,
        environment: "test",
      };

      expect(info.type).toBe("node");
      expect(info.isDevelopment).toBe(true);
      expect(info.environment).toBe("test");
    });
  });

  describe("IEnvironment", () => {
    it("should define environment configuration", () => {
      const env: IEnvironment = {
        platform: {
          type: "node",
          version: "20.0.0",
          isDevelopment: false,
          isProduction: true,
          isTest: false,
          environment: "production",
        },
        variables: {
          NODE_ENV: "production",
          API_URL: "https://api.example.com",
          LOG_LEVEL: "info",
        },
        capabilities: {
          fileSystem: true,
          network: true,
          process: true,
          workers: true,
          crypto: true,
          storage: false,
          notifications: false,
          clipboard: false,
        },
        runtime: {
          name: "node",
          version: "20.0.0",
          arch: "x64",
          platform: "linux",
          memory: {
            total: 16384,
            used: 8192,
            free: 8192,
          },
          cpu: {
            model: "Intel Core i7",
            cores: 8,
            speed: 2400,
          },
        },
      };

      expect(env.platform.type).toBe("node");
      expect(env.variables.NODE_ENV).toBe("production");
      expect(env.capabilities.fileSystem).toBe(true);
      expect(env.runtime.memory.total).toBe(16384);
    });
  });

  describe("IFileSystem abstraction", () => {
    it("should define file system operations", () => {
      const mockFileSystem: IFileSystem = {
        readFile(path: string): Promise<Uint8Array> {
          return Promise.resolve(new Uint8Array([1, 2, 3]));
        },
        writeFile(path: string, data: Uint8Array): Promise<void> {
          return Promise.resolve();
        },
        deleteFile(path: string): Promise<void> {
          return Promise.resolve();
        },
        exists(path: string): Promise<boolean> {
          return Promise.resolve(true);
        },
        stat(path: string): Promise<IFileStats> {
          return Promise.resolve({
            isFile: true,
            isDirectory: false,
            size: 1024,
            created: new Date(),
            modified: new Date(),
            accessed: new Date(),
          });
        },
        readdir(path: string): Promise<readonly string[]> {
          return Promise.resolve(["file1.txt", "file2.txt"]);
        },
        mkdir(path: string): Promise<void> {
          return Promise.resolve();
        },
        rmdir(path: string): Promise<void> {
          return Promise.resolve();
        },
      };

      expect(mockFileSystem.readFile).toBeDefined();
      expect(mockFileSystem.writeFile).toBeDefined();
      expect(mockFileSystem.exists).toBeDefined();
    });
  });

  describe("INetwork abstraction", () => {
    it("should define network operations", () => {
      const mockNetwork: INetwork = {
        fetch(url: string, options?: IFetchOptions): Promise<IFetchResponse> {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: "OK",
            headers: {
              "content-type": "application/json",
            },
            text(): Promise<string> {
              return Promise.resolve("response text");
            },
            json<T = unknown>(): Promise<T> {
              return Promise.resolve({ data: "test" } as T);
            },
            bytes(): Promise<Uint8Array> {
              return Promise.resolve(new Uint8Array([1, 2, 3]));
            },
          });
        },
        websocket(url: string, protocols?: string[]): IWebSocket {
          return {
            readyState: 0,
            send(data: string | Uint8Array): void {
              // Mock implementation
            },
            close(code?: number, reason?: string): void {
              // Mock implementation
            },
          };
        },
        status: {
          online: true,
          type: "wifi",
          downlink: 100,
          rtt: 20,
        },
      };

      expect(mockNetwork.fetch).toBeDefined();
      expect(mockNetwork.websocket).toBeDefined();
      expect(mockNetwork.status.online).toBe(true);
    });
  });

  describe("IStorage abstraction", () => {
    it("should define storage operations", () => {
      const mockStorage: IStorage = {
        getItem(key: string): Promise<string | null> {
          return Promise.resolve("stored value");
        },
        setItem(key: string, value: string): Promise<void> {
          return Promise.resolve();
        },
        removeItem(key: string): Promise<void> {
          return Promise.resolve();
        },
        clear(): Promise<void> {
          return Promise.resolve();
        },
        keys(): Promise<readonly string[]> {
          return Promise.resolve(["key1", "key2"]);
        },
        type: "memory",
        quota: 1024 * 1024,
        usage: 512 * 1024,
      };

      expect(mockStorage.getItem).toBeDefined();
      expect(mockStorage.type).toBe("memory");
      expect(mockStorage.quota).toBe(1024 * 1024);
    });
  });

  describe("ICrypto abstraction", () => {
    it("should define crypto operations", () => {
      const mockCrypto: ICrypto = {
        randomBytes(size: number): Uint8Array {
          return new Uint8Array(size);
        },
        randomUUID(): string {
          return "550e8400-e29b-41d4-a716-446655440000";
        },
        hash(algorithm, data): Promise<Uint8Array> {
          return Promise.resolve(new Uint8Array(32));
        },
        hmac(algorithm, key, data): Promise<Uint8Array> {
          return Promise.resolve(new Uint8Array(32));
        },
        encrypt(algorithm, key, data): Promise<Uint8Array> {
          return Promise.resolve(new Uint8Array(data.length));
        },
        decrypt(algorithm, key, data): Promise<Uint8Array> {
          return Promise.resolve(new Uint8Array(data.length));
        },
      };

      expect(mockCrypto.randomBytes(16)).toHaveLength(16);
      expect(mockCrypto.randomUUID()).toMatch(/^[0-9a-f-]+$/);
    });
  });

  describe("ITimer abstraction", () => {
    it("should define timer operations", () => {
      const mockTimer: ITimer = {
        setTimeout(callback: () => void, delay: number) {
          return {
            id: "timer-1",
            cancel() {
              // Mock implementation
            },
          };
        },
        setInterval(callback: () => void, delay: number) {
          return {
            id: "interval-1",
            cancel() {
              // Mock implementation
            },
          };
        },
        setImmediate(callback: () => void) {
          return {
            id: "immediate-1",
            cancel() {
              // Mock implementation
            },
          };
        },
        clearTimer(handle) {
          handle.cancel();
        },
      };

      const timeout = mockTimer.setTimeout(() => {}, 1000);
      expect(timeout.id).toBe("timer-1");
      expect(timeout.cancel).toBeDefined();
    });
  });

  describe("IEventEmitter abstraction", () => {
    it("should define event emitter operations", () => {
      const listeners = new Map<string, Set<(data: unknown) => void>>();

      const mockEmitter: IEventEmitter = {
        on(event: string, listener: (data: unknown) => void): void {
          if (!listeners.has(event)) {
            listeners.set(event, new Set());
          }
          listeners.get(event)!.add(listener);
        },
        once(event: string, listener: (data: unknown) => void): void {
          const wrapper = (data: unknown): void => {
            listener(data);
            this.off(event, wrapper);
          };
          this.on(event, wrapper);
        },
        off(event: string, listener: (data: unknown) => void): void {
          listeners.get(event)?.delete(listener);
        },
        emit(event: string, data: unknown): void {
          listeners.get(event)?.forEach((listener) => {
            listener(data);
          });
        },
        removeAllListeners(event?: string): void {
          if (event) {
            listeners.delete(event);
          } else {
            listeners.clear();
          }
        },
        listenerCount(event: string): number {
          return listeners.get(event)?.size ?? 0;
        },
      };

      let called = false;
      const listener = (): void => {
        called = true;
      };

      mockEmitter.on("test", listener);
      expect(mockEmitter.listenerCount("test")).toBe(1);

      mockEmitter.emit("test", { data: "test" });
      expect(called).toBe(true);

      mockEmitter.off("test", listener);
      expect(mockEmitter.listenerCount("test")).toBe(0);
    });
  });

  describe("Type constants", () => {
    it("should define HTTP methods", () => {
      const methods: IFetchOptions["method"][] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

      methods.forEach((method) => {
        expect(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]).toContain(method);
      });
    });

    it("should define storage types", () => {
      const types: IStorage["type"][] = ["memory", "local", "session", "indexed", "file"];

      types.forEach((type) => {
        expect(["memory", "local", "session", "indexed", "file"]).toContain(type);
      });
    });

    it("should define hash algorithms", () => {
      const algorithms: Parameters<ICrypto["hash"]>[0][] = ["sha1", "sha256", "sha384", "sha512", "md5"];

      algorithms.forEach((algo) => {
        expect(["sha1", "sha256", "sha384", "sha512", "md5"]).toContain(algo);
      });
    });
  });
});
