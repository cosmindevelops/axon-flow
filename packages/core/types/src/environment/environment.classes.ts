/**
 * Environment class implementations
 */

/**
 * EnvironmentDetector detects the current runtime environment
 */
export class EnvironmentDetector {
  private currentEnvironment: string = "unknown";

  detect(): string {
    // Environment detection logic
    if (typeof process !== "undefined") {
      if (process.env["NODE_ENV"] === "production") {
        this.currentEnvironment = "production";
      } else if (process.env["NODE_ENV"] === "test") {
        this.currentEnvironment = "test";
      } else if (process.env["NODE_ENV"] === "development") {
        this.currentEnvironment = "development";
      } else {
        this.currentEnvironment = "local";
      }
    } else {
      this.currentEnvironment = "browser";
    }
    return this.currentEnvironment;
  }

  getEnvironment(): string {
    return this.currentEnvironment;
  }

  isProduction(): boolean {
    return this.currentEnvironment === "production";
  }

  isDevelopment(): boolean {
    return this.currentEnvironment === "development" || this.currentEnvironment === "local";
  }

  isTest(): boolean {
    return this.currentEnvironment === "test";
  }
}

/**
 * EnvironmentConfig manages environment-specific configuration
 */
export class EnvironmentConfig {
  private configurations = new Map<string, any>();

  setConfig(env: string, config: any): void {
    this.configurations.set(env, config);
  }

  getConfig(env: string): any {
    return this.configurations.get(env) || {};
  }

  mergeConfigs(baseEnv: string, targetEnv: string): any {
    const baseConfig = this.getConfig(baseEnv);
    const targetConfig = this.getConfig(targetEnv);
    return { ...baseConfig, ...targetConfig };
  }

  getCurrentConfig(currentEnv: string): any {
    const baseConfig = this.getConfig("default");
    const envConfig = this.getConfig(currentEnv);
    // Deep merge function
    const deepMerge = (base: any, override: any): any => {
      if (!override) return base;
      if (!base) return override;
      if (typeof base !== "object" || typeof override !== "object") return override;

      const result = { ...base };
      for (const key in override) {
        if (typeof result[key] === "object" && typeof override[key] === "object") {
          result[key] = deepMerge(result[key], override[key]);
        } else {
          result[key] = override[key];
        }
      }
      return result;
    };
    return deepMerge(baseConfig, envConfig);
  }
}

/**
 * FeatureFlags manages environment-based feature flags
 */
export class FeatureFlags {
  private flags = new Map<string, any>();

  setFlag(name: string, config: any): void {
    this.flags.set(name, config);
  }

  isEnabled(name: string, environment: string = "production"): boolean {
    const flag = this.flags.get(name);
    if (!flag) return false;

    if (flag.environments) {
      return flag.environments.includes(environment);
    }

    return flag.enabled === true;
  }

  getAllFlags(environment: string = "production"): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const [name] of Array.from(this.flags.entries())) {
      result[name] = this.isEnabled(name, environment);
    }
    return result;
  }

  enableFlag(name: string, environments: string[] = ["production"]): void {
    this.setFlag(name, { enabled: true, environments });
  }

  disableFlag(name: string): void {
    const flag = this.flags.get(name);
    if (flag) {
      flag.enabled = false;
      flag.environments = [];
    }
  }
}

/**
 * SystemInfo collects system environment information
 */
export class SystemInfo {
  getSystemInfo(): any {
    return {
      platform: typeof process !== "undefined" ? process.platform : "browser",
      arch: typeof process !== "undefined" ? process.arch : "unknown",
      nodeVersion: typeof process !== "undefined" ? process.version : null,
      memory: typeof process !== "undefined" ? process.memoryUsage() : null,
      uptime: typeof process !== "undefined" ? process.uptime() : null,
      pid: typeof process !== "undefined" ? process.pid : null,
      cwd: typeof process !== "undefined" ? process.cwd() : null,
      env: this.getEnvironmentVariables(),
    };
  }

  getEnvironmentVariables(): any {
    if (typeof process !== "undefined") {
      return {
        NODE_ENV: process.env["NODE_ENV"],
        PORT: process.env.PORT,
        HOST: process.env.HOST,
        // Filter out sensitive variables
        filtered: Object.keys(process.env).filter(
          (key) => !key.includes("PASSWORD") && !key.includes("SECRET") && !key.includes("TOKEN"),
        ).length,
      };
    }
    return {};
  }

  getRuntimeInfo(): any {
    return {
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      features: this.detectFeatures(),
    };
  }

  detectFeatures(): Record<string, boolean> {
    const features: Record<string, boolean> = {};

    // Node.js features
    if (typeof process !== "undefined") {
      features.filesystem = true;
      features.childProcess = true;
      features.networking = true;
    }

    // Browser features
    if (typeof window !== "undefined") {
      features.dom = true;
      features.webGL = !!(window as any).WebGLRenderingContext;
      features.webWorkers = typeof Worker !== "undefined";
      features.localStorage = typeof localStorage !== "undefined";
    }

    return features;
  }
}

/**
 * EnvironmentValidator validates environment configuration
 */
export class EnvironmentValidator {
  validate(config: any): any {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.environment) {
      errors.push("Environment name is required");
    }

    // Database configuration
    if (config.database) {
      if (!config.database.host) {
        errors.push("Database host is required");
      }
      if (!config.database.port || config.database.port < 1 || config.database.port > 65535) {
        errors.push("Database port must be between 1 and 65535");
      }
    }

    // Security checks
    if (config.environment === "production") {
      if (!config.security?.enabled) {
        warnings.push("Security should be enabled in production");
      }
      if (config.logging?.level === "debug") {
        warnings.push("Debug logging not recommended in production");
      }
      if (!config.database?.ssl) {
        warnings.push("SSL should be enabled for production database");
      }
    }

    // Development-specific checks
    if (config.environment === "development") {
      if (!config.devTools?.enabled) {
        warnings.push("Development tools should be enabled in development");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, 100 - errors.length * 25 - warnings.length * 10),
    };
  }
}
