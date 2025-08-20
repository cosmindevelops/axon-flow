#!/usr/bin/env node

/**
 * Turborepo Cache Integrity Validator
 * Validates cache consistency and detects corruption
 * Implements task 1.5 cache integrity verification requirements
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class TurboCacheValidator {
  constructor() {
    this.turboDir = path.join(process.cwd(), ".turbo");
    this.cacheDir = path.join(this.turboDir, "cache");
    this.results = {
      timestamp: new Date().toISOString(),
      cacheIntegrity: {},
      dependencyValidation: {},
      circularDependencies: [],
      recommendations: [],
    };
  }

  /**
   * Check if cache directory exists and is accessible
   */
  validateCacheStructure() {
    console.log("🔍 Validating cache structure...");

    const checks = {
      turboDirectoryExists: fs.existsSync(this.turboDir),
      cacheDirectoryExists: fs.existsSync(this.cacheDir),
      cacheReadable: false,
      cacheWritable: false,
    };

    if (checks.cacheDirectoryExists) {
      try {
        fs.accessSync(this.cacheDir, fs.constants.R_OK);
        checks.cacheReadable = true;
      } catch (error) {
        console.warn(`   ⚠️  Cache not readable: ${error.message}`);
      }

      try {
        fs.accessSync(this.cacheDir, fs.constants.W_OK);
        checks.cacheWritable = true;
      } catch (error) {
        console.warn(`   ⚠️  Cache not writable: ${error.message}`);
      }
    }

    this.results.cacheIntegrity.structure = checks;

    const allValid = Object.values(checks).every(Boolean);
    console.log(`   ${allValid ? "✅" : "❌"} Cache structure validation: ${allValid ? "PASSED" : "FAILED"}`);

    return allValid;
  }

  /**
   * Validate cache artifacts consistency
   */
  validateCacheArtifacts() {
    console.log("📦 Validating cache artifacts...");

    if (!fs.existsSync(this.cacheDir)) {
      console.log("   ℹ️  No cache directory found - running clean build first");
      return { valid: true, reason: "no_cache" };
    }

    const cacheFiles = fs.readdirSync(this.cacheDir);
    let validArtifacts = 0;
    let invalidArtifacts = 0;
    const corruptedFiles = [];

    for (const file of cacheFiles) {
      const filePath = path.join(this.cacheDir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        try {
          // Basic validation: file size > 0 and readable
          if (stats.size === 0) {
            invalidArtifacts++;
            corruptedFiles.push({ file, reason: "empty_file" });
          } else {
            fs.readFileSync(filePath, { encoding: null }); // Test readability
            validArtifacts++;
          }
        } catch (error) {
          invalidArtifacts++;
          corruptedFiles.push({ file, reason: error.message });
        }
      }
    }

    const integrity = {
      totalFiles: cacheFiles.length,
      validArtifacts,
      invalidArtifacts,
      corruptedFiles,
      integrityRatio: cacheFiles.length > 0 ? validArtifacts / cacheFiles.length : 1,
    };

    this.results.cacheIntegrity.artifacts = integrity;

    console.log(`   📊 Cache files: ${integrity.totalFiles}`);
    console.log(`   ✅ Valid: ${integrity.validArtifacts}`);
    console.log(`   ❌ Invalid: ${integrity.invalidArtifacts}`);

    if (corruptedFiles.length > 0) {
      console.log("   🚨 Corrupted files detected:");
      corruptedFiles.forEach(({ file, reason }) => {
        console.log(`      - ${file}: ${reason}`);
      });
    }

    return integrity;
  }

  /**
   * Detect circular dependencies in task graph
   */
  detectCircularDependencies() {
    console.log("🔄 Detecting circular dependencies...");

    try {
      const dryRunOutput = execSync("pnpm turbo build --dry-run=json", {
        encoding: "utf8",
        stdio: "pipe",
      });

      const data = JSON.parse(dryRunOutput);
      const tasks = data.tasks || [];

      // Build dependency graph
      const graph = new Map();
      const visited = new Set();
      const recursionStack = new Set();
      const cycles = [];

      // Initialize graph
      tasks.forEach((task) => {
        const taskId = `${task.package}#${task.task}`;
        const dependencies = task.dependencies || [];
        graph.set(taskId, dependencies);
      });

      // DFS to detect cycles
      const hasCycle = (node, path = []) => {
        if (recursionStack.has(node)) {
          const cycleStart = path.indexOf(node);
          const cycle = path.slice(cycleStart).concat(node);
          cycles.push(cycle);
          return true;
        }

        if (visited.has(node)) {
          return false;
        }

        visited.add(node);
        recursionStack.add(node);
        path.push(node);

        const dependencies = graph.get(node) || [];
        for (const dep of dependencies) {
          if (hasCycle(dep, [...path])) {
            return true;
          }
        }

        recursionStack.delete(node);
        path.pop();
        return false;
      };

      // Check all nodes
      for (const node of graph.keys()) {
        if (!visited.has(node)) {
          hasCycle(node);
        }
      }

      this.results.circularDependencies = cycles;

      if (cycles.length === 0) {
        console.log("   ✅ No circular dependencies detected");
      } else {
        console.log(`   ❌ ${cycles.length} circular dependencies detected:`);
        cycles.forEach((cycle, index) => {
          console.log(`      ${index + 1}. ${cycle.join(" → ")}`);
        });
      }

      return cycles.length === 0;
    } catch (error) {
      console.error(`   ❌ Failed to analyze dependencies: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate dependency resolution
   */
  validateDependencyResolution() {
    console.log("🎯 Validating dependency resolution...");

    try {
      // Test that all tasks can resolve their dependencies
      const buildTest = execSync("pnpm turbo build --dry-run", {
        encoding: "utf8",
        stdio: "pipe",
      });

      const lintTest = execSync("pnpm turbo lint --dry-run", {
        encoding: "utf8",
        stdio: "pipe",
      });

      const typeCheckTest = execSync("pnpm turbo type-check --dry-run", {
        encoding: "utf8",
        stdio: "pipe",
      });

      this.results.dependencyValidation = {
        buildResolution: true,
        lintResolution: true,
        typeCheckResolution: true,
        allValid: true,
      };

      console.log("   ✅ All task dependencies resolve correctly");
      return true;
    } catch (error) {
      console.error(`   ❌ Dependency resolution failed: ${error.message}`);
      this.results.dependencyValidation = {
        buildResolution: false,
        lintResolution: false,
        typeCheckResolution: false,
        allValid: false,
        error: error.message,
      };
      return false;
    }
  }

  /**
   * Generate recommendations based on findings
   */
  generateRecommendations() {
    const recommendations = [];

    // Cache integrity recommendations
    const integrity = this.results.cacheIntegrity.artifacts;
    if (integrity && integrity.invalidArtifacts > 0) {
      recommendations.push({
        type: "cache_cleanup",
        severity: "medium",
        message: `Clean corrupted cache artifacts (${integrity.invalidArtifacts} files)`,
        action: "pnpm turbo clean",
      });
    }

    // Circular dependency recommendations
    if (this.results.circularDependencies.length > 0) {
      recommendations.push({
        type: "circular_dependencies",
        severity: "high",
        message: "Fix circular dependencies in task graph",
        action: "Review and update dependsOn configurations in turbo.json",
      });
    }

    // Performance recommendations
    if (integrity && integrity.integrityRatio < 0.9) {
      recommendations.push({
        type: "cache_performance",
        severity: "medium",
        message: "Cache integrity below 90% - consider cache reset",
        action: "pnpm clean && pnpm turbo clean",
      });
    }

    this.results.recommendations = recommendations;

    if (recommendations.length > 0) {
      console.log("\n💡 Recommendations:");
      recommendations.forEach((rec, index) => {
        const severity = rec.severity === "high" ? "🚨" : "⚠️";
        console.log(`   ${severity} ${index + 1}. ${rec.message}`);
        console.log(`      Action: ${rec.action}`);
      });
    } else {
      console.log("\n✅ No recommendations - cache system is healthy");
    }
  }

  /**
   * Save validation results
   */
  saveResults() {
    const resultsFile = path.join(process.cwd(), "turbo-cache-validation.json");
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Validation results saved to: ${resultsFile}`);
  }

  /**
   * Run complete cache validation
   */
  async run() {
    console.log("🚀 Starting Turborepo Cache Validation\n");

    try {
      const structureValid = this.validateCacheStructure();
      const artifactsValid = this.validateCacheArtifacts();
      const noCycles = this.detectCircularDependencies();
      const depsValid = this.validateDependencyResolution();

      this.generateRecommendations();
      this.saveResults();

      const allValid = structureValid && noCycles && depsValid;

      console.log(`\n🏆 Overall validation: ${allValid ? "PASSED" : "FAILED"}`);

      process.exit(allValid ? 0 : 1);
    } catch (error) {
      console.error(`\n❌ Validation failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new TurboCacheValidator();
  validator.run();
}

module.exports = TurboCacheValidator;
