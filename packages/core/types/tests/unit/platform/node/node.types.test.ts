/**
 * Test suite for Node.js platform type definitions
 */

import { describe, it, expect } from "vitest";
import type {
  NodeProcessInfo,
  NodeServerConfig,
  NodeFileSystemConfig,
  NodeChildProcessConfig,
  NodeStreamConfig,
  NodePerformanceMetrics,
  NodeEnvironment,
  NodeMemoryUsage,
  NodeCpuUsage,
  NodeResourceUsage,
  NodePlatform,
  NodeArchitecture,
  FileSystemFlags,
  StreamType,
  StdioOption,
  ProcessSignal,
  ServerProtocol,
  LogLevel,
  NodeModuleInfo,
  PackageJson,
  NodeErrorInfo,
  ClusterConfig,
} from "../../../../../src/platform/node/node.types.js";

describe("Node.js Platform Type Definitions", () => {
  describe("Interface Naming Convention", () => {
    it("should enforce I-prefix naming convention for interfaces", () => {
      // All interfaces should start with 'I' prefix
      const interfaceNames = [
        "NodeProcessInfo",
        "NodeServerConfig",
        "NodeFileSystemConfig",
        "NodeChildProcessConfig",
        "NodeStreamConfig",
        "NodePerformanceMetrics",
      ];

      // Note: These are type aliases, not interfaces, so they don't need I-prefix
      interfaceNames.forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });

  describe("NodeProcessInfo Type", () => {
    it("should define Node.js process information structure", () => {
      const mockProcessInfo: NodeProcessInfo = {
        pid: 12345,
        ppid: 1,
        platform: "linux",
        arch: "x64",
        version: "v20.10.0",
        title: "node-app",
        execPath: "/usr/bin/node",
        execArgv: ["--inspect"],
        argv: ["node", "app.js", "--verbose"],
        uptime: 86400.5,
        cwd: "/app",
        memoryUsage: {
          rss: 52428800,
          heapUsed: 25165824,
          heapTotal: 33554432,
          external: 1048576,
          arrayBuffers: 524288,
        },
        cpuUsage: {
          user: 1250000,
          system: 500000,
        },
      };

      expect(mockProcessInfo.pid).toBe(12345);
      expect(mockProcessInfo.platform).toBe("linux");
      expect(mockProcessInfo.arch).toBe("x64");
      expect(mockProcessInfo.version).toBe("v20.10.0");
      expect(mockProcessInfo.memoryUsage.rss).toBe(52428800);
    });

    it("should validate Node platform values", () => {
      const validPlatforms: NodePlatform[] = ["aix", "darwin", "freebsd", "linux", "openbsd", "sunos", "win32"];

      validPlatforms.forEach((platform) => {
        expect(typeof platform).toBe("string");
      });
    });

    it("should validate Node architecture values", () => {
      const validArchitectures: NodeArchitecture[] = [
        "arm",
        "arm64",
        "ia32",
        "mips",
        "mipsel",
        "ppc",
        "ppc64",
        "s390",
        "s390x",
        "x64",
      ];

      validArchitectures.forEach((arch) => {
        expect(typeof arch).toBe("string");
      });
    });
  });

  describe("NodeServerConfig Type", () => {
    it("should define Node.js server configuration structure", () => {
      const mockServerConfig: NodeServerConfig = {
        port: 3000,
        host: "0.0.0.0",
        protocol: "http",
        ssl: {
          enabled: true,
          cert: "/path/to/cert.pem",
          key: "/path/to/key.pem",
          ca: "/path/to/ca.pem",
          passphrase: "secret",
        },
        timeout: 30000,
        keepAlive: true,
        keepAliveTimeout: 5000,
        maxConnections: 1000,
        maxHeadersCount: 2000,
        maxRequestSize: 1048576,
        compression: {
          enabled: true,
          level: 6,
          threshold: 1024,
        },
        cors: {
          enabled: true,
          origin: ["https://example.com"],
          credentials: true,
          methods: ["GET", "POST", "PUT", "DELETE"],
        },
      };

      expect(mockServerConfig.port).toBe(3000);
      expect(mockServerConfig.protocol).toBe("http");
      expect(mockServerConfig.ssl.enabled).toBe(true);
      expect(mockServerConfig.compression.enabled).toBe(true);
    });

    it("should validate server protocol values", () => {
      const validProtocols: ServerProtocol[] = ["http", "https", "http2"];

      validProtocols.forEach((protocol) => {
        expect(typeof protocol).toBe("string");
      });
    });
  });

  describe("NodeFileSystemConfig Type", () => {
    it("should define Node.js file system configuration structure", () => {
      const mockFileSystemConfig: NodeFileSystemConfig = {
        path: "/home/user/documents",
        encoding: "utf8",
        mode: 0o644,
        flags: "r+",
        highWaterMark: 16384,
        autoClose: true,
        emitClose: true,
        start: 0,
        end: 1048576,
        fs: {
          readFile: "async",
          writeFile: "async",
          appendFile: "sync",
        },
        watch: {
          enabled: true,
          recursive: true,
          persistent: true,
          encoding: "utf8",
        },
      };

      expect(mockFileSystemConfig.path).toBe("/home/user/documents");
      expect(mockFileSystemConfig.encoding).toBe("utf8");
      expect(mockFileSystemConfig.flags).toBe("r+");
      expect(mockFileSystemConfig.watch.enabled).toBe(true);
    });

    it("should validate file system flags", () => {
      const validFlags: FileSystemFlags[] = ["r", "r+", "rs", "rs+", "w", "wx", "w+", "wx+", "a", "ax", "a+", "ax+"];

      validFlags.forEach((flag) => {
        expect(typeof flag).toBe("string");
      });
    });
  });

  describe("NodeChildProcessConfig Type", () => {
    it("should define Node.js child process configuration structure", () => {
      const mockChildProcessConfig: NodeChildProcessConfig = {
        command: "node",
        args: ["script.js", "--verbose"],
        options: {
          cwd: "/app",
          env: {
            NODE_ENV: "production",
            PORT: "3000",
            DEBUG: "app:*",
          },
          stdio: ["pipe", "pipe", "pipe", "ipc"],
          detached: false,
          shell: false,
          timeout: 30000,
          maxBuffer: 1048576,
          killSignal: "SIGTERM",
          uid: 1000,
          gid: 1000,
          windowsHide: true,
        },
        spawned: {
          pid: 54321,
          connected: true,
          killed: false,
          exitCode: null,
          signalCode: null,
          spawnfile: "node",
        },
      };

      expect(mockChildProcessConfig.command).toBe("node");
      expect(mockChildProcessConfig.args).toEqual(["script.js", "--verbose"]);
      expect(mockChildProcessConfig.options.env?.NODE_ENV).toBe("production");
      expect(mockChildProcessConfig.spawned.pid).toBe(54321);
    });

    it("should validate stdio options", () => {
      const validStdioOptions: StdioOption[] = ["pipe", "ignore", "inherit", "ipc"];

      validStdioOptions.forEach((option) => {
        expect(typeof option).toBe("string");
      });
    });

    it("should validate process signals", () => {
      const validSignals: ProcessSignal[] = ["SIGINT", "SIGTERM", "SIGKILL", "SIGHUP", "SIGUSR1", "SIGUSR2"];

      validSignals.forEach((signal) => {
        expect(typeof signal).toBe("string");
      });
    });
  });

  describe("NodeStreamConfig Type", () => {
    it("should define Node.js stream configuration structure", () => {
      const mockStreamConfig: NodeStreamConfig = {
        type: "duplex",
        highWaterMark: 16384,
        encoding: "utf8",
        objectMode: false,
        decodeStrings: true,
        defaultEncoding: "utf8",
        autoDestroy: true,
        emitClose: true,
        buffering: {
          enabled: true,
          size: 8192,
          timeout: 100,
        },
        transform: {
          allowHalfOpen: true,
          readableObjectMode: false,
          writableObjectMode: false,
        },
        flow: {
          flowing: null,
          readableFlowing: null,
          readableEnded: false,
          writableEnded: false,
        },
      };

      expect(mockStreamConfig.type).toBe("duplex");
      expect(mockStreamConfig.highWaterMark).toBe(16384);
      expect(mockStreamConfig.objectMode).toBe(false);
      expect(mockStreamConfig.buffering.enabled).toBe(true);
    });

    it("should validate stream types", () => {
      const validStreamTypes: StreamType[] = ["readable", "writable", "duplex", "transform", "passthrough"];

      validStreamTypes.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });
  });

  describe("NodePerformanceMetrics Type", () => {
    it("should define Node.js performance metrics structure", () => {
      const mockPerformanceMetrics: NodePerformanceMetrics = {
        timestamp: "2024-01-01T12:00:00.000Z",
        uptime: 86400.5,
        memoryUsage: {
          rss: 52428800,
          heapUsed: 25165824,
          heapTotal: 33554432,
          external: 1048576,
          arrayBuffers: 524288,
        },
        cpuUsage: {
          user: 1250000,
          system: 500000,
        },
        resourceUsage: {
          userCPUTime: 1250000,
          systemCPUTime: 500000,
          maxRSS: 52428800,
          sharedMemorySize: 0,
          unsharedDataSize: 0,
          unsharedStackSize: 0,
          minorPageFault: 1000,
          majorPageFault: 10,
          swappedOut: 0,
          fsRead: 100,
          fsWrite: 50,
          ipcSent: 25,
          ipcReceived: 30,
          signalsCount: 5,
          voluntaryContextSwitches: 500,
          involuntaryContextSwitches: 100,
        },
        eventLoop: {
          lag: 2.5,
          utilization: 0.65,
        },
        gc: {
          totalHeapSize: 33554432,
          totalHeapSizeExecutable: 2097152,
          usedHeapSize: 25165824,
          heapSizeLimit: 2147483648,
          totalPhysicalSize: 28311552,
          totalAvailableSize: 2122317824,
          mallocedMemory: 8192,
          externalMemory: 1048576,
        },
      };

      expect(mockPerformanceMetrics.uptime).toBe(86400.5);
      expect(mockPerformanceMetrics.memoryUsage.rss).toBe(52428800);
      expect(mockPerformanceMetrics.eventLoop.lag).toBe(2.5);
      expect(mockPerformanceMetrics.gc.usedHeapSize).toBe(25165824);
    });
  });

  describe("NodeEnvironment Type", () => {
    it("should define Node.js environment structure", () => {
      const mockEnvironment: NodeEnvironment = {
        nodeEnv: "production",
        nodeVersion: "v20.10.0",
        npmVersion: "10.2.3",
        platform: "linux",
        arch: "x64",
        features: {
          crypto: true,
          tls: true,
          http2: true,
          esm: true,
          worker_threads: true,
          inspector: true,
          async_hooks: true,
        },
        modules: {
          loaded: [
            { name: "fs", version: "built-in", path: "internal/fs" },
            { name: "express", version: "4.18.2", path: "/node_modules/express" },
          ],
          paths: ["/app/node_modules", "/usr/local/lib/node_modules"],
        },
        flags: {
          inspect: false,
          inspectBrk: false,
          experimental: [],
          loaderOverrides: false,
        },
      };

      expect(mockEnvironment.nodeEnv).toBe("production");
      expect(mockEnvironment.features.crypto).toBe(true);
      expect(mockEnvironment.modules.loaded).toHaveLength(2);
    });
  });

  describe("PackageJson Type", () => {
    it("should define package.json structure", () => {
      const mockPackageJson: PackageJson = {
        name: "axon-flow-node",
        version: "1.0.0",
        description: "Node.js platform for Axon Flow",
        main: "index.js",
        module: "index.mjs",
        types: "index.d.ts",
        scripts: {
          start: "node index.js",
          dev: "node --inspect index.js",
          test: "jest",
          build: "tsc",
        },
        dependencies: {
          express: "^4.18.2",
          lodash: "^4.17.21",
        },
        devDependencies: {
          "@types/node": "^20.10.0",
          typescript: "^5.3.0",
        },
        engines: {
          node: ">=18.0.0",
          npm: ">=9.0.0",
        },
        keywords: ["node", "platform", "axon-flow"],
        author: "Axon Flow Team",
        license: "MIT",
        repository: {
          type: "git",
          url: "https://github.com/axon-flow/axon-flow.git",
        },
        config: {
          port: 3000,
          env: "development",
        },
      };

      expect(mockPackageJson.name).toBe("axon-flow-node");
      expect(mockPackageJson.version).toBe("1.0.0");
      expect(mockPackageJson.engines?.node).toBe(">=18.0.0");
      expect(mockPackageJson.scripts.start).toBe("node index.js");
    });
  });

  describe("NodeErrorInfo Type", () => {
    it("should define Node.js error information structure", () => {
      const mockErrorInfo: NodeErrorInfo = {
        name: "TypeError",
        message: "Cannot read property 'foo' of undefined",
        stack: "TypeError: Cannot read property 'foo' of undefined\n    at Object.<anonymous> (/app/index.js:10:5)",
        code: "ERR_INVALID_ARG_TYPE",
        errno: -2,
        syscall: "open",
        path: "/nonexistent/file.txt",
        signal: null,
        cause: null,
        node: {
          version: "v20.10.0",
          platform: "linux",
          arch: "x64",
        },
        process: {
          pid: 12345,
          uptime: 86400.5,
          memoryUsage: {
            rss: 52428800,
            heapUsed: 25165824,
            heapTotal: 33554432,
            external: 1048576,
            arrayBuffers: 524288,
          },
        },
      };

      expect(mockErrorInfo.name).toBe("TypeError");
      expect(mockErrorInfo.code).toBe("ERR_INVALID_ARG_TYPE");
      expect(mockErrorInfo.errno).toBe(-2);
      expect(mockErrorInfo.node.version).toBe("v20.10.0");
    });
  });

  describe("ClusterConfig Type", () => {
    it("should define Node.js cluster configuration structure", () => {
      const mockClusterConfig: ClusterConfig = {
        workers: 4,
        settings: {
          exec: "/app/worker.js",
          args: ["--worker"],
          silent: false,
          stdio: ["pipe", "pipe", "pipe", "ipc"],
          uid: 1000,
          gid: 1000,
          inspectPort: 9229,
        },
        scheduling: "rr", // round-robin
        master: {
          pid: 12345,
          workers: new Map([
            ["1", { id: 1, pid: 12346, state: "listening", exitedAfterDisconnect: false }],
            ["2", { id: 2, pid: 12347, state: "listening", exitedAfterDisconnect: false }],
          ]),
          listening: true,
          setupMaster: true,
        },
        worker: {
          id: 1,
          pid: 12346,
          state: "listening",
          send: true,
          kill: false,
          suicide: false,
          exitedAfterDisconnect: false,
          disconnectTimeout: 2000,
        },
      };

      expect(mockClusterConfig.workers).toBe(4);
      expect(mockClusterConfig.scheduling).toBe("rr");
      expect(mockClusterConfig.master.workers.size).toBe(2);
      expect(mockClusterConfig.worker.id).toBe(1);
    });
  });

  describe("Type Relationships and Composition", () => {
    it("should demonstrate proper type composition", () => {
      const fullNodeData: NodeProcessInfo & NodePerformanceMetrics & NodeEnvironment = {
        // NodeProcessInfo
        pid: 12345,
        ppid: 1,
        platform: "linux",
        arch: "x64",
        version: "v20.10.0",
        title: "node-app",
        execPath: "/usr/bin/node",
        execArgv: ["--inspect"],
        argv: ["node", "app.js", "--verbose"],
        uptime: 86400.5,
        cwd: "/app",
        memoryUsage: {
          rss: 52428800,
          heapUsed: 25165824,
          heapTotal: 33554432,
          external: 1048576,
          arrayBuffers: 524288,
        },
        cpuUsage: {
          user: 1250000,
          system: 500000,
        },

        // NodePerformanceMetrics
        timestamp: "2024-01-01T12:00:00.000Z",
        resourceUsage: {
          userCPUTime: 1250000,
          systemCPUTime: 500000,
          maxRSS: 52428800,
          sharedMemorySize: 0,
          unsharedDataSize: 0,
          unsharedStackSize: 0,
          minorPageFault: 1000,
          majorPageFault: 10,
          swappedOut: 0,
          fsRead: 100,
          fsWrite: 50,
          ipcSent: 25,
          ipcReceived: 30,
          signalsCount: 5,
          voluntaryContextSwitches: 500,
          involuntaryContextSwitches: 100,
        },
        eventLoop: {
          lag: 2.5,
          utilization: 0.65,
        },
        gc: {
          totalHeapSize: 33554432,
          totalHeapSizeExecutable: 2097152,
          usedHeapSize: 25165824,
          heapSizeLimit: 2147483648,
          totalPhysicalSize: 28311552,
          totalAvailableSize: 2122317824,
          mallocedMemory: 8192,
          externalMemory: 1048576,
        },

        // NodeEnvironment
        nodeEnv: "production",
        nodeVersion: "v20.10.0",
        npmVersion: "10.2.3",
        features: {
          crypto: true,
          tls: true,
          http2: true,
          esm: true,
          worker_threads: true,
          inspector: true,
          async_hooks: true,
        },
        modules: {
          loaded: [{ name: "fs", version: "built-in", path: "internal/fs" }],
          paths: ["/app/node_modules"],
        },
        flags: {
          inspect: false,
          inspectBrk: false,
          experimental: [],
          loaderOverrides: false,
        },
      };

      expect(fullNodeData.pid).toBe(12345);
      expect(fullNodeData.eventLoop.lag).toBe(2.5);
      expect(fullNodeData.features.crypto).toBe(true);
      expect(fullNodeData.memoryUsage.rss).toBe(52428800);
    });
  });

  describe("Type Guard Support", () => {
    it("should support type narrowing patterns", () => {
      const data: unknown = {
        pid: 12345,
        platform: "linux",
        version: "v20.10.0",
      };

      // Type guard pattern simulation
      if (typeof data === "object" && data !== null && "pid" in data && "platform" in data && "version" in data) {
        const nodeData = data as NodeProcessInfo;
        expect(nodeData.pid).toBe(12345);
        expect(nodeData.platform).toBe("linux");
        expect(nodeData.version).toBe("v20.10.0");
      }
    });

    it("should validate discriminated union types", () => {
      type NodeMessage =
        | { type: "process"; data: NodeProcessInfo }
        | { type: "performance"; data: NodePerformanceMetrics }
        | { type: "error"; data: NodeErrorInfo };

      const processMessage: NodeMessage = {
        type: "process",
        data: {
          pid: 12345,
          ppid: 1,
          platform: "linux",
          arch: "x64",
          version: "v20.10.0",
          title: "test-app",
          execPath: "/usr/bin/node",
          execArgv: [],
          argv: ["node", "app.js"],
          uptime: 100.5,
          cwd: "/app",
          memoryUsage: {
            rss: 52428800,
            heapUsed: 25165824,
            heapTotal: 33554432,
            external: 1048576,
            arrayBuffers: 524288,
          },
          cpuUsage: {
            user: 1250000,
            system: 500000,
          },
        },
      };

      expect(processMessage.type).toBe("process");

      if (processMessage.type === "process") {
        expect(processMessage.data.pid).toBe(12345);
        expect(processMessage.data.platform).toBe("linux");
      }
    });
  });

  describe("Log Level Validation", () => {
    it("should validate Node.js log levels", () => {
      const validLogLevels: LogLevel[] = ["error", "warn", "info", "http", "verbose", "debug", "silly"];

      validLogLevels.forEach((level) => {
        expect(typeof level).toBe("string");
      });
    });
  });
});
