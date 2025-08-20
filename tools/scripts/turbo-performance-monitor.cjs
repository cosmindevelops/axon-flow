#!/usr/bin/env node

/**
 * Turborepo Performance Monitor
 * Tracks build performance, cache efficiency, and parallel execution metrics
 * Implements task 1.5 requirements V1.10, V1.11, V1.16
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PERFORMANCE_TARGETS = {
  BUILD_TIME_SECONDS: 30,
  CACHE_HIT_RATIO: 0.8,
  PARALLEL_EFFICIENCY: 0.7,
};

const RESULTS_FILE = path.join(process.cwd(), "performance-metrics.json");

class TurboPerformanceMonitor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      buildMetrics: {},
      cacheMetrics: {},
      parallelMetrics: {},
      validationResults: {},
    };
  }

  /**
   * Benchmark build performance (V1.10)
   */
  async benchmarkBuild() {
    console.log("🔥 Benchmarking build performance...");

    // Clean build
    const cleanStart = Date.now();
    try {
      execSync("pnpm turbo clean", { stdio: "pipe" });
      execSync("pnpm turbo build", { stdio: "pipe" });
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
    const cleanTime = (Date.now() - cleanStart) / 1000;

    // Cached build
    const cachedStart = Date.now();
    try {
      execSync("pnpm turbo build", { stdio: "pipe" });
    } catch (error) {
      throw new Error(`Cached build failed: ${error.message}`);
    }
    const cachedTime = (Date.now() - cachedStart) / 1000;

    this.results.buildMetrics = {
      cleanBuildTimeSeconds: cleanTime,
      cachedBuildTimeSeconds: cachedTime,
      speedupRatio: cleanTime / cachedTime,
      passesTarget: cleanTime <= PERFORMANCE_TARGETS.BUILD_TIME_SECONDS,
    };

    console.log(`   ✅ Clean build: ${cleanTime}s`);
    console.log(`   ⚡ Cached build: ${cachedTime}s`);
    console.log(`   📊 Speedup: ${this.results.buildMetrics.speedupRatio.toFixed(2)}x`);
  }

  /**
   * Test cache system functionality (V1.11)
   */
  async testCacheSystem() {
    console.log("📦 Testing cache system functionality...");

    const turboOutput = execSync("pnpm turbo build --dry-run=json", {
      encoding: "utf8",
      stdio: "pipe",
    });

    const dryRunData = JSON.parse(turboOutput);
    const tasks = dryRunData.tasks || [];

    // Run actual build and capture output
    const buildOutput = execSync("pnpm turbo build --output-logs=hash-only", {
      encoding: "utf8",
      stdio: "pipe",
    });

    // Count cache hits vs misses
    const cacheHits = (buildOutput.match(/cache hit/g) || []).length;
    const cacheMisses = (buildOutput.match(/cache miss/g) || []).length;
    const totalTasks = cacheHits + cacheMisses;

    const cacheHitRatio = totalTasks > 0 ? cacheHits / totalTasks : 0;

    this.results.cacheMetrics = {
      totalTasks,
      cacheHits,
      cacheMisses,
      cacheHitRatio,
      passesTarget: cacheHitRatio >= PERFORMANCE_TARGETS.CACHE_HIT_RATIO,
    };

    console.log(`   📊 Cache hit ratio: ${(cacheHitRatio * 100).toFixed(1)}%`);
    console.log(`   🎯 Target: ${PERFORMANCE_TARGETS.CACHE_HIT_RATIO * 100}%`);
  }

  /**
   * Validate parallel execution configuration (V1.16)
   */
  async validateParallelExecution() {
    console.log("⚡ Validating parallel execution...");

    const start = Date.now();
    try {
      execSync("pnpm turbo lint type-check --parallel", { stdio: "pipe" });
    } catch (error) {
      console.warn(`Parallel execution had issues: ${error.message}`);
    }
    const parallelTime = (Date.now() - start) / 1000;

    // Run sequentially for comparison
    const seqStart = Date.now();
    try {
      execSync("pnpm turbo lint && pnpm turbo type-check", { stdio: "pipe" });
    } catch (error) {
      console.warn(`Sequential execution had issues: ${error.message}`);
    }
    const sequentialTime = (Date.now() - seqStart) / 1000;

    const efficiency = sequentialTime > 0 ? (sequentialTime - parallelTime) / sequentialTime : 0;

    this.results.parallelMetrics = {
      parallelTimeSeconds: parallelTime,
      sequentialTimeSeconds: sequentialTime,
      efficiency,
      passesTarget: efficiency >= PERFORMANCE_TARGETS.PARALLEL_EFFICIENCY,
    };

    console.log(`   ⚡ Parallel: ${parallelTime}s`);
    console.log(`   📏 Sequential: ${sequentialTime}s`);
    console.log(`   📈 Efficiency: ${(efficiency * 100).toFixed(1)}%`);
  }

  /**
   * Validate all requirements
   */
  validate() {
    console.log("\n🔍 Validating performance requirements...");

    const validations = {
      V1_10_BUILD_TIME: {
        description: "Build commands execute within 30 seconds",
        passed: this.results.buildMetrics.passesTarget,
        actual: `${this.results.buildMetrics.cleanBuildTimeSeconds}s`,
        target: `${PERFORMANCE_TARGETS.BUILD_TIME_SECONDS}s`,
      },
      V1_11_CACHE_SYSTEM: {
        description: "Cache system functionality with 80%+ efficiency",
        passed: this.results.cacheMetrics.passesTarget,
        actual: `${(this.results.cacheMetrics.cacheHitRatio * 100).toFixed(1)}%`,
        target: `${PERFORMANCE_TARGETS.CACHE_HIT_RATIO * 100}%`,
      },
      V1_16_PARALLEL_EXECUTION: {
        description: "Parallel execution configuration effective",
        passed: this.results.parallelMetrics.passesTarget,
        actual: `${(this.results.parallelMetrics.efficiency * 100).toFixed(1)}%`,
        target: `${PERFORMANCE_TARGETS.PARALLEL_EFFICIENCY * 100}%`,
      },
    };

    this.results.validationResults = validations;

    Object.entries(validations).forEach(([key, validation]) => {
      const status = validation.passed ? "✅" : "❌";
      console.log(`   ${status} ${key}: ${validation.description}`);
      console.log(`      Actual: ${validation.actual} | Target: ${validation.target}`);
    });

    const allPassed = Object.values(validations).every((v) => v.passed);
    console.log(`\n🏆 Overall validation: ${allPassed ? "PASSED" : "FAILED"}`);

    return allPassed;
  }

  /**
   * Save results to file
   */
  saveResults() {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to: ${RESULTS_FILE}`);
  }

  /**
   * Run complete performance monitoring suite
   */
  async run() {
    console.log("🚀 Starting Turborepo Performance Monitor\n");

    try {
      await this.benchmarkBuild();
      await this.testCacheSystem();
      await this.validateParallelExecution();

      const passed = this.validate();
      this.saveResults();

      process.exit(passed ? 0 : 1);
    } catch (error) {
      console.error(`\n❌ Monitoring failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new TurboPerformanceMonitor();
  monitor.run();
}

module.exports = TurboPerformanceMonitor;
