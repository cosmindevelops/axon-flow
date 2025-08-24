/**
 * Test suite for Node.js platform schema validations
 */

import { describe, it, expect } from "vitest";

describe("Node.js Platform Schema Validations", () => {
  describe("Node Process Schema", () => {
    it("should validate Node.js process information structure", () => {
      const mockProcessSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Process data must be an object"] };
          }

          // Required fields
          const required = ["pid", "ppid", "platform", "arch", "version"];
          required.forEach((field) => {
            if (!(field in data)) {
              errors.push(`Missing required field: ${field}`);
            }
          });

          // Validate PID
          if ("pid" in data && (typeof data.pid !== "number" || data.pid <= 0)) {
            errors.push("PID must be a positive number");
          }

          // Validate platform
          if ("platform" in data) {
            const validPlatforms = ["win32", "darwin", "linux", "freebsd", "openbsd", "sunos"];
            if (!validPlatforms.includes(data.platform)) {
              errors.push(`Platform must be one of: ${validPlatforms.join(", ")}`);
            }
          }

          // Validate architecture
          if ("arch" in data) {
            const validArches = ["x64", "x32", "arm", "arm64"];
            if (!validArches.includes(data.arch)) {
              errors.push(`Architecture must be one of: ${validArches.join(", ")}`);
            }
          }

          // Validate version format
          if ("version" in data && typeof data.version === "string") {
            if (!/^v\d+\.\d+\.\d+/.test(data.version)) {
              errors.push("Version must be in Node.js format (e.g., v18.17.0)");
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid process data
      const validProcessData = {
        pid: 12345,
        ppid: 1,
        platform: "linux",
        arch: "x64",
        version: "v20.10.0",
        uptime: 86400.5,
        memoryUsage: {
          rss: 52428800,
          heapUsed: 25165824,
          heapTotal: 33554432,
          external: 1048576,
        },
      };

      const validResult = mockProcessSchema.validate(validProcessData);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid process data
      const invalidProcessData = {
        pid: -1,
        platform: "invalid-platform",
        arch: "unknown-arch",
        version: "invalid-version",
      };

      const invalidResult = mockProcessSchema.validate(invalidProcessData);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Node Server Configuration Schema", () => {
    it("should validate server configuration structure", () => {
      const mockServerSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Server config must be an object"] };
          }

          // Validate port
          if ("port" in data) {
            if (typeof data.port !== "number" || data.port < 1 || data.port > 65535) {
              errors.push("Port must be a number between 1 and 65535");
            }
          }

          // Validate host
          if ("host" in data && typeof data.host !== "string") {
            errors.push("Host must be a string");
          }

          // Validate SSL configuration
          if ("ssl" in data) {
            if (typeof data.ssl !== "object" || data.ssl === null) {
              errors.push("SSL config must be an object");
            } else {
              if ("enabled" in data.ssl && typeof data.ssl.enabled !== "boolean") {
                errors.push("SSL enabled must be a boolean");
              }
              if (data.ssl.enabled && !("cert" in data.ssl && "key" in data.ssl)) {
                errors.push("SSL cert and key are required when SSL is enabled");
              }
            }
          }

          // Validate timeout values
          if ("timeout" in data) {
            if (typeof data.timeout !== "number" || data.timeout <= 0) {
              errors.push("Timeout must be a positive number");
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid server config
      const validServerConfig = {
        port: 3000,
        host: "0.0.0.0",
        ssl: {
          enabled: true,
          cert: "/path/to/cert.pem",
          key: "/path/to/key.pem",
        },
        timeout: 30000,
        keepAlive: true,
        maxConnections: 1000,
      };

      const validResult = mockServerSchema.validate(validServerConfig);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid server config
      const invalidServerConfig = {
        port: 70000, // Invalid port
        host: 123, // Invalid host type
        ssl: {
          enabled: true,
          // Missing cert and key
        },
        timeout: -1000, // Invalid timeout
      };

      const invalidResult = mockServerSchema.validate(invalidServerConfig);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Node File System Schema", () => {
    it("should validate file system operation parameters", () => {
      const mockFileSystemSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["File system data must be an object"] };
          }

          // Validate path
          if ("path" in data) {
            if (typeof data.path !== "string" || data.path.length === 0) {
              errors.push("Path must be a non-empty string");
            } else if (data.path.includes("..")) {
              errors.push("Path must not contain relative navigation (..)");
            }
          }

          // Validate encoding
          if ("encoding" in data) {
            const validEncodings = ["utf8", "ascii", "base64", "binary", "hex"];
            if (!validEncodings.includes(data.encoding)) {
              errors.push(`Encoding must be one of: ${validEncodings.join(", ")}`);
            }
          }

          // Validate file mode
          if ("mode" in data) {
            if (typeof data.mode === "string") {
              if (!/^[0-7]{3,4}$/.test(data.mode)) {
                errors.push("Mode must be a valid octal string (e.g., '0644', '0755')");
              }
            } else if (typeof data.mode === "number") {
              if (data.mode < 0 || data.mode > 0o7777) {
                errors.push("Mode must be a valid octal number (0-0o7777)");
              }
            } else {
              errors.push("Mode must be a string or number");
            }
          }

          // Validate flags for file operations
          if ("flags" in data) {
            const validFlags = ["r", "r+", "rs", "rs+", "w", "wx", "w+", "wx+", "a", "ax", "a+", "ax+"];
            if (!validFlags.includes(data.flags)) {
              errors.push(`Flags must be one of: ${validFlags.join(", ")}`);
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid file system data
      const validFileData = {
        path: "/home/user/documents/file.txt",
        encoding: "utf8",
        mode: "0644",
        flags: "r+",
        maxSize: 1048576, // 1MB
      };

      const validResult = mockFileSystemSchema.validate(validFileData);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid file system data
      const invalidFileData = {
        path: "../../../etc/passwd", // Contains relative navigation
        encoding: "invalid-encoding",
        mode: "999", // Invalid octal
        flags: "invalid-flag",
      };

      const invalidResult = mockFileSystemSchema.validate(invalidFileData);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Node Child Process Schema", () => {
    it("should validate child process spawn parameters", () => {
      const mockChildProcessSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Child process data must be an object"] };
          }

          // Validate command
          if (!("command" in data) || typeof data.command !== "string") {
            errors.push("Command is required and must be a string");
          }

          // Validate args
          if ("args" in data) {
            if (!Array.isArray(data.args)) {
              errors.push("Args must be an array");
            } else if (!data.args.every((arg: any) => typeof arg === "string")) {
              errors.push("All arguments must be strings");
            }
          }

          // Validate options
          if ("options" in data) {
            if (typeof data.options !== "object" || data.options === null) {
              errors.push("Options must be an object");
            } else {
              // Validate cwd
              if ("cwd" in data.options && typeof data.options.cwd !== "string") {
                errors.push("Working directory (cwd) must be a string");
              }

              // Validate env
              if ("env" in data.options) {
                if (typeof data.options.env !== "object" || data.options.env === null) {
                  errors.push("Environment (env) must be an object");
                } else {
                  Object.entries(data.options.env).forEach(([key, value]) => {
                    if (typeof key !== "string" || typeof value !== "string") {
                      errors.push("Environment variables must be string key-value pairs");
                    }
                  });
                }
              }

              // Validate stdio
              if ("stdio" in data.options) {
                const validStdio = ["pipe", "ignore", "inherit", "ipc"];
                const stdio = data.options.stdio;
                if (Array.isArray(stdio)) {
                  if (!stdio.every((s: any) => validStdio.includes(s) || typeof s === "number")) {
                    errors.push(
                      `Each stdio option must be one of: ${validStdio.join(", ")} or a file descriptor number`,
                    );
                  }
                } else if (!validStdio.includes(stdio)) {
                  errors.push(`Stdio must be one of: ${validStdio.join(", ")} or an array`);
                }
              }
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid child process data
      const validChildProcessData = {
        command: "node",
        args: ["script.js", "--verbose"],
        options: {
          cwd: "/app",
          env: {
            NODE_ENV: "production",
            PORT: "3000",
          },
          stdio: ["pipe", "pipe", "pipe", "ipc"],
        },
      };

      const validResult = mockChildProcessSchema.validate(validChildProcessData);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid child process data
      const invalidChildProcessData = {
        // Missing command
        args: [123, true], // Invalid arg types
        options: {
          cwd: 123, // Invalid cwd type
          env: "not-an-object", // Invalid env type
          stdio: ["invalid-option"],
        },
      };

      const invalidResult = mockChildProcessSchema.validate(invalidChildProcessData);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Node Stream Schema", () => {
    it("should validate stream configuration", () => {
      const mockStreamSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Stream data must be an object"] };
          }

          // Validate stream type
          if ("type" in data) {
            const validTypes = ["readable", "writable", "duplex", "transform"];
            if (!validTypes.includes(data.type)) {
              errors.push(`Stream type must be one of: ${validTypes.join(", ")}`);
            }
          }

          // Validate high water mark
          if ("highWaterMark" in data) {
            if (typeof data.highWaterMark !== "number" || data.highWaterMark < 0) {
              errors.push("High water mark must be a non-negative number");
            }
          }

          // Validate encoding
          if ("encoding" in data && data.encoding !== null) {
            const validEncodings = ["utf8", "ascii", "base64", "binary", "hex"];
            if (!validEncodings.includes(data.encoding)) {
              errors.push(`Encoding must be one of: ${validEncodings.join(", ")} or null`);
            }
          }

          // Validate object mode
          if ("objectMode" in data && typeof data.objectMode !== "boolean") {
            errors.push("Object mode must be a boolean");
          }

          // Validate buffer size
          if ("bufferSize" in data) {
            if (typeof data.bufferSize !== "number" || data.bufferSize <= 0) {
              errors.push("Buffer size must be a positive number");
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid stream data
      const validStreamData = {
        type: "duplex",
        highWaterMark: 16384,
        encoding: "utf8",
        objectMode: false,
        bufferSize: 8192,
        autoDestroy: true,
      };

      const validResult = mockStreamSchema.validate(validStreamData);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid stream data
      const invalidStreamData = {
        type: "invalid-type",
        highWaterMark: -1,
        encoding: "invalid-encoding",
        objectMode: "not-boolean",
        bufferSize: 0,
      };

      const invalidResult = mockStreamSchema.validate(invalidStreamData);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Node Performance Schema", () => {
    it("should validate Node.js performance metrics", () => {
      const mockPerformanceSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Performance data must be an object"] };
          }

          // Validate memory usage
          if ("memoryUsage" in data) {
            const memUsage = data.memoryUsage;
            if (typeof memUsage !== "object" || memUsage === null) {
              errors.push("Memory usage must be an object");
            } else {
              const requiredMemFields = ["rss", "heapUsed", "heapTotal", "external"];
              requiredMemFields.forEach((field) => {
                if (!(field in memUsage) || typeof memUsage[field] !== "number") {
                  errors.push(`Memory usage ${field} must be a number`);
                }
              });
            }
          }

          // Validate CPU usage
          if ("cpuUsage" in data) {
            const cpuUsage = data.cpuUsage;
            if (typeof cpuUsage !== "object" || cpuUsage === null) {
              errors.push("CPU usage must be an object");
            } else {
              const requiredCpuFields = ["user", "system"];
              requiredCpuFields.forEach((field) => {
                if (!(field in cpuUsage) || typeof cpuUsage[field] !== "number") {
                  errors.push(`CPU usage ${field} must be a number`);
                }
              });
            }
          }

          // Validate resource usage
          if ("resourceUsage" in data) {
            const resUsage = data.resourceUsage;
            if (typeof resUsage !== "object" || resUsage === null) {
              errors.push("Resource usage must be an object");
            } else {
              const numericFields = ["userCPUTime", "systemCPUTime", "maxRSS", "sharedMemorySize"];
              numericFields.forEach((field) => {
                if (field in resUsage && typeof resUsage[field] !== "number") {
                  errors.push(`Resource usage ${field} must be a number`);
                }
              });
            }
          }

          // Validate uptime
          if ("uptime" in data) {
            if (typeof data.uptime !== "number" || data.uptime < 0) {
              errors.push("Uptime must be a non-negative number");
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid performance data
      const validPerformanceData = {
        memoryUsage: {
          rss: 52428800, // 50MB
          heapUsed: 25165824, // 24MB
          heapTotal: 33554432, // 32MB
          external: 1048576, // 1MB
        },
        cpuUsage: {
          user: 1250000, // microseconds
          system: 500000, // microseconds
        },
        resourceUsage: {
          userCPUTime: 1250000,
          systemCPUTime: 500000,
          maxRSS: 52428800,
          sharedMemorySize: 0,
        },
        uptime: 86400.5, // seconds
      };

      const validResult = mockPerformanceSchema.validate(validPerformanceData);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid performance data
      const invalidPerformanceData = {
        memoryUsage: {
          rss: "invalid", // Should be number
          heapUsed: 25165824,
          // Missing required fields
        },
        cpuUsage: "not-an-object",
        uptime: -100, // Invalid negative uptime
      };

      const invalidResult = mockPerformanceSchema.validate(invalidPerformanceData);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Schema Integration", () => {
    it("should support nested Node.js configuration validation", () => {
      const mockNodeConfigSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Node config must be an object"] };
          }

          // Validate server section
          if ("server" in data) {
            if (typeof data.server !== "object") {
              errors.push("Server config must be an object");
            } else if (!("port" in data.server)) {
              errors.push("Server config missing port");
            }
          }

          // Validate process section
          if ("process" in data) {
            if (typeof data.process !== "object") {
              errors.push("Process config must be an object");
            } else {
              if ("title" in data.process && typeof data.process.title !== "string") {
                errors.push("Process title must be a string");
              }
              if ("env" in data.process && typeof data.process.env !== "object") {
                errors.push("Process env must be an object");
              }
            }
          }

          // Validate logging section
          if ("logging" in data) {
            if (typeof data.logging !== "object") {
              errors.push("Logging config must be an object");
            } else {
              if ("level" in data.logging) {
                const validLevels = ["error", "warn", "info", "debug", "trace"];
                if (!validLevels.includes(data.logging.level)) {
                  errors.push(`Logging level must be one of: ${validLevels.join(", ")}`);
                }
              }
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      const validNodeConfig = {
        server: {
          port: 3000,
          host: "localhost",
        },
        process: {
          title: "axon-flow-node",
          env: {
            NODE_ENV: "development",
          },
        },
        logging: {
          level: "info",
          format: "json",
        },
      };

      const result = mockNodeConfigSchema.validate(validNodeConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
