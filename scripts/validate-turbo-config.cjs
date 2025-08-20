#!/usr/bin/env node

/**
 * Turbo Configuration Validator
 * Validates turbo.json changes for correctness and performance
 * Ensures pipeline definitions follow best practices
 */

const fs = require("fs");
const path = require("path");

class TurboConfigValidator {
  constructor() {
    this.config = this.loadTurboConfig();
    this.errors = [];
    this.warnings = [];
  }

  loadTurboConfig() {
    try {
      return JSON.parse(fs.readFileSync("turbo.json", "utf8"));
    } catch (error) {
      this.errors.push(`Failed to load turbo.json: ${error.message}`);
      return null;
    }
  }

  validatePipeline() {
    if (!this.config.pipeline) {
      this.errors.push("Pipeline configuration is missing");
      return;
    }

    const requiredTasks = ["build", "test", "lint", "dev"];
    const {pipeline} = this.config;

    for (const task of requiredTasks) {
      if (!pipeline[task]) {
        this.errors.push(`Required pipeline task '${task}' is missing`);
      }
    }

    // Validate task dependencies
    for (const [taskName, taskConfig] of Object.entries(pipeline)) {
      if (taskConfig.dependsOn) {
        for (const dep of taskConfig.dependsOn) {
          if (dep.startsWith("^") && !pipeline[dep.substring(1)]) {
            this.warnings.push(`Task '${taskName}' depends on undefined task '${dep}'`);
          }
        }
      }

      // Validate input/output patterns
      if (taskConfig.outputs && taskConfig.outputs.length === 0) {
        this.warnings.push(`Task '${taskName}' has empty outputs array, consider using null`);
      }

      if (taskConfig.inputs && taskConfig.inputs.length === 0) {
        this.warnings.push(`Task '${taskName}' has empty inputs array, may cause cache issues`);
      }
    }
  }

  validateCacheSettings() {
    const { pipeline } = this.config;

    for (const [taskName, taskConfig] of Object.entries(pipeline)) {
      // Check for appropriate cache settings
      if (taskName === "dev" && taskConfig.cache !== false) {
        this.warnings.push("Dev task should typically have cache disabled");
      }

      if (taskName === "clean" && taskConfig.cache !== false) {
        this.warnings.push("Clean task should have cache disabled");
      }

      // Check output patterns
      if (taskConfig.outputs) {
        for (const output of taskConfig.outputs) {
          if (!output.includes("*") && !fs.existsSync(path.dirname(output))) {
            this.warnings.push(`Output path '${output}' in task '${taskName}' may not exist`);
          }
        }
      }
    }
  }

  validateRemoteCaching() {
    if (this.config.remoteCache) {
      if (!process.env.TURBO_TOKEN && !process.env.TURBO_TEAM) {
        this.warnings.push("Remote caching enabled but TURBO_TOKEN/TURBO_TEAM not configured");
      }
    }

    if (this.config.signature) {
      this.warnings.push("Custom signature configuration detected, ensure it's necessary");
    }
  }

  validateEnvironmentVariables() {
    const { globalEnv, pipeline } = this.config;

    if (globalEnv) {
      const sensitiveVars = ["API_KEY", "SECRET", "TOKEN", "PASSWORD"];
      for (const envVar of globalEnv) {
        if (sensitiveVars.some((sensitive) => envVar.includes(sensitive))) {
          this.warnings.push(`Potentially sensitive environment variable '${envVar}' in globalEnv`);
        }
      }
    }

    // Check task-specific environment variables
    for (const [taskName, taskConfig] of Object.entries(pipeline)) {
      if (taskConfig.env) {
        for (const envVar of taskConfig.env) {
          if (!process.env[envVar]) {
            this.warnings.push(`Environment variable '${envVar}' required by '${taskName}' is not set`);
          }
        }
      }
    }
  }

  async runValidation() {
    if (!this.config) {
      console.error("❌ Could not load turbo.json");
      process.exit(1);
    }

    console.log("🔍 Validating turbo.json changes...");

    this.validatePipeline();
    this.validateCacheSettings();
    this.validateRemoteCaching();
    this.validateEnvironmentVariables();

    // Report results
    if (this.errors.length > 0) {
      console.error("❌ Turbo configuration errors:");
      this.errors.forEach((error) => { console.error(`  • ${error}`); });
      process.exit(1);
    }

    if (this.warnings.length > 0) {
      console.warn("⚠️  Turbo configuration warnings:");
      this.warnings.forEach((warning) => { console.warn(`  • ${warning}`); });
    }

    console.log("✅ Turbo configuration validation completed successfully");
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new TurboConfigValidator();
  validator.runValidation().catch((error) => {
    console.error("❌ Turbo config validation failed:", error.message);
    process.exit(1);
  });
}

module.exports = TurboConfigValidator;
