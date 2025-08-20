#!/usr/bin/env node

/**
 * Axon Flow - pnpm Install Performance Benchmark
 * Tests if pnpm install completes within the required 60-second target
 */

const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

class InstallBenchmark {
  constructor() {
    this.projectRoot = path.resolve(__dirname, "../..");
    this.tempBackupPath = path.join(this.projectRoot, ".benchmark-backup");
    this.results = [];
  }

  log(message, type = "info") {
    const prefix = {
      error: `${colors.red}✗${colors.reset}`,
      warning: `${colors.yellow}⚠${colors.reset}`,
      success: `${colors.green}✓${colors.reset}`,
      info: `${colors.blue}ℹ${colors.reset}`,
      header: `${colors.cyan}${colors.bold}▶${colors.reset}`,
      timing: `${colors.yellow}⏱${colors.reset}`,
    };

    console.log(`${prefix[type] || prefix.info} ${message}`);
  }

  backupNodeModules() {
    this.log("Backing up current node_modules...", "info");

    const nodeModulesPath = path.join(this.projectRoot, "node_modules");
    const lockfilePath = path.join(this.projectRoot, "pnpm-lock.yaml");

    // Create backup directory
    if (!fs.existsSync(this.tempBackupPath)) {
      fs.mkdirSync(this.tempBackupPath, { recursive: true });
    }

    // Check if node_modules exists
    if (fs.existsSync(nodeModulesPath)) {
      // Instead of moving the entire node_modules, just record its existence
      // Moving large node_modules can be slow and affect benchmark
      fs.writeFileSync(path.join(this.tempBackupPath, ".node_modules_existed"), "true");
      this.log("node_modules exists, will be cleared for benchmark", "info");
    }

    // Backup lockfile
    if (fs.existsSync(lockfilePath)) {
      fs.copyFileSync(lockfilePath, path.join(this.tempBackupPath, "pnpm-lock.yaml"));
      this.log("Lockfile backed up", "success");
    }
  }

  clearNodeModules() {
    this.log("Clearing node_modules and cache...", "info");

    const nodeModulesPath = path.join(this.projectRoot, "node_modules");

    try {
      // Remove node_modules
      if (fs.existsSync(nodeModulesPath)) {
        execSync(`rm -rf "${nodeModulesPath}"`, { cwd: this.projectRoot });
        this.log("node_modules cleared", "success");
      }

      // Clear pnpm store cache for accurate benchmark
      try {
        execSync("pnpm store prune", { cwd: this.projectRoot, stdio: "ignore" });
        this.log("pnpm store pruned", "success");
      } catch (e) {
        this.log("Could not prune pnpm store (non-critical)", "warning");
      }
    } catch (error) {
      this.log(`Failed to clear node_modules: ${error.message}`, "error");
      throw error;
    }
  }

  restoreBackup() {
    this.log("Restoring original state...", "info");

    const lockfileBackup = path.join(this.tempBackupPath, "pnpm-lock.yaml");
    const lockfilePath = path.join(this.projectRoot, "pnpm-lock.yaml");

    // Restore lockfile if it was backed up
    if (fs.existsSync(lockfileBackup)) {
      fs.copyFileSync(lockfileBackup, lockfilePath);
      this.log("Lockfile restored", "success");
    }

    // Clean up backup directory
    if (fs.existsSync(this.tempBackupPath)) {
      fs.rmSync(this.tempBackupPath, { recursive: true, force: true });
    }

    // Note: We don't restore node_modules as pnpm install will recreate it
    this.log("Backup cleaned up", "success");
  }

  runInstallBenchmark(type = "cold") {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      this.log(`Starting ${type} install benchmark...`, "timing");

      // Use spawn for better control and real-time output
      const child = spawn("pnpm", ["install", "--prefer-offline"], {
        cwd: this.projectRoot,
        stdio: "pipe",
        env: { ...process.env, CI: "true" }, // Set CI to avoid interactive prompts
      });

      let output = "";

      child.stdout.on("data", (data) => {
        output += data.toString();
        process.stdout.write(`  ${colors.cyan}│${colors.reset} ${data.toString()}`);
      });

      child.stderr.on("data", (data) => {
        output += data.toString();
        process.stderr.write(`  ${colors.yellow}│${colors.reset} ${data.toString()}`);
      });

      child.on("close", (code) => {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        if (code !== 0) {
          reject(new Error(`pnpm install failed with code ${code}`));
        } else {
          resolve({
            type,
            duration,
            success: duration < 60,
            output,
          });
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  async runBenchmarks() {
    const benchmarks = [];

    try {
      // Cold start benchmark (no node_modules, no cache)
      this.log("\n=== COLD START BENCHMARK ===", "header");
      this.clearNodeModules();
      const coldResult = await this.runInstallBenchmark("cold");
      benchmarks.push(coldResult);

      // Warm cache benchmark (with lockfile)
      this.log("\n=== WARM CACHE BENCHMARK ===", "header");
      this.clearNodeModules();
      const warmResult = await this.runInstallBenchmark("warm");
      benchmarks.push(warmResult);

      // No-op benchmark (everything already installed)
      this.log("\n=== NO-OP BENCHMARK ===", "header");
      const noopResult = await this.runInstallBenchmark("no-op");
      benchmarks.push(noopResult);
    } catch (error) {
      this.log(`Benchmark failed: ${error.message}`, "error");
      throw error;
    }

    return benchmarks;
  }

  formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds.toFixed(2)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    return `${minutes}m ${remainingSeconds}s`;
  }

  generateReport(results) {
    console.log(`\n${  "=".repeat(60)}`);
    this.log("BENCHMARK RESULTS", "header");
    console.log("=".repeat(60));

    const target = 60; // 60 seconds target
    let allPassed = true;

    results.forEach((result) => {
      const status = result.success ? "PASS" : "FAIL";
      const statusColor = result.success ? colors.green : colors.red;
      const icon = result.success ? "✓" : "✗";

      console.log(`\n${colors.bold}${result.type.toUpperCase()} Install:${colors.reset}`);
      console.log(`  Duration: ${this.formatDuration(result.duration)}`);
      console.log(`  Target: < ${target}s`);
      console.log(`  Status: ${statusColor}${icon} ${status}${colors.reset}`);

      if (!result.success) {
        allPassed = false;
        const overtime = result.duration - target;
        console.log(`  ${colors.yellow}Exceeded by: ${this.formatDuration(overtime)}${colors.reset}`);
      }
    });

    // Summary
    console.log(`\n${  "=".repeat(60)}`);
    console.log(`${colors.bold}SUMMARY:${colors.reset}`);

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    console.log(`  Average Duration: ${this.formatDuration(avgDuration)}`);
    console.log(`  Fastest: ${this.formatDuration(Math.min(...results.map((r) => r.duration)))}`);
    console.log(`  Slowest: ${this.formatDuration(Math.max(...results.map((r) => r.duration)))}`);

    const finalStatus = allPassed ? "PASSED" : "FAILED";
    const finalColor = allPassed ? colors.green : colors.red;

    console.log(`\n${  "=".repeat(60)}`);
    console.log(`${finalColor}${colors.bold}Performance Benchmark ${finalStatus}${colors.reset}`);
    console.log(`${"=".repeat(60)  }\n`);

    if (!allPassed) {
      console.log(`${colors.yellow}⚠ Performance Optimization Suggestions:${colors.reset}`);
      console.log("  1. Ensure pnpm store is properly configured");
      console.log("  2. Check network connectivity and registry settings");
      console.log("  3. Consider using --prefer-offline for faster installs");
      console.log("  4. Verify no unnecessary dependencies in package.json");
      console.log("  5. Check for large packages that might slow installation\n");
    }

    return allPassed ? 0 : 1;
  }

  async run() {
    console.log(`${colors.cyan}${colors.bold}Axon Flow - pnpm Install Performance Benchmark${colors.reset}`);
    console.log("=".repeat(60));
    console.log(`${colors.yellow}Target: < 60 seconds for initial workspace setup${colors.reset}`);
    console.log(`${"=".repeat(60)  }\n`);

    try {
      // Check if pnpm is installed
      try {
        execSync("pnpm --version", { stdio: "ignore" });
      } catch (error) {
        this.log("pnpm is not installed or not in PATH", "error");
        return 1;
      }

      // Backup current state
      this.backupNodeModules();

      // Run benchmarks
      const results = await this.runBenchmarks();

      // Generate report
      const exitCode = this.generateReport(results);

      // Restore original state
      this.restoreBackup();

      // Final install to restore node_modules
      if (exitCode === 0) {
        this.log("\nRestoring node_modules with final install...", "info");
        execSync("pnpm install --prefer-offline", {
          cwd: this.projectRoot,
          stdio: "inherit",
        });
      }

      return exitCode;
    } catch (error) {
      this.log(`Benchmark failed: ${error.message}`, "error");

      // Try to restore on error
      try {
        this.restoreBackup();
      } catch (restoreError) {
        this.log("Failed to restore backup", "error");
      }

      return 1;
    }
  }
}

// Run benchmark
const benchmark = new InstallBenchmark();
benchmark
  .run()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error(`${colors.red}Benchmark failed with error:${colors.reset}`, error);
    process.exit(1);
  });
