#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 * │                        🚀 AXON FLOW UNIFIED DEVELOPMENT TOOLS 🚀                        │
 * ├─────────────────────────────────────────────────────────────────────────────────────────┤
 * │                   🎯 ONE SCRIPT TO RULE THEM ALL 🎯                                    │
 * │  Comprehensive development environment validation and analysis toolkit                  │
 * │  Modular architecture with 7 specialized tool categories for development tasks         │
 * └──────────────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * 📂 ARCHITECTURE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ┌── 📦 Base Architecture ────────────────────────────────────────────────────────────────┐
 * │ • AxonTool (Base Class)      → Common utilities, version comparison, result handling   │
 * │ • AxonToolsCLI (Main CLI)    → Command routing, help system, execution management      │
 * │ • Color System & Logging     → Unified output formatting and status indicators         │
 * └────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌── 🔧 Tool Categories ──────────────────────────────────────────────────────────────────┐
 * │                                                                                        │
 * │ 🌍 ENVIRONMENT TOOLS (EnvironmentTool)                                                 │
 * │   • Development environment validation                                                 │
 * │   • Node.js, pnpm, Git configuration checks                                            │
 * │   • System resource analysis and Docker availability                                   │
 * │                                                                                        │
 * │ ⚡ TURBO TOOLS (TurboTool)                                                              │
 * │   • Cache optimization and performance analysis                                        │
 * │   • Parallel execution efficiency monitoring                                           │
 * │   • Configuration validation and cache integrity                                       │
 * │                                                                                        │
 * │ 🛡️ SECURITY TOOLS (SecurityTool)                                                       │
 * │   • Vulnerability scanning and audit processing                                        │
 * │   • Dependency security analysis                                                       │
 * │   • Security report generation                                                         │
 * │                                                                                        │
 * │ ✅ VALIDATION TOOLS (ValidationTool)                                                   │
 * │   • Quality gates validation (ESLint, Prettier, Husky)                                 │
 * │   • Documentation completeness checking                                                │
 * │   • Project structure validation                                                       │
 * │                                                                                        │
 * │ 🔧 UTILITY TOOLS (UtilityTool)                                                         │
 * │   • Platform detection and configuration                                               │
 * │   • Environment debugging and workspace management                                     │
 * │   • Dependency synchronization and analysis                                            │
 * │                                                                                        │
 * │ 🏎️ PERFORMANCE TOOLS (PerformanceTool)                                                 │
 * │   • Build performance benchmarking                                                     │
 * │   • Startup performance profiling                                                      │
 * │   • Performance optimization recommendations                                           │
 * │                                                                                        │
 * │ 🔍 QUALITY TOOLS (QualityTool)                                                         │
 * │   • Phantom dependency detection and analysis                                          │
 * │   • Comprehensive monorepo health checking                                             │
 * │   • Staged file testing for efficient CI/CD                                            │
 * └────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * 🎮 COMMAND REFERENCE GUIDE
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * 🚀 USAGE: node tools/scripts/axon-tools.cjs <command> <subcommand> [options]
 *
 * ┌── 🌍 ENVIRONMENT COMMANDS ────────────────────────────────────────────────────────────┐
 * │ node axon-tools.cjs env validate   → Validate environment configuration               │
 * └───────────────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌── ⚡ TURBO COMMANDS ───────────────────────────────────────────────────────────────────┐
 * │ node axon-tools.cjs turbo optimize      → Optimize cache performance                  │
 * │ node axon-tools.cjs turbo analyze       → Analyze parallel execution                  │
 * │ node axon-tools.cjs turbo monitor       → Monitor build performance                   │
 * │ node axon-tools.cjs turbo validate-cache    → Validate cache integrity                │
 * │ node axon-tools.cjs turbo validate-config   → Validate turbo.json config              │
 * └───────────────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌── 🛡️ SECURITY COMMANDS ───────────────────────────────────────────────────────────────┐
 * │ node axon-tools.cjs security audit → Run comprehensive security audit                 │
 * │ node axon-tools.cjs security check → Process piped audit JSON                         │
 * │ pnpm audit --json | node axon-tools.cjs security check                                │
 * └───────────────────────────────────────────────────────────────────────────────────────┘

 * ┌── ✅ VALIDATION COMMANDS ────────────────────────────────────────────────────────────┐
 * │ node axon-tools.cjs validate quality         → ESLint, Prettier, Husky validation    │
 * │ node axon-tools.cjs validate docs            → Documentation completeness check      │
 * │ node axon-tools.cjs validate structure       → Project structure validation          │
 * │ node axon-tools.cjs validate pnpm            → PNPM configuration validation         │
 * │ node axon-tools.cjs validate package-changes → Package.json changes validation       │
 * │ node axon-tools.cjs validate builds          → Build verification across packages    │
 * └──────────────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌── 🔧 UTILITY COMMANDS ────────────────────────────────────────────────────────────────┐
 * │ node axon-tools.cjs utils detect-platform              → Detect platform config       │
 * │ node axon-tools.cjs utils debug-env                    → Environment debug report     │
 * │ node axon-tools.cjs utils sync-deps                    → Sync workspace dependencies  │
 * └───────────────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌── 🏎️ PERFORMANCE COMMANDS ────────────────────────────────────────────────────────────┐
 * │ node axon-tools.cjs perf benchmark-install → Benchmark pnpm install performance       │
 * │ node axon-tools.cjs perf profile-startup   → Profile Node.js startup performance      │
 * └───────────────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌── 🔍 QUALITY COMMANDS ─────────────────────────────────────────────────────────────────┐
 * │ node axon-tools.cjs quality phantom-deps   → Check for phantom dependencies            │
 * │ node axon-tools.cjs quality health-check   → Comprehensive monorepo health check       │
 * │ node axon-tools.cjs quality test-staged    → Run tests for staged files only           │
 * └────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * 🏗️ IMPORTANT SECTIONS BREAKDOWN
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * 📦 Lines 180-270:   BASE INFRASTRUCTURE
 *    • ANSI color system for terminal output
 *    • Global utility functions (log, logSection, logSuccess, etc.)
 *    • AxonTool base class with common functionality
 *
 * 🌍 Lines 282-723:   ENVIRONMENT COMMANDS
 *    • EnvironmentTool class with validation methods
 *    • Node.js, pnpm, Git, Docker, and system resource checks
 *    • Development environment configuration and recommendations
 *
 * ⚡ Lines 729-2056:  TURBO COMMANDS
 *    • TurboTool class with performance optimization methods
 *    • Cache analysis, parallel execution monitoring
 *    • Configuration validation and integrity checks
 *
 * 🛡️ Lines 2062-2322: SECURITY COMMANDS
 *    • SecurityTool class with vulnerability analysis
 *    • Audit data processing and security report generation
 *    • Risk assessment and remediation recommendations
 *
 * ✅ Lines 2328-3341: VALIDATION COMMANDS
 *    • ValidationTool class with quality gate validation
 *    • ESLint, Prettier, Husky, TypeScript, and test validation
 *    • Documentation and project structure validation
 *
 * 🔧 Lines 3347-3872: UTILITY COMMANDS
 *    • UtilityTool class with package creation and workspace management
 *    • Platform detection, environment debugging, dependency sync
 *    • Package generation with consistent structure
 *
 * 🏎️ Lines 3878-4298: PERFORMANCE COMMANDS
 *    • PerformanceTool class with benchmarking and profiling
 *    • Build performance measurement and startup profiling
 *    • Performance optimization recommendations
 *
 * 🔍 Lines 4304-4984: QUALITY COMMANDS
 *    • QualityTool class with dependency and health analysis
 *    • Phantom dependency detection and monorepo health checks
 *    • Staged file testing for efficient CI/CD workflows
 *
 * 🎮 Lines 4986-5186: MAIN CLI INTERFACE
 *    • AxonToolsCLI class with command routing
 *    • Help system and error handling
 *    • Command execution and argument processing
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * 💡 QUICK START GUIDE
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * 1️⃣ Environment Validation:
 *    node axon-tools.cjs env validate       # Validate development environment
 *
 * 2️⃣ Daily Development:
 *    node axon-tools.cjs env validate       # Check environment health
 *    node axon-tools.cjs validate quality   # Run quality gates
 *    node axon-tools.cjs turbo monitor      # Check build performance
 *
 * 3️⃣ Performance Optimization:
 *    node axon-tools.cjs turbo optimize     # Analyze cache performance
 *    node axon-tools.cjs turbo analyze      # Check parallel efficiency
 *
 * 4️⃣ Security & Quality:
 *    node axon-tools.cjs security audit     # Security vulnerability scan
 *    node axon-tools.cjs validate docs      # Documentation completeness
 *    node axon-tools.cjs validate structure # Project structure check
 *
 * 5️⃣ Get Help:
 *    node axon-tools.cjs --help            # Show all commands
 *    node axon-tools.cjs <command> --help  # Command-specific help
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

// Global utilities
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  const border = "=".repeat(60);
  log(`\n${border}`, colors.cyan);
  log(`${title}`, colors.cyan + colors.bold);
  log(border, colors.cyan);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Base class for all tools
class AxonTool {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      timestamp: new Date().toISOString(),
      success: false,
      warnings: [],
      errors: [],
    };
  }

  saveResults(filename) {
    // Create temp reports directory if it doesn't exist
    const reportsDir = path.join(this.projectRoot, ".temp", "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const resultsFile = path.join(reportsDir, filename);
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    log(`💾 Results saved to: ${resultsFile}`, colors.cyan);
  }

  compareVersions(a, b) {
    const aParts = a.split(".").map(Number);
    const bParts = b.split(".").map(Number);
    const maxLength = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < maxLength; i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }

    return 0;
  }
}

// ============================================================================
// ENVIRONMENT COMMANDS
// ============================================================================

class EnvironmentTool extends AxonTool {
  /**
   * Check Node.js version
   */
  checkNodeVersion() {
    log("🔍 Checking Node.js version...", colors.cyan);

    try {
      const nodeVersion = process.version;
      const requiredVersion = "24.6.0";

      this.results.checks = this.results.checks || {};
      this.results.checks.node = {
        current: nodeVersion,
        required: `>=${requiredVersion}`,
        valid: this.compareVersions(nodeVersion.slice(1), requiredVersion) >= 0,
      };

      if (this.results.checks.node.valid) {
        logSuccess(`Node.js ${nodeVersion} (meets requirement)`);
      } else {
        logError(`Node.js ${nodeVersion} (requires >= ${requiredVersion})`);
      }
    } catch (error) {
      logError(`Failed to check Node.js version: ${error.message}`);
      this.results.checks.node = { valid: false, error: error.message };
    }

    return this.results.checks.node.valid;
  }

  /**
   * Check pnpm version and installation
   */
  checkPnpmVersion() {
    log("📦 Checking pnpm version...", colors.cyan);

    try {
      const pnpmVersion = execSync("pnpm --version", { encoding: "utf8" }).trim();
      const requiredVersion = "10.15.0";

      this.results.checks = this.results.checks || {};
      this.results.checks.pnpm = {
        current: pnpmVersion,
        required: `>=${requiredVersion}`,
        valid: this.compareVersions(pnpmVersion, requiredVersion) >= 0,
      };

      if (this.results.checks.pnpm.valid) {
        logSuccess(`pnpm ${pnpmVersion} (meets requirement)`);
      } else {
        logError(`pnpm ${pnpmVersion} (requires >= ${requiredVersion})`);
      }
    } catch {
      logError("pnpm not found or not working");
      this.results.checks.pnpm = { valid: false, error: "pnpm not found" };
      logInfo("To install pnpm: npm install -g pnpm@latest");
    }

    return this.results.checks.pnpm.valid;
  }

  /**
   * Validate development environment
   */
  async validateDev() {
    logSection("🔍 DEVELOPMENT ENVIRONMENT VALIDATION");

    await this.executeCheck("node_version", "Node.js Version", () => this.validateNodeVersion());

    await this.executeCheck("pnpm_version", "PNPM Package Manager", () => this.validatePnpmVersion());

    await this.executeCheck("docker_availability", "Docker Availability", () => this.validateDockerAvailability());

    await this.executeCheck("git_configuration", "Git Configuration", () => this.validateGitConfiguration());

    await this.executeCheck("system_resources", "System Resources", () => this.validateSystemResources());

    const isValid = this.generateValidationReport();
    this.saveResults("dev-env-validation-report.json");

    process.exit(isValid ? 0 : 1);
  }

  /**
   * Execute a validation check
   */
  async executeCheck(name, description, checkFn) {
    log(`\n🔍 ${description}`, colors.blue);

    try {
      const result = await checkFn();
      this.results.checks = this.results.checks || {};
      this.results.checks[name] = { description, ...result };

      if (result.success) {
        logSuccess(`${description} - PASSED`);
      } else {
        logError(`${description} - FAILED`);
        if (result.error) logError(`Error: ${result.error}`);
      }

      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warning) => {
          logWarning(warning);
        });
      }
    } catch (error) {
      logError(`${description} - ERROR: ${error.message}`);
      this.results.checks[name] = {
        description,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate Node.js version compatibility
   */
  async validateNodeVersion() {
    const requiredVersion = "24.6.0";
    const currentVersion = process.version.slice(1); // Remove 'v' prefix

    const parseVersion = (version) => version.split(".").map(Number);
    const [reqMajor = 0, reqMinor = 0, reqPatch = 0] = parseVersion(requiredVersion);
    const [curMajor = 0, curMinor = 0, curPatch = 0] = parseVersion(currentVersion);

    const isCompatible =
      curMajor > reqMajor ||
      (curMajor === reqMajor && curMinor > reqMinor) ||
      (curMajor === reqMajor && curMinor === reqMinor && curPatch >= reqPatch);

    if (!isCompatible) {
      return {
        success: false,
        error: `Node.js ${requiredVersion}+ required, found ${currentVersion}`,
        recommendations: [
          `Upgrade Node.js to version ${requiredVersion} or higher`,
          "Use nvm to manage Node.js versions: https://github.com/nvm-sh/nvm",
        ],
      };
    }

    const warnings = [];
    if (curMajor > Number(reqMajor) + 2) {
      warnings.push(`Using very recent Node.js ${currentVersion}, ensure compatibility`);
    }

    return {
      success: true,
      details: `Node.js ${currentVersion} (compatible with ${requiredVersion}+)`,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate PNPM installation and version
   */
  async validatePnpmVersion() {
    try {
      const version = execSync("pnpm --version", { encoding: "utf8" }).trim();
      const requiredVersion = "10.15.0";

      const parseVersion = (v) => v.split(".").map(Number);
      const [reqMajor = 0, reqMinor = 0, reqPatch = 0] = parseVersion(requiredVersion);
      const [curMajor = 0, curMinor = 0, curPatch = 0] = parseVersion(version);

      const isCompatible =
        curMajor > reqMajor ||
        (curMajor === reqMajor && curMinor > reqMinor) ||
        (curMajor === reqMajor && curMinor === reqMinor && curPatch >= reqPatch);

      if (!isCompatible) {
        return {
          success: false,
          error: `PNPM ${requiredVersion}+ required, found ${version}`,
          recommendations: [
            `Upgrade PNPM: npm install -g pnpm@latest`,
            `Or use corepack: corepack enable && corepack prepare pnpm@latest --activate`,
          ],
        };
      }

      return {
        success: true,
        details: `PNPM ${version} (compatible with ${requiredVersion}+)`,
      };
    } catch {
      return {
        success: false,
        error: "PNPM is not installed or not in PATH",
        recommendations: [
          "Install PNPM: npm install -g pnpm",
          "Or use corepack: corepack enable && corepack use pnpm@latest",
        ],
      };
    }
  }

  /**
   * Validate Docker availability
   */
  async validateDockerAvailability() {
    const warnings = [];
    const recommendations = [];

    try {
      // Check Docker daemon
      const dockerVersion = execSync("docker --version", { encoding: "utf8" }).trim();

      // Check if Docker daemon is running
      try {
        execSync("docker info", { stdio: "pipe" });
      } catch {
        return {
          success: false,
          error: "Docker daemon is not running",
          recommendations: ["Start Docker Desktop or Docker daemon", "On Linux: sudo systemctl start docker"],
        };
      }

      // Check Docker Compose
      try {
        const composeVersion = execSync("docker compose version", { encoding: "utf8" }).trim();

        return {
          success: true,
          details: `Docker available: ${dockerVersion}, ${composeVersion}`,
        };
      } catch {
        warnings.push("Docker Compose not available - some development features may be limited");
        recommendations.push("Install Docker Compose for full development experience");
      }

      return {
        success: true,
        details: `Docker available: ${dockerVersion}`,
        warnings: warnings.length > 0 ? warnings : undefined,
        recommendations: recommendations.length > 0 ? recommendations : undefined,
      };
    } catch {
      return {
        success: false,
        error: "Docker is not installed or not accessible",
        recommendations: [
          "Install Docker Desktop: https://www.docker.com/products/docker-desktop",
          "On Linux: Install Docker Engine and Docker Compose",
        ],
      };
    }
  }

  /**
   * Validate Git configuration
   */
  async validateGitConfiguration() {
    const warnings = [];
    const recommendations = [];

    try {
      const gitVersion = execSync("git --version", { encoding: "utf8" }).trim();

      // Check basic git configuration
      try {
        const userName = execSync("git config user.name", { encoding: "utf8", stdio: "pipe" }).trim();
        const userEmail = execSync("git config user.email", { encoding: "utf8", stdio: "pipe" }).trim();

        if (!userName || !userEmail) {
          warnings.push("Git user configuration incomplete");
          recommendations.push("Configure Git: git config --global user.name 'Your Name'");
          recommendations.push("Configure Git email: git config --global user.email 'your@email.com'");
        }
      } catch {
        warnings.push("Git user configuration not set");
        recommendations.push("Configure Git identity for commits");
      }

      // Check if we're in a git repository
      try {
        execSync("git rev-parse --git-dir", { stdio: "pipe" });
      } catch {
        warnings.push("Not in a Git repository");
      }

      return {
        success: true,
        details: gitVersion,
        warnings: warnings.length > 0 ? warnings : undefined,
        recommendations: recommendations.length > 0 ? recommendations : undefined,
      };
    } catch {
      return {
        success: false,
        error: "Git is not installed or not accessible",
        recommendations: ["Install Git: https://git-scm.com/downloads"],
      };
    }
  }

  /**
   * Validate system resources and platform compatibility
   */
  async validateSystemResources() {
    const warnings = [];
    const recommendations = [];
    const details = [];

    // Memory check
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

    const totalMemoryGB = (totalMemory / 1024 / 1024 / 1024).toFixed(1);
    const freeMemoryGB = (freeMemory / 1024 / 1024 / 1024).toFixed(1);

    details.push(`Total Memory: ${totalMemoryGB}GB`);
    details.push(`Free Memory: ${freeMemoryGB}GB (${(100 - memoryUsage).toFixed(1)}% available)`);

    if (totalMemory < 4 * 1024 * 1024 * 1024) {
      // Less than 4GB
      warnings.push(`Low system memory: ${totalMemoryGB}GB (recommended: 8GB+)`);
      recommendations.push("Consider increasing system memory for better performance");
    }

    if (memoryUsage > 90) {
      warnings.push(`High memory usage: ${memoryUsage.toFixed(1)}%`);
      recommendations.push("Close unnecessary applications to free up memory");
    }

    // CPU info
    const cpus = os.cpus();
    details.push(`CPU: ${cpus[0].model} (${cpus.length} cores)`);

    // Platform-specific checks
    const platform = os.platform();
    const arch = os.arch();
    details.push(`Platform: ${platform} ${arch}`);

    if (arch === "arm64" || arch === "aarch64") {
      details.push("ARM64 platform detected - optimized for Raspberry Pi deployment");

      if (platform === "linux") {
        recommendations.push("Consider using ARM64-optimized Docker images");
        recommendations.push("Monitor resource usage during builds");
      }
    }

    // Check node_modules
    try {
      const nodeModulesPath = path.join(this.projectRoot, "node_modules");
      if (fs.existsSync(nodeModulesPath)) {
        details.push("Node modules installed");
      } else {
        warnings.push("Node modules not installed");
        recommendations.push("Run 'pnpm install' to install dependencies");
      }
    } catch {
      // Ignore errors
    }

    return {
      success: true,
      details: details.join(", "),
      warnings: warnings.length > 0 ? warnings : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }

  /**
   * Generate comprehensive validation report
   */
  generateValidationReport() {
    logSection("🛠️  DEVELOPMENT ENVIRONMENT REPORT");

    // Platform information
    log(`🖥️  Platform Information:`, colors.bold);
    log(`   OS: ${os.platform()} ${os.arch()}`);
    log(`   Release: ${os.release()}`);
    log(`   Node.js: ${process.version}`);

    // Summary
    const summary = { passed: 0, failed: 0, warnings: 0 };
    const recommendations = [];

    if (this.results.checks) {
      Object.values(this.results.checks).forEach((check) => {
        if (check.success) {
          summary.passed++;
        } else {
          summary.failed++;
        }

        if (check.warnings && Array.isArray(check.warnings)) {
          summary.warnings += Number(check.warnings.length);
        }

        if (check.recommendations && check.recommendations.length > 0) {
          recommendations.push(...check.recommendations);
        }
      });
    }

    log(`\n📊 Validation Summary:`, colors.bold);
    log(`   Passed: ${summary.passed}`, colors.green);
    log(`   Failed: ${summary.failed}`, colors.red);
    log(`   Warnings: ${summary.warnings}`, colors.yellow);

    // Failed checks
    const failedChecks = Object.entries(this.results.checks || {}).filter(([, result]) => !result.success);

    if (failedChecks.length > 0) {
      log(`\n❌ Failed Validations:`, colors.red + colors.bold);
      failedChecks.forEach(([name, result]) => {
        log(`   ${name}: ${result.error}`, colors.red);
      });
    }

    // Recommendations
    if (recommendations.length > 0) {
      log(`\n💡 Recommendations:`, colors.yellow + colors.bold);
      recommendations.forEach((rec, index) => {
        log(`   ${index + 1}. ${rec}`, colors.yellow);
      });
    }

    // Overall status
    const isValid = summary.failed === 0;
    log(
      `\n🛠️  Environment Status: ${isValid ? "READY" : "NEEDS ATTENTION"}`,
      isValid ? colors.green + colors.bold : colors.red + colors.bold,
    );

    if (!isValid) {
      log(`\n📚 For more help, check:`, colors.cyan);
      log(`   • docs/TROUBLESHOOTING.md`);
      log(`   • Project development guide in README.md`);
    }

    return isValid;
  }
}

// ============================================================================
// TURBO COMMANDS
// ============================================================================

class TurboTool extends AxonTool {
  /**
   * Get turbo cache statistics
   */
  getCacheStats() {
    try {
      log("📊 Analyzing cache performance...", colors.cyan);

      // First run (cold cache)
      execSync("pnpm turbo clean", { stdio: "pipe" });
      const coldStart = Date.now();
      execSync("pnpm turbo build --dry=json > turbo-cold.json", { stdio: "pipe" });
      execSync("pnpm turbo build", { stdio: "pipe" });
      const coldTime = (Date.now() - coldStart) / 1000;

      // Second run (warm cache)
      const warmStart = Date.now();
      execSync("pnpm turbo build", { stdio: "pipe" });
      const warmTime = (Date.now() - warmStart) / 1000;

      // Third run for cache hit analysis
      const cacheStart = Date.now();
      const cacheOutput = execSync("pnpm turbo build", { encoding: "utf8", stdio: "pipe" });
      const cacheTime = (Date.now() - cacheStart) / 1000;

      // Parse cache hit information from output
      const cacheHits = (cacheOutput.match(/cache hit/g) || []).length;
      const cacheMisses = (cacheOutput.match(/cache miss/g) || []).length;
      const totalTasks = cacheHits + cacheMisses;

      return {
        coldBuildTime: coldTime,
        warmBuildTime: warmTime,
        cachedBuildTime: cacheTime,
        cacheHitRatio: totalTasks > 0 ? Math.round((cacheHits / totalTasks) * 1000) / 10 : 0,
        totalTasks,
        cacheHits,
        cacheMisses,
        speedup: coldTime > 0 ? Math.round((coldTime / Math.max(cacheTime, 0.1)) * 10) / 10 : 0,
      };
    } catch (error) {
      logError(`Failed to analyze cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Analyze cache directory size and usage
   */
  analyzeCacheSize() {
    try {
      const turboCache = path.join(this.projectRoot, ".turbo");

      if (!fs.existsSync(turboCache)) {
        return { size: 0, fileCount: 0 };
      }

      let totalSize = 0;
      let fileCount = 0;

      const calculateDirSize = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            calculateDirSize(filePath);
          } else {
            totalSize += stats.size;
            fileCount++;
          }
        });
      };

      calculateDirSize(turboCache);

      return {
        size: Math.round((totalSize / 1024 / 1024) * 10) / 10, // MB
        fileCount,
        avgFileSize: fileCount > 0 ? Math.round((totalSize / fileCount / 1024) * 10) / 10 : 0, // KB
      };
    } catch {
      return { size: 0, fileCount: 0, avgFileSize: 0 };
    }
  }

  /**
   * Check turbo.json configuration for cache optimization opportunities
   */
  analyzeTurboConfig() {
    try {
      const turboJsonPath = path.join(this.projectRoot, "turbo.json");
      const turboJson = JSON.parse(fs.readFileSync(turboJsonPath, "utf8"));

      const analysis = {
        daemon: !!turboJson.daemon,
        remoteCache: !!turboJson.remoteCache?.enabled,
        concurrency: turboJson.concurrency,
        tasks: Object.keys(turboJson.tasks || {}).length,
        cachingTasks: 0,
        nonCachingTasks: 0,
        recommendations: [],
      };

      // Analyze each task
      if (turboJson.tasks) {
        Object.entries(turboJson.tasks).forEach(([taskName, config]) => {
          if (config.cache !== false) {
            analysis.cachingTasks++;
          } else {
            analysis.nonCachingTasks++;
          }

          // Check for optimization opportunities
          if (!config.outputs && config.cache !== false) {
            analysis.recommendations.push({
              task: taskName,
              issue: "No outputs specified for cacheable task",
              action: `Add "outputs" array to ${taskName} task`,
            });
          }

          if (config.inputs && !config.inputs.includes("$TURBO_DEFAULT$")) {
            analysis.recommendations.push({
              task: taskName,
              issue: "Missing $TURBO_DEFAULT$ in inputs",
              action: `Add "$TURBO_DEFAULT$" to ${taskName} inputs for better cache invalidation`,
            });
          }
        });
      }

      // Global recommendations
      if (!analysis.daemon) {
        analysis.recommendations.push({
          task: "global",
          issue: "Turbo daemon not enabled",
          action: 'Add "daemon": true for faster subsequent builds',
        });
      }

      if (!analysis.remoteCache) {
        analysis.recommendations.push({
          task: "global",
          issue: "Remote caching not enabled",
          action: "Configure remote caching for CI/CD performance",
        });
      }

      return analysis;
    } catch {
      return {
        daemon: false,
        remoteCache: false,
        concurrency: null,
        tasks: 0,
        cachingTasks: 0,
        nonCachingTasks: 0,
        recommendations: [
          {
            task: "global",
            issue: "Could not analyze turbo.json",
            action: "Ensure turbo.json is valid and accessible",
          },
        ],
      };
    }
  }

  /**
   * Generate cache optimization strategies
   */
  generateCacheStrategies(stats, config) {
    const strategies = [];

    // Cache hit ratio optimization
    if (stats && stats.cacheHitRatio < 80) {
      strategies.push({
        priority: "high",
        category: "hit-ratio",
        issue: `Cache hit ratio is ${stats.cacheHitRatio}% (target: 80%+)`,
        strategy: "Optimize input patterns to reduce cache invalidation",
        expectedGain: "20-30% faster builds",
        implementation: [
          "Review input glob patterns for unnecessary files",
          "Use more specific file patterns",
          "Exclude generated or frequently changing files",
        ],
      });
    }

    // Speed optimization
    if (stats && stats.speedup < 3) {
      strategies.push({
        priority: "high",
        category: "performance",
        issue: `Cache speedup is only ${stats.speedup}x (target: 3x+)`,
        strategy: "Optimize task output caching",
        expectedGain: "2-5x faster cached builds",
        implementation: [
          "Ensure all build artifacts are in outputs",
          "Add missing cache outputs for tasks",
          "Remove unnecessary cache inputs",
        ],
      });
    }

    // Remote cache strategy
    if (config && !config.remoteCache) {
      strategies.push({
        priority: "medium",
        category: "remote-cache",
        issue: "Remote caching not configured",
        strategy: "Set up remote caching for team/CI benefits",
        expectedGain: "40-60% faster CI builds",
        implementation: [
          "Configure Vercel remote cache or custom solution",
          "Set up TURBO_TOKEN and TURBO_TEAM environment variables",
          "Enable remote cache in turbo.json",
        ],
      });
    }

    // Cache size optimization
    if (stats?.cacheSize && stats.cacheSize.size > 500) {
      strategies.push({
        priority: "low",
        category: "size",
        issue: `Local cache is ${stats.cacheSize.size}MB (consider cleanup)`,
        strategy: "Implement cache size management",
        expectedGain: "Reduced disk usage and faster cache lookup",
        implementation: [
          "Set up periodic cache cleanup",
          "Configure cache retention policies",
          "Monitor cache size growth",
        ],
      });
    }

    return strategies.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Main cache optimization analysis function
   */
  async optimizeCache() {
    logSection("🚀 TURBO CACHE OPTIMIZATION ANALYSIS");

    // Analyze cache performance
    const stats = this.getCacheStats();

    // Analyze cache directory
    const cacheSize = this.analyzeCacheSize();
    if (stats) {
      stats.cacheSize = cacheSize;
    }

    // Analyze turbo.json configuration
    const config = this.analyzeTurboConfig();

    // Generate optimization strategies
    const strategies = this.generateCacheStrategies(stats, config);

    // Compile results
    this.results = {
      ...this.results,
      summary: {
        cacheHitRatio: stats?.cacheHitRatio || 0,
        speedup: stats?.speedup || 0,
        status: {
          hitRatio: stats?.cacheHitRatio >= 80 ? "✅ GOOD" : "⚠️ NEEDS IMPROVEMENT",
          speedup: stats?.speedup >= 3 ? "✅ GOOD" : "⚠️ NEEDS IMPROVEMENT",
        },
      },
      performance: stats,
      cacheSize,
      configuration: config,
      strategies,
      recommendations: config.recommendations,
    };

    // Save results
    this.saveResults("turbo-cache-analysis.json");

    // Display results
    this.displayCacheResults();

    // Clean up temporary files
    try {
      fs.unlinkSync("turbo-cold.json");
    } catch {
      // Ignore cleanup errors
    }

    this.results.success = true;
    return this.results;
  }

  displayCacheResults() {
    log("📊 CACHE OPTIMIZATION ANALYSIS RESULTS", colors.bold);
    log("=====================================", colors.cyan);

    if (this.results.performance) {
      const stats = this.results.performance;
      log(`🎯 Cache Hit Ratio: ${stats.cacheHitRatio}% ${this.results.summary.status.hitRatio}`);
      log(`⚡ Cache Speedup: ${stats.speedup}x ${this.results.summary.status.speedup}`);
      log(`⏱️ Cold Build: ${stats.coldBuildTime}s`);
      log(`⏱️ Cached Build: ${stats.cachedBuildTime}s`);
      log(`📦 Total Tasks: ${stats.totalTasks}`);
    }

    log(`💾 Cache Size: ${this.results.cacheSize.size}MB (${this.results.cacheSize.fileCount} files)`);
    log(
      `⚙️ Configuration: ${this.results.configuration.cachingTasks} cached, ${this.results.configuration.nonCachingTasks} non-cached tasks`,
    );

    if (this.results.strategies.length > 0) {
      log("\n💡 CACHE OPTIMIZATION STRATEGIES:", colors.yellow + colors.bold);
      this.results.strategies.slice(0, 3).forEach((strategy, index) => {
        log(`  ${Number(index) + 1}. [${strategy.priority.toUpperCase()}] ${strategy.issue}`);
        log(`     Strategy: ${strategy.strategy}`);
        log(`     Expected gain: ${strategy.expectedGain}`);
        log("");
      });
    }

    if (this.results.recommendations.length > 0) {
      log("🔧 CONFIGURATION RECOMMENDATIONS:", colors.cyan + colors.bold);
      this.results.recommendations.slice(0, 3).forEach((rec, index) => {
        log(`  ${Number(index) + 1}. ${rec.task}: ${rec.issue}`);
        log(`     Action: ${rec.action}`);
      });
    }

    const reportsDir = path.join(this.projectRoot, ".temp", "reports");
    const outputFile = path.join(reportsDir, "turbo-cache-analysis.json");
    log(`\n📄 Detailed results saved to: ${outputFile}`, colors.dim);
  }

  /**
   * Analyze parallel execution efficiency
   */
  async analyzeParallelExecution() {
    logSection("⚡ TURBO PARALLEL EXECUTION ANALYSIS");

    try {
      // Get dry run data for dependency analysis
      log("📊 Analyzing task dependencies...", colors.cyan);
      const dryRunOutput = execSync("pnpm turbo build lint type-check test --dry=json", {
        encoding: "utf8",
        timeout: 30000,
      });

      const dryRunData = JSON.parse(dryRunOutput);

      // Calculate parallel efficiency
      const efficiency = this.calculateParallelEfficiency(dryRunData);

      // Analyze dependency bottlenecks
      const bottlenecks = this.analyzeDependencyBottlenecks(dryRunData);

      // Measure actual execution times
      log("\n⏱️ Measuring execution performance...", colors.cyan);
      const timings = {
        fullPipeline: this.measureExecutionTime(["build", "lint", "type-check", "test"]),
        buildOnly: this.measureExecutionTime(["build"]),
        lintOnly: this.measureExecutionTime(["lint"]),
        typeCheckOnly: this.measureExecutionTime(["type-check"]),
      };

      // Generate recommendations
      const recommendations = this.generateParallelRecommendations(efficiency, bottlenecks, timings);

      // Compile results
      const results = {
        timestamp: new Date().toISOString(),
        summary: {
          parallelEfficiency: efficiency?.parallelEfficiency,
          status: efficiency?.parallelEfficiency >= 70 ? "✅ PASSING" : "❌ FAILING",
          totalTasks: efficiency?.totalTasks,
          parallelizableTasks: efficiency?.parallelizableTasks,
          bottleneckCount: bottlenecks.length,
        },
        efficiency,
        bottlenecks,
        timings,
        recommendations,
        dryRunData: {
          packages: dryRunData.packages?.length,
          totalTasks: dryRunData.tasks?.length,
          turboVersion: dryRunData.turboVersion,
        },
      };

      // Save results
      const reportsDir = path.join(this.projectRoot, ".temp", "reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const outputFile = path.join(reportsDir, "turbo-parallel-analysis.json");
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

      // Display results
      this.displayParallelResults(results);

      return results;
    } catch (error) {
      logError(`Parallel analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate parallel execution efficiency
   */
  calculateParallelEfficiency(dryRunData) {
    if (!dryRunData?.tasks) {
      return null;
    }

    const { tasks } = dryRunData;
    const packages = dryRunData.packages || [];

    // Count tasks by type
    const tasksByType = {};
    let totalTasks = 0;
    let parallelizableTasks = 0;

    tasks.forEach((task) => {
      const taskName = task.task;
      if (!tasksByType[taskName]) {
        tasksByType[taskName] = [];
      }
      tasksByType[taskName].push(task);
      totalTasks++;

      // Check if task can run in parallel (no dependencies on other packages)
      const deps = task.resolvedTaskDefinition?.dependsOn || [];
      const hasExternalDeps = deps.some((dep) => dep.startsWith("^"));
      if (!hasExternalDeps) {
        parallelizableTasks++;
      }
    });

    // Calculate theoretical parallel efficiency
    const maxConcurrency = Math.max(1, ...Object.values(tasksByType).map((t) => t.length));
    const parallelEfficiency = parallelizableTasks / totalTasks;
    const taskUtilization = totalTasks / (packages.length * Object.keys(tasksByType).length);

    return {
      totalTasks,
      parallelizableTasks,
      parallelEfficiency: Math.round(parallelEfficiency * 1000) / 10, // Percentage with 1 decimal
      taskUtilization: Math.round(taskUtilization * 1000) / 10,
      maxConcurrency,
      tasksByType: Object.keys(tasksByType).map((type) => ({
        type,
        count: tasksByType[type].length,
        parallelizable: tasksByType[type].filter((t) => {
          const deps = t.resolvedTaskDefinition?.dependsOn || [];
          return !deps.some((dep) => dep.startsWith("^"));
        }).length,
      })),
    };
  }

  /**
   * Analyze dependency bottlenecks
   */
  analyzeDependencyBottlenecks(dryRunData) {
    if (!dryRunData?.tasks) {
      return [];
    }

    const bottlenecks = [];
    const taskGroups = {};

    // Group tasks by type
    dryRunData.tasks.forEach((task) => {
      const taskType = task.task;
      if (!taskGroups[taskType]) {
        taskGroups[taskType] = [];
      }
      taskGroups[taskType].push(task);
    });

    // Check each task type for dependency bottlenecks
    Object.entries(taskGroups).forEach(([taskType, tasks]) => {
      const hasExternalDeps = tasks.some((task) => {
        const deps = task.resolvedTaskDefinition?.dependsOn || [];
        return deps.some((dep) => dep.startsWith("^"));
      });

      if (hasExternalDeps) {
        bottlenecks.push({
          taskType,
          issue: "External dependencies preventing parallelization",
          impact: "high",
          recommendation: `Remove '^${taskType}' dependencies if ${taskType} doesn't need build artifacts`,
        });
      }
    });

    return bottlenecks;
  }

  /**
   * Measure actual execution time for tasks
   */
  measureExecutionTime(tasks) {
    log(`🚀 Measuring execution time for: ${tasks.join(" ")}`, colors.cyan);

    const startTime = Date.now();

    try {
      // Clean first to ensure fair comparison
      execSync("pnpm turbo clean", { stdio: "pipe", timeout: 30000 });

      // Run tasks and measure time
      execSync(`pnpm turbo ${tasks.join(" ")} --concurrency=100%`, {
        stdio: "pipe",
        timeout: 60000,
      });

      const endTime = Date.now();
      const executionTime = (endTime - startTime) / 1000;

      log(`⏱️ Execution completed in: ${executionTime}s`);
      return executionTime;
    } catch (error) {
      logError(`Execution failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate optimization recommendations for parallel execution
   */
  generateParallelRecommendations(efficiency, bottlenecks, timings) {
    const recommendations = [];

    // Parallel efficiency recommendations
    if (efficiency && efficiency.parallelEfficiency < 70) {
      recommendations.push({
        priority: "high",
        category: "parallelization",
        issue: `Parallel efficiency is ${efficiency.parallelEfficiency}% (target: 70%+)`,
        action: "Remove unnecessary task dependencies in turbo.json",
        expectedGain: "20-30% build time reduction",
      });
    }

    // Add bottleneck-specific recommendations
    bottlenecks.forEach((bottleneck) => {
      if (bottleneck.impact === "high") {
        recommendations.push({
          priority: "high",
          category: "dependencies",
          issue: bottleneck.issue,
          action: bottleneck.recommendation,
          expectedGain: "15-25% build time reduction",
        });
      }
    });

    // Performance recommendations
    if (timings && timings.fullPipeline > 20) {
      recommendations.push({
        priority: "medium",
        category: "performance",
        issue: `Full pipeline takes ${timings.fullPipeline}s (target: <15s)`,
        action: "Consider enabling remote caching or optimizing individual tasks",
        expectedGain: "30-50% CI build time reduction",
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Display parallel analysis results
   */
  displayParallelResults(results) {
    log("\n📈 PARALLEL EXECUTION ANALYSIS RESULTS", colors.bold);
    log("==========================================", colors.cyan);

    if (results.summary) {
      log(`📊 Parallel Efficiency: ${results.summary.parallelEfficiency}% ${results.summary.status}`);
      log(`🎯 Target: 70%+ (${results.summary.parallelEfficiency >= 70 ? "MET" : "NOT MET"})`);
      log(`📦 Packages: ${results.dryRunData?.packages || 0}`);
      log(`⚙️ Total Tasks: ${results.summary.totalTasks || 0}`);
      log(`🔄 Parallelizable: ${results.summary.parallelizableTasks || 0}`);
    }

    if (results.timings?.fullPipeline) {
      log(`⏱️ Full Pipeline: ${results.timings.fullPipeline}s`);
    }

    if (results.bottlenecks.length > 0) {
      log("\n🚨 BOTTLENECKS IDENTIFIED:", colors.red + colors.bold);
      results.bottlenecks.forEach((bottleneck, index) => {
        log(`  ${Number(index) + 1}. ${bottleneck.taskType}: ${bottleneck.issue}`);
      });
    }

    if (results.recommendations.length > 0) {
      log("\n💡 OPTIMIZATION RECOMMENDATIONS:", colors.yellow + colors.bold);
      results.recommendations.slice(0, 3).forEach((rec, index) => {
        log(`  ${Number(index) + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}`);
        log(`     Action: ${rec.action}`);
        log(`     Expected gain: ${rec.expectedGain}`);
        log("");
      });
    }

    log(`\n📄 Detailed results saved to: turbo-parallel-analysis.json`, colors.dim);
  }

  /**
   * Monitor build performance and cache efficiency
   */
  async monitorPerformance() {
    logSection("🔥 TURBO PERFORMANCE MONITOR");

    const PERFORMANCE_TARGETS = {
      BUILD_TIME_SECONDS: 30,
      CACHE_HIT_RATIO: 0.8,
      PARALLEL_EFFICIENCY: 0.7,
    };

    const results = {
      timestamp: new Date().toISOString(),
      buildMetrics: {},
      cacheMetrics: {},
      parallelMetrics: {},
      validationResults: {},
    };

    try {
      // Benchmark build performance
      log("🔥 Benchmarking build performance...", colors.cyan);

      // Clean build
      const cleanStart = Date.now();
      execSync("pnpm turbo clean", { stdio: "pipe" });
      execSync("pnpm turbo build", { stdio: "pipe" });
      const cleanTime = (Date.now() - cleanStart) / 1000;

      // Cached build
      const cachedStart = Date.now();
      execSync("pnpm turbo build", { stdio: "pipe" });
      const cachedTime = (Date.now() - cachedStart) / 1000;

      results.buildMetrics = {
        cleanBuildTimeSeconds: cleanTime,
        cachedBuildTimeSeconds: cachedTime,
        speedupRatio: cleanTime / cachedTime,
        passesTarget: cleanTime <= PERFORMANCE_TARGETS.BUILD_TIME_SECONDS,
      };

      log(`   ✅ Clean build: ${cleanTime}s`);
      log(`   ⚡ Cached build: ${cachedTime}s`);
      log(`   📊 Speedup: ${results.buildMetrics.speedupRatio.toFixed(2)}x`);

      // Test cache system functionality
      log("📦 Testing cache system functionality...", colors.cyan);

      const turboOutput = execSync("pnpm turbo build --dry-run=json", {
        encoding: "utf8",
        stdio: "pipe",
      });

      // Parse dry run data for potential future use
      JSON.parse(turboOutput);

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

      results.cacheMetrics = {
        totalTasks,
        cacheHits,
        cacheMisses,
        cacheHitRatio,
        passesTarget: cacheHitRatio >= PERFORMANCE_TARGETS.CACHE_HIT_RATIO,
      };

      log(`   📊 Cache hit ratio: ${(cacheHitRatio * 100).toFixed(1)}%`);
      log(`   🎯 Target: ${PERFORMANCE_TARGETS.CACHE_HIT_RATIO * 100}%`);

      // Validate parallel execution configuration
      log("⚡ Validating parallel execution...", colors.cyan);

      const start = Date.now();
      try {
        execSync("pnpm turbo lint type-check --parallel", { stdio: "pipe" });
      } catch (error) {
        logWarning(`Parallel execution had issues: ${error.message}`);
      }
      const parallelTime = (Date.now() - start) / 1000;

      // Run sequentially for comparison
      const seqStart = Date.now();
      try {
        execSync("pnpm turbo lint && pnpm turbo type-check", { stdio: "pipe" });
      } catch (error) {
        logWarning(`Sequential execution had issues: ${error.message}`);
      }
      const sequentialTime = (Date.now() - seqStart) / 1000;

      const efficiency = sequentialTime > 0 ? (sequentialTime - parallelTime) / sequentialTime : 0;

      results.parallelMetrics = {
        parallelTimeSeconds: parallelTime,
        sequentialTimeSeconds: sequentialTime,
        efficiency,
        passesTarget: efficiency >= PERFORMANCE_TARGETS.PARALLEL_EFFICIENCY,
      };

      log(`   ⚡ Parallel: ${parallelTime}s`);
      log(`   📏 Sequential: ${sequentialTime}s`);
      log(`   📈 Efficiency: ${(efficiency * 100).toFixed(1)}%`);

      // Validate all requirements
      const validationResults = this.validatePerformanceRequirements(results, PERFORMANCE_TARGETS);
      results.validationResults = validationResults;

      // Save results
      const reportsDir = path.join(this.projectRoot, ".temp", "reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const resultsFile = path.join(reportsDir, "performance-metrics.json");
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
      log(`\n💾 Results saved to: ${resultsFile}`, colors.cyan);

      // Display summary
      this.displayPerformanceResults(results);

      const allPassed = Object.values(validationResults).every((v) => v.passed);
      return allPassed;
    } catch (error) {
      logError(`Performance monitoring failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate performance requirements
   */
  validatePerformanceRequirements(results, targets) {
    log("\n🔍 Validating performance requirements...", colors.cyan);

    const validations = {
      V1_10_BUILD_TIME: {
        description: "Build commands execute within 30 seconds",
        passed: results.buildMetrics.passesTarget,
        actual: `${results.buildMetrics.cleanBuildTimeSeconds}s`,
        target: `${targets.BUILD_TIME_SECONDS}s`,
      },
      V1_11_CACHE_SYSTEM: {
        description: "Cache system functionality with 80%+ efficiency",
        passed: results.cacheMetrics.passesTarget,
        actual: `${(results.cacheMetrics.cacheHitRatio * 100).toFixed(1)}%`,
        target: `${targets.CACHE_HIT_RATIO * 100}%`,
      },
      V1_16_PARALLEL_EXECUTION: {
        description: "Parallel execution configuration effective",
        passed: results.parallelMetrics.passesTarget,
        actual: `${(results.parallelMetrics.efficiency * 100).toFixed(1)}%`,
        target: `${targets.PARALLEL_EFFICIENCY * 100}%`,
      },
    };

    Object.entries(validations).forEach(([key, validation]) => {
      const status = validation.passed ? "✅" : "❌";
      log(`   ${status} ${key}: ${validation.description}`);
      log(`      Actual: ${validation.actual} | Target: ${validation.target}`);
    });

    const allPassed = Object.values(validations).every((v) => v.passed);
    log(
      `\n🏆 Overall validation: ${allPassed ? "PASSED" : "FAILED"}`,
      allPassed ? colors.green + colors.bold : colors.red + colors.bold,
    );

    return validations;
  }

  /**
   * Display performance monitoring results
   */
  displayPerformanceResults(results) {
    log("\n📊 PERFORMANCE MONITORING RESULTS", colors.bold);
    log("==================================", colors.cyan);

    if (results.buildMetrics) {
      log(`🏗️ Build Performance:`);
      log(`   Clean build: ${results.buildMetrics.cleanBuildTimeSeconds}s`);
      log(`   Cached build: ${results.buildMetrics.cachedBuildTimeSeconds}s`);
      log(`   Speedup ratio: ${results.buildMetrics.speedupRatio.toFixed(2)}x`);
    }

    if (results.cacheMetrics) {
      log(`📦 Cache Performance:`);
      log(`   Cache hit ratio: ${(results.cacheMetrics.cacheHitRatio * 100).toFixed(1)}%`);
      log(`   Total tasks: ${results.cacheMetrics.totalTasks}`);
      log(`   Cache hits: ${results.cacheMetrics.cacheHits}`);
      log(`   Cache misses: ${results.cacheMetrics.cacheMisses}`);
    }

    if (results.parallelMetrics) {
      log(`⚡ Parallel Performance:`);
      log(`   Parallel time: ${results.parallelMetrics.parallelTimeSeconds}s`);
      log(`   Sequential time: ${results.parallelMetrics.sequentialTimeSeconds}s`);
      log(`   Efficiency: ${(results.parallelMetrics.efficiency * 100).toFixed(1)}%`);
    }
  }

  /**
   * Validate turbo cache integrity and structure
   */
  async validateCache() {
    logSection("🔍 TURBO CACHE VALIDATION");

    const turboDir = path.join(this.projectRoot, ".turbo");
    const cacheDir = path.join(turboDir, "cache");

    const results = {
      timestamp: new Date().toISOString(),
      cacheIntegrity: {},
      dependencyValidation: {},
      circularDependencies: [],
      recommendations: [],
    };

    try {
      // Validate cache structure
      log("🔍 Validating cache structure...", colors.cyan);

      const structureChecks = {
        turboDirectoryExists: fs.existsSync(turboDir),
        cacheDirectoryExists: fs.existsSync(cacheDir),
        cacheReadable: false,
        cacheWritable: false,
      };

      if (structureChecks.cacheDirectoryExists) {
        try {
          fs.accessSync(cacheDir, fs.constants.R_OK);
          structureChecks.cacheReadable = true;
        } catch (error) {
          logWarning(`Cache not readable: ${error.message}`);
        }

        try {
          fs.accessSync(cacheDir, fs.constants.W_OK);
          structureChecks.cacheWritable = true;
        } catch (error) {
          logWarning(`Cache not writable: ${error.message}`);
        }
      }

      results.cacheIntegrity.structure = structureChecks;

      const structureValid = Object.values(structureChecks).every(Boolean);
      log(`   ${structureValid ? "✅" : "❌"} Cache structure: ${structureValid ? "VALID" : "INVALID"}`);

      // Validate cache artifacts
      log("📦 Validating cache artifacts...", colors.cyan);

      if (!fs.existsSync(cacheDir)) {
        log("   ℹ️  No cache directory found - system is clean");
        results.cacheIntegrity.artifacts = { valid: true, reason: "no_cache" };
      } else {
        const cacheFiles = fs.readdirSync(cacheDir);
        let validArtifacts = 0;
        let invalidArtifacts = 0;
        const corruptedFiles = [];

        for (const file of cacheFiles) {
          const filePath = path.join(cacheDir, file);
          const stats = fs.statSync(filePath);

          if (stats.isFile()) {
            try {
              if (stats.size === 0) {
                invalidArtifacts++;
                corruptedFiles.push({ file, reason: "empty_file" });
              } else {
                fs.readFileSync(filePath, { encoding: null });
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

        results.cacheIntegrity.artifacts = integrity;

        log(`   📊 Cache files: ${integrity.totalFiles}`);
        log(`   ✅ Valid: ${integrity.validArtifacts}`);
        log(`   ❌ Invalid: ${integrity.invalidArtifacts}`);

        if (corruptedFiles.length > 0) {
          logWarning("Corrupted files detected:");
          corruptedFiles.forEach(({ file, reason }) => {
            log(`      - ${file}: ${reason}`);
          });
        }
      }

      // Detect circular dependencies
      log("🔄 Detecting circular dependencies...", colors.cyan);

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

        results.circularDependencies = cycles;

        if (cycles.length === 0) {
          logSuccess("No circular dependencies detected");
        } else {
          logError(`${cycles.length} circular dependencies detected:`);
          cycles.forEach((cycle, index) => {
            log(`      ${index + 1}. ${cycle.join(" → ")}`);
          });
        }
      } catch (error) {
        logError(`Failed to analyze dependencies: ${error.message}`);
      }

      // Validate dependency resolution
      log("🎯 Validating dependency resolution...", colors.cyan);

      try {
        execSync("pnpm turbo build --dry-run", { encoding: "utf8", stdio: "pipe" });
        execSync("pnpm turbo lint --dry-run", { encoding: "utf8", stdio: "pipe" });
        execSync("pnpm turbo type-check --dry-run", { encoding: "utf8", stdio: "pipe" });

        results.dependencyValidation = {
          buildResolution: true,
          lintResolution: true,
          typeCheckResolution: true,
          allValid: true,
        };

        logSuccess("All task dependencies resolve correctly");
      } catch (error) {
        logError(`Dependency resolution failed: ${error.message}`);
        results.dependencyValidation = {
          buildResolution: false,
          lintResolution: false,
          typeCheckResolution: false,
          allValid: false,
          error: error.message,
        };
      }

      // Generate recommendations
      const recommendations = this.generateCacheRecommendations(results);
      results.recommendations = recommendations;

      // Save results to temp directory
      const reportsDir = path.join(this.projectRoot, ".temp", "reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const resultsFile = path.join(reportsDir, "turbo-cache-validation.json");
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
      log(`\n💾 Results saved to: ${resultsFile}`, colors.cyan);

      // Display summary
      this.displayCacheValidationResults(results);

      const allValid =
        structureValid && results.circularDependencies.length === 0 && results.dependencyValidation.allValid;

      return allValid;
    } catch (error) {
      logError(`Cache validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate cache validation recommendations
   */
  generateCacheRecommendations(results) {
    const recommendations = [];

    // Cache integrity recommendations
    const integrity = results.cacheIntegrity.artifacts;
    if (integrity && integrity.invalidArtifacts > 0) {
      recommendations.push({
        type: "cache_cleanup",
        severity: "medium",
        message: `Clean corrupted cache artifacts (${integrity.invalidArtifacts} files)`,
        action: "pnpm turbo clean",
      });
    }

    // Circular dependency recommendations
    if (results.circularDependencies.length > 0) {
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

    return recommendations;
  }

  /**
   * Display cache validation results
   */
  displayCacheValidationResults(results) {
    log("\n📊 CACHE VALIDATION RESULTS", colors.bold);
    log("============================", colors.cyan);

    if (results.cacheIntegrity.structure) {
      const { structure } = results.cacheIntegrity;
      const structureValid = Object.values(structure).every(Boolean);
      log(`🏗️ Cache Structure: ${structureValid ? "✅ VALID" : "❌ INVALID"}`);
    }

    if (results.cacheIntegrity.artifacts && results.cacheIntegrity.artifacts.totalFiles !== undefined) {
      const { artifacts } = results.cacheIntegrity;
      log(
        `📦 Cache Artifacts: ${artifacts.validArtifacts}/${artifacts.totalFiles} valid (${(artifacts.integrityRatio * 100).toFixed(1)}%)`,
      );
    }

    log(
      `🔄 Circular Dependencies: ${results.circularDependencies.length === 0 ? "✅ None" : `❌ ${results.circularDependencies.length} found`}`,
    );
    log(`🎯 Dependency Resolution: ${results.dependencyValidation.allValid ? "✅ Valid" : "❌ Failed"}`);

    if (results.recommendations.length > 0) {
      log("\n💡 RECOMMENDATIONS:", colors.yellow + colors.bold);
      results.recommendations.forEach((rec, index) => {
        const severity = rec.severity === "high" ? "🚨" : "⚠️";
        log(`   ${severity} ${Number(index) + 1}. ${rec.message}`);
        log(`      Action: ${rec.action}`);
      });
    } else {
      logSuccess("No recommendations - cache system is healthy");
    }
  }

  /**
   * Validate turbo.json configuration
   */
  async validateConfig() {
    logSection("⚙️ TURBO CONFIGURATION VALIDATION");

    const configPath = path.join(this.projectRoot, "turbo.json");
    const errors = [];
    const warnings = [];

    try {
      // Load turbo.json
      log("📖 Loading turbo.json...", colors.cyan);

      if (!fs.existsSync(configPath)) {
        logError("turbo.json not found");
        return false;
      }

      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      logSuccess("turbo.json loaded successfully");

      // Validate pipeline
      log("🔧 Validating pipeline configuration...", colors.cyan);

      if (!config.pipeline) {
        errors.push("Pipeline configuration is missing");
      } else {
        const requiredTasks = ["build", "test", "lint", "dev"];
        const { pipeline } = config;

        for (const task of requiredTasks) {
          if (!pipeline[task]) {
            errors.push(`Required pipeline task '${task}' is missing`);
          }
        }

        // Validate task dependencies
        for (const [taskName, taskConfig] of Object.entries(pipeline)) {
          if (taskConfig.dependsOn) {
            for (const dep of taskConfig.dependsOn) {
              if (dep.startsWith("^") && !pipeline[dep.substring(1)]) {
                warnings.push(`Task '${taskName}' depends on undefined task '${dep}'`);
              }
            }
          }

          // Validate input/output patterns
          if (taskConfig.outputs && taskConfig.outputs.length === 0) {
            warnings.push(`Task '${taskName}' has empty outputs array, consider using null`);
          }

          if (taskConfig.inputs && taskConfig.inputs.length === 0) {
            warnings.push(`Task '${taskName}' has empty inputs array, may cause cache issues`);
          }
        }

        logSuccess(`Pipeline validation completed (${Object.keys(pipeline).length} tasks)`);
      }

      // Validate cache settings
      log("📦 Validating cache settings...", colors.cyan);

      if (config.pipeline) {
        for (const [taskName, taskConfig] of Object.entries(config.pipeline)) {
          // Check for appropriate cache settings
          if (taskName === "dev" && taskConfig.cache !== false) {
            warnings.push("Dev task should typically have cache disabled");
          }

          if (taskName === "clean" && taskConfig.cache !== false) {
            warnings.push("Clean task should have cache disabled");
          }

          // Check output patterns
          if (taskConfig.outputs) {
            for (const output of taskConfig.outputs) {
              if (!output.includes("*") && !fs.existsSync(path.dirname(output))) {
                warnings.push(`Output path '${output}' in task '${taskName}' may not exist`);
              }
            }
          }
        }

        logSuccess("Cache settings validation completed");
      }

      // Validate remote caching
      log("🌐 Validating remote cache configuration...", colors.cyan);

      if (config.remoteCache) {
        if (!process.env.TURBO_TOKEN && !process.env.TURBO_TEAM) {
          warnings.push("Remote caching enabled but TURBO_TOKEN/TURBO_TEAM not configured");
        }
      }

      if (config.signature) {
        warnings.push("Custom signature configuration detected, ensure it's necessary");
      }

      logSuccess("Remote cache validation completed");

      // Validate environment variables
      log("🔧 Validating environment variables...", colors.cyan);

      const { globalEnv, pipeline } = config;

      if (globalEnv) {
        const sensitiveVars = ["API_KEY", "SECRET", "TOKEN", "PASSWORD"];
        for (const envVar of globalEnv) {
          if (sensitiveVars.some((sensitive) => envVar.includes(sensitive))) {
            warnings.push(`Potentially sensitive environment variable '${envVar}' in globalEnv`);
          }
        }
      }

      // Check task-specific environment variables
      if (pipeline) {
        for (const [taskName, taskConfig] of Object.entries(pipeline)) {
          if (taskConfig.env) {
            for (const envVar of taskConfig.env) {
              if (!process.env[envVar]) {
                warnings.push(`Environment variable '${envVar}' required by '${taskName}' is not set`);
              }
            }
          }
        }
      }

      logSuccess("Environment variables validation completed");

      // Display results
      this.displayConfigValidationResults(errors, warnings);

      // Save results
      const results = {
        timestamp: new Date().toISOString(),
        errors,
        warnings,
        valid: errors.length === 0,
      };

      // Save results to temp directory
      const reportsDir = path.join(this.projectRoot, ".temp", "reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const resultsFile = path.join(reportsDir, "turbo-config-validation.json");
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
      log(`\n💾 Results saved to: ${resultsFile}`, colors.cyan);

      return errors.length === 0;
    } catch (error) {
      logError(`Configuration validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Display configuration validation results
   */
  displayConfigValidationResults(errors, warnings) {
    log("\n📊 CONFIGURATION VALIDATION RESULTS", colors.bold);
    log("===================================", colors.cyan);

    if (errors.length > 0) {
      log("❌ Configuration errors:", colors.red + colors.bold);
      errors.forEach((error) => {
        log(`   • ${error}`, colors.red);
      });
    }

    if (warnings.length > 0) {
      log("⚠️  Configuration warnings:", colors.yellow + colors.bold);
      warnings.forEach((warning) => {
        log(`   • ${warning}`, colors.yellow);
      });
    }

    if (errors.length === 0) {
      logSuccess("Configuration validation completed successfully");
    } else {
      logError("Configuration validation failed - please fix errors above");
    }
  }
}

// ============================================================================
// SECURITY COMMANDS
// ============================================================================

class SecurityTool extends AxonTool {
  constructor() {
    super();
    this.severityLevels = {
      critical: { color: colors.red, priority: 4, emoji: "🚨" },
      high: { color: colors.red, priority: 3, emoji: "⚠️" },
      moderate: { color: colors.yellow, priority: 2, emoji: "⚡" },
      low: { color: colors.blue, priority: 1, emoji: "ℹ️" },
      info: { color: colors.cyan, priority: 0, emoji: "💡" },
    };
  }

  /**
   * Parse audit JSON from stdin
   */
  async parseAuditInput() {
    return new Promise((resolve, reject) => {
      let data = "";

      process.stdin.on("data", (chunk) => {
        data += chunk.toString();
      });

      process.stdin.on("end", () => {
        try {
          const auditData = JSON.parse(data);
          resolve(auditData);
        } catch (error) {
          reject(new Error(`Failed to parse audit JSON: ${error.message}`));
        }
      });

      process.stdin.on("error", reject);
    });
  }

  /**
   * Process and categorize vulnerabilities
   */
  processVulnerabilities(auditData) {
    const vulnerabilities = {
      critical: [],
      high: [],
      moderate: [],
      low: [],
      info: [],
    };

    const summary = {
      total: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      fixAvailable: 0,
      requiresManualReview: 0,
    };

    // Process advisories from audit data
    if (auditData.advisories) {
      Object.values(auditData.advisories).forEach((advisory) => {
        const severity = advisory.severity.toLowerCase();

        const vulnerability = {
          id: advisory.id,
          title: advisory.title,
          module: advisory.module_name,
          severity,
          vulnerable_versions: advisory.vulnerable_versions,
          patched_versions: advisory.patched_versions,
          recommendation: advisory.recommendation,
          url: advisory.url,
          findings: advisory.findings || [],
          fixAvailable: advisory.patched_versions !== "<0.0.0",
        };

        vulnerabilities[severity].push(vulnerability);
        summary[severity]++;
        summary.total++;

        if (vulnerability.fixAvailable) {
          summary.fixAvailable++;
        } else {
          summary.requiresManualReview++;
        }
      });
    }

    return { vulnerabilities, summary };
  }

  /**
   * Generate security report
   */
  generateSecurityReport(vulnerabilities, summary) {
    logSection("SECURITY VULNERABILITY REPORT");

    // Summary
    log(`${colors.bold}📊 SUMMARY:${colors.reset}`);
    log("─────────────────────────────────────────────────────────────");

    if (summary.total === 0) {
      logSuccess("No vulnerabilities found! Your dependencies are secure.");
      return;
    }

    log(`Total vulnerabilities: ${colors.bold}${summary.total}${colors.reset}`);

    if (summary.critical > 0) {
      log(
        `${this.severityLevels.critical.emoji}  Critical: ${this.severityLevels.critical.color}${summary.critical}${colors.reset}`,
      );
    }
    if (summary.high > 0) {
      log(`${this.severityLevels.high.emoji}  High: ${this.severityLevels.high.color}${summary.high}${colors.reset}`);
    }
    if (summary.moderate > 0) {
      log(
        `${this.severityLevels.moderate.emoji}  Moderate: ${this.severityLevels.moderate.color}${summary.moderate}${colors.reset}`,
      );
    }
    if (summary.low > 0) {
      log(`${this.severityLevels.low.emoji}  Low: ${this.severityLevels.low.color}${summary.low}${colors.reset}`);
    }
    if (summary.info > 0) {
      log(`${this.severityLevels.info.emoji}  Info: ${this.severityLevels.info.color}${summary.info}${colors.reset}`);
    }

    log(`\n${colors.green}✓${colors.reset} Fix available: ${summary.fixAvailable}`);
    log(`${colors.yellow}⚠${colors.reset} Manual review required: ${summary.requiresManualReview}`);

    // Detailed vulnerabilities by severity
    ["critical", "high", "moderate", "low", "info"].forEach((severity) => {
      const vulns = vulnerabilities[severity];
      if (vulns.length === 0) return;

      const level = this.severityLevels[severity];
      log(`\n${level.color}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
      log(
        `${level.emoji} ${level.color}${colors.bold}${severity.toUpperCase()} VULNERABILITIES (${vulns.length})${colors.reset}`,
      );
      log(`${level.color}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

      vulns.forEach((vuln, index) => {
        log(`\n${colors.bold}[${Number(index) + 1}] ${vuln.title}${colors.reset}`);
        log(`    Package: ${colors.cyan}${vuln.module}${colors.reset}`);
        log(`    Vulnerable: ${colors.red}${vuln.vulnerable_versions}${colors.reset}`);

        if (vuln.fixAvailable) {
          log(`    Fixed in: ${colors.green}${vuln.patched_versions}${colors.reset}`);
          log(`    Action: ${colors.green}Run 'pnpm update ${vuln.module}' or 'pnpm audit fix'${colors.reset}`);
        } else {
          log(`    Status: ${colors.yellow}No fix available yet${colors.reset}`);
          log(`    Action: ${colors.yellow}Monitor for updates or consider alternatives${colors.reset}`);
        }

        if (vuln.recommendation) {
          log(`    Recommendation: ${vuln.recommendation}`);
        }

        if (vuln.url) {
          log(`    More info: ${colors.blue}${vuln.url}${colors.reset}`);
        }
      });
    });

    // Recommendations
    log(`\n${colors.bold}💡 RECOMMENDATIONS:${colors.reset}`);
    log("─────────────────────────────────────────────────────────────");

    if (summary.critical > 0 || summary.high > 0) {
      logError("1. Address critical and high vulnerabilities immediately!");
    }

    if (summary.fixAvailable > 0) {
      log(`2. Run ${colors.green}pnpm audit fix${colors.reset} to automatically fix available patches`);
    }

    if (summary.requiresManualReview > 0) {
      log("3. Review packages without fixes and consider:");
      log("   - Checking for alternative packages");
      log("   - Implementing workarounds");
      log("   - Monitoring for future patches");
    }

    log(`4. Run ${colors.cyan}pnpm outdated${colors.reset} to check for general updates`);
    log("5. Keep dependencies up-to-date with regular audits\n");
  }

  /**
   * Run security audit using pnpm
   */
  async runSecurityAudit() {
    logSection("🔍 SECURITY VULNERABILITY ANALYSIS");

    try {
      log(`${colors.cyan}🔍 Running pnpm audit...${colors.reset}`);

      // Run pnpm audit and get JSON output
      const auditOutput = execSync("pnpm audit --json", {
        encoding: "utf8",
        stdio: "pipe",
      });

      const auditData = JSON.parse(auditOutput);
      const { vulnerabilities, summary } = this.processVulnerabilities(auditData);

      // Store results
      this.results = {
        ...this.results,
        vulnerabilities,
        summary,
        success: summary.critical === 0 && summary.high === 0,
      };

      this.generateSecurityReport(vulnerabilities, summary);

      // Save results
      this.saveResults("security-audit-report.json");

      // Exit with appropriate code
      if (summary.critical > 0 || summary.high > 0) {
        process.exit(1); // Fail for critical/high vulnerabilities
      } else {
        process.exit(0); // Success
      }
    } catch (error) {
      logError(`Security audit failed: ${error.message}`);
      logInfo("\nUsage: pnpm audit --json | node axon-tools.cjs security check");
      process.exit(1);
    }
  }

  /**
   * Process piped audit data
   */
  async processAuditData() {
    try {
      logInfo("🔍 Analyzing security vulnerabilities...");

      const auditData = await this.parseAuditInput();
      const { vulnerabilities, summary } = this.processVulnerabilities(auditData);

      this.generateSecurityReport(vulnerabilities, summary);

      // Exit with appropriate code
      if (summary.critical > 0 || summary.high > 0) {
        process.exit(1); // Fail for critical/high vulnerabilities
      } else if (summary.moderate > 0) {
        process.exit(0); // Warning for moderate
      } else {
        process.exit(0); // Success
      }
    } catch (error) {
      logError(`Error: ${error.message}`);
      logInfo("\nUsage: pnpm audit --json | node axon-tools.cjs security check");
      process.exit(1);
    }
  }
}

// ============================================================================
// VALIDATION COMMANDS
// ============================================================================

class ValidationTool extends AxonTool {
  constructor() {
    super();
    this.results = {
      timestamp: new Date().toISOString(),
      eslint: { passed: false, details: [] },
      prettier: { passed: false, details: [] },
      husky: { passed: false, details: [] },
      typescript: { passed: false, details: [] },
      tests: { passed: false, details: [] },
      documentation: { passed: false, details: [] },
      structure: { passed: false, details: [] },
    };
  }

  /**
   * Validate ESLint configuration and execution
   */
  async validateESLint() {
    log("🔍 Validating ESLint (V1.13)...", colors.cyan);

    try {
      const output = execSync("pnpm lint", {
        encoding: "utf8",
        timeout: 120000, // 2 minutes timeout
      });

      this.results.eslint.passed = true;
      this.results.eslint.details.push("ESLint runs without errors across all workspaces");

      if (output.includes("warning")) {
        const warningCount = (output.match(/warning/g) || []).length;
        this.results.eslint.details.push(`Found ${warningCount} warnings (acceptable)`);
      }
    } catch (error) {
      this.results.eslint.passed = false;
      this.results.eslint.details.push(`ESLint failed: ${error.message}`);

      // Try to extract specific error information
      if (error.stdout) {
        const errorLines = error.stdout
          .split("\n")
          .filter((line) => line.includes("error"))
          .slice(0, 5); // Show first 5 errors

        this.results.eslint.details.push(...errorLines);
      }
    }
  }

  /**
   * Validate Prettier formatting
   */
  async validatePrettier() {
    log("🎨 Validating Prettier formatting (V1.14)...", colors.cyan);

    try {
      // Check if files are properly formatted
      execSync("pnpm format:check", {
        encoding: "utf8",
        timeout: 60000, // 1 minute timeout
      });

      this.results.prettier.passed = true;
      this.results.prettier.details.push("All files are properly formatted with Prettier");
    } catch (error) {
      // Try to fix formatting automatically
      try {
        log("  🔧 Attempting to fix formatting...", colors.yellow);
        execSync("pnpm format:write", { encoding: "utf8" });

        // Check again after formatting
        execSync("pnpm format:check", { encoding: "utf8" });

        this.results.prettier.passed = true;
        this.results.prettier.details.push("Formatting issues found and fixed automatically");
      } catch (secondError) {
        this.results.prettier.passed = false;
        this.results.prettier.details.push(`Prettier formatting failed: ${error.message}`);
      }
    }
  }

  /**
   * Validate Husky git hooks
   */
  async validateHuskyHooks() {
    log("🪝 Validating Husky git hooks (V1.15)...", colors.cyan);

    const requiredHooks = ["pre-commit", "commit-msg", "pre-push", "post-merge"];
    const hookDir = ".husky";

    let allHooksValid = true;

    for (const hook of requiredHooks) {
      const hookPath = path.join(hookDir, hook);

      if (!fs.existsSync(hookPath)) {
        this.results.husky.details.push(`Missing hook: ${hook}`);
        allHooksValid = false;
        continue;
      }

      // Check if hook is executable
      try {
        const stats = fs.statSync(hookPath);
        if (!(stats.mode & parseInt("100", 8))) {
          // Check execute permission
          this.results.husky.details.push(`Hook ${hook} is not executable`);
          allHooksValid = false;
          continue;
        }

        this.results.husky.details.push(`✓ ${hook} hook configured and executable`);
      } catch (error) {
        this.results.husky.details.push(`Error checking hook ${hook}: ${error.message}`);
        allHooksValid = false;
      }
    }

    // Test commitlint configuration
    try {
      execSync('echo "feat(test): test commit message" | npx commitlint', {
        encoding: "utf8",
      });
      this.results.husky.details.push("✓ Commitlint configuration valid");
    } catch (error) {
      this.results.husky.details.push("⚠ Commitlint configuration may have issues");
      allHooksValid = false;
    }

    this.results.husky.passed = allHooksValid;
  }

  /**
   * Validate TypeScript configuration
   */
  async validateTypeScript() {
    log("🔧 Validating TypeScript configuration...", colors.cyan);

    try {
      // Run TypeScript type checking across workspaces
      execSync("pnpm turbo type-check", {
        encoding: "utf8",
        timeout: 180000, // 3 minutes timeout
      });

      this.results.typescript.passed = true;
      this.results.typescript.details.push("TypeScript type checking passes across all workspaces");
    } catch (error) {
      this.results.typescript.passed = false;
      this.results.typescript.details.push(`TypeScript type checking failed: ${error.message}`);

      // Extract specific type errors
      if (error.stdout) {
        const typeErrors = error.stdout
          .split("\n")
          .filter((line) => line.includes("error TS"))
          .slice(0, 3); // Show first 3 errors

        this.results.typescript.details.push(...typeErrors);
      }
    }
  }

  /**
   * Validate test execution
   */
  async validateTests() {
    log("🧪 Validating test execution...", colors.cyan);

    try {
      // Run tests across workspaces
      const output = execSync("pnpm test", {
        encoding: "utf8",
        timeout: 300000, // 5 minutes timeout
      });

      this.results.tests.passed = true;
      this.results.tests.details.push("All tests pass across workspaces");

      // Extract test statistics if available
      const testStats = /(\d+)\s+passing/.exec(output);
      if (testStats) {
        this.results.tests.details.push(`${testStats[1]} tests passing`);
      }
    } catch (error) {
      this.results.tests.passed = false;
      this.results.tests.details.push(`Test execution failed: ${error.message}`);

      // Extract specific test failures
      if (error.stdout) {
        const testFailures = error.stdout
          .split("\n")
          .filter((line) => line.includes("FAIL") || line.includes("Error:"))
          .slice(0, 3); // Show first 3 failures

        this.results.tests.details.push(...testFailures);
      }
    }
  }

  /**
   * Validate documentation completeness
   */
  async validateDocumentation() {
    log("📚 Validating documentation completeness...", colors.cyan);

    const requiredDocs = [
      { file: "README.md", description: "Project README" },
      { file: "CLAUDE.md", description: "Claude Code instructions" },
      { file: "LICENSE", description: "License file" },
      { file: ".env.example", description: "Environment template" },
      { file: "package.json", description: "Package configuration", requireFields: ["name", "description", "scripts"] },
      { file: "pnpm-workspace.yaml", description: "Workspace configuration" },
      { file: "turbo.json", description: "Turbo configuration" },
    ];

    let allDocsValid = true;
    const missingDocs = [];
    const incompleteFiles = [];

    for (const doc of requiredDocs) {
      const filePath = path.join(this.projectRoot, doc.file);

      if (!fs.existsSync(filePath)) {
        missingDocs.push(doc.file);
        allDocsValid = false;
        continue;
      }

      // Special validation for package.json
      if (doc.file === "package.json" && doc.requireFields) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(filePath, "utf8"));
          const missingFields = doc.requireFields.filter((field) => !packageJson[field]);

          if (missingFields.length > 0) {
            incompleteFiles.push(`${doc.file}: missing ${missingFields.join(", ")}`);
            allDocsValid = false;
          }
        } catch (error) {
          incompleteFiles.push(`${doc.file}: invalid JSON format`);
          allDocsValid = false;
        }
      }

      // Check file size (empty files are problematic)
      const stats = fs.statSync(filePath);
      if (stats.size < 10) {
        // Less than 10 bytes is likely empty or placeholder
        incompleteFiles.push(`${doc.file}: file appears to be empty or placeholder`);
      }
    }

    // Check for package-specific documentation
    const packagesDir = path.join(this.projectRoot, "packages");
    if (fs.existsSync(packagesDir)) {
      const packageDirs = fs.readdirSync(packagesDir).filter((dir) => {
        return fs.statSync(path.join(packagesDir, dir)).isDirectory();
      });

      for (const packageDir of packageDirs) {
        const packagePath = path.join(packagesDir, packageDir);
        const packageReadme = path.join(packagePath, "README.md");
        const packageJson = path.join(packagePath, "package.json");

        if (!fs.existsSync(packageReadme)) {
          missingDocs.push(`packages/${packageDir}/README.md`);
          allDocsValid = false;
        }

        if (fs.existsSync(packageJson)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(packageJson, "utf8"));
            if (!pkg.description) {
              incompleteFiles.push(`packages/${packageDir}/package.json: missing description`);
            }
          } catch (error) {
            incompleteFiles.push(`packages/${packageDir}/package.json: invalid JSON`);
            allDocsValid = false;
          }
        }
      }
    }

    // Store results
    this.results.documentation.passed = allDocsValid;
    if (allDocsValid) {
      this.results.documentation.details.push("All required documentation files are present and complete");
    } else {
      if (missingDocs.length > 0) {
        this.results.documentation.details.push(`Missing documentation: ${missingDocs.join(", ")}`);
      }
      if (incompleteFiles.length > 0) {
        this.results.documentation.details.push(`Incomplete files: ${incompleteFiles.join(", ")}`);
      }
    }
  }

  /**
   * Validate project structure
   */
  async validateProjectStructure() {
    log("🏗️ Validating project structure...", colors.cyan);

    // Expected directory structure
    const REQUIRED_STRUCTURE = {
      // Root directories
      apps: { type: "directory", required: true },
      packages: {
        type: "directory",
        required: true,
        children: {
          core: { type: "directory", required: true },
          services: { type: "directory", required: true },
          tooling: { type: "directory", required: true },
        },
      },
      tools: {
        type: "directory",
        required: true,
        children: {
          scripts: { type: "directory", required: true },
        },
      },
      tests: { type: "directory", required: true },
      docs: { type: "directory", required: true },
      docker: { type: "directory", required: false },
      scripts: { type: "directory", required: false },
      ".github": {
        type: "directory",
        required: true,
        children: {
          workflows: { type: "directory", required: true },
        },
      },

      // Root files
      "package.json": { type: "file", required: true },
      "pnpm-workspace.yaml": { type: "file", required: true },
      "turbo.json": { type: "file", required: true },
      "tsconfig.json": { type: "file", required: true },
      ".gitignore": { type: "file", required: true },
      ".npmrc": { type: "file", required: true },
      LICENSE: { type: "file", required: true },
      "README.md": { type: "file", required: true },
      ".env.example": { type: "file", required: true },
      ".eslintrc.js": { type: "file", required: false },
      ".prettierrc": { type: "file", required: true },
    };

    const results = this.validateStructureRecursive(this.projectRoot, REQUIRED_STRUCTURE);

    // Check for anti-patterns
    const antiPatternViolations = this.checkAntiPatterns();

    // Check permissions on critical files
    const permissionIssues = this.checkFilePermissions();

    // Compile results
    const hasIssues =
      results.missing.length > 0 ||
      results.errors.length > 0 ||
      antiPatternViolations.length > 0 ||
      permissionIssues.length > 0;

    this.results.structure.passed = !hasIssues;

    if (!hasIssues) {
      this.results.structure.details.push("Project structure is compliant with requirements");
      this.results.structure.details.push(`Validated ${results.valid.length} structure elements`);
    } else {
      if (results.missing.length > 0) {
        this.results.structure.details.push(`Missing required elements: ${results.missing.join(", ")}`);
      }
      if (results.errors.length > 0) {
        this.results.structure.details.push(`Structure errors: ${results.errors.join(", ")}`);
      }
      if (antiPatternViolations.length > 0) {
        this.results.structure.details.push(`Anti-pattern violations: ${antiPatternViolations.length} found`);
      }
      if (permissionIssues.length > 0) {
        this.results.structure.details.push(`Permission issues: ${permissionIssues.join(", ")}`);
      }
    }
  }

  /**
   * Validate structure recursively
   */
  validateStructureRecursive(basePath, structure, parentPath = "") {
    const results = {
      valid: [],
      missing: [],
      errors: [],
    };

    for (const [name, spec] of Object.entries(structure)) {
      const fullPath = path.join(basePath, parentPath, name);
      const exists = fs.existsSync(fullPath);

      if (!exists && spec.required) {
        results.missing.push(path.join(parentPath, name));
      } else if (exists) {
        const stat = fs.statSync(fullPath);
        const isDirectory = stat.isDirectory();
        const expectedType = spec.type === "directory";

        if (isDirectory !== expectedType) {
          results.errors.push(
            `${path.join(parentPath, name)} should be a ${spec.type}, but is a ${isDirectory ? "directory" : "file"}`,
          );
        } else {
          results.valid.push(path.join(parentPath, name));

          // Recursively check children
          if (spec.children && isDirectory) {
            const childResults = this.validateStructureRecursive(basePath, spec.children, path.join(parentPath, name));
            results.valid.push(...childResults.valid);
            results.missing.push(...childResults.missing);
            results.errors.push(...childResults.errors);
          }
        }
      }
    }

    return results;
  }

  /**
   * Check for anti-patterns in project structure
   */
  checkAntiPatterns() {
    const violations = [];

    // Check for nested node_modules
    const checkNested = (dir, depth = 0, parentDir = "") => {
      const dirName = path.basename(dir);
      // Skip .pnpm directory - it's pnpm's internal structure
      if (dirName === ".pnpm") {
        return [];
      }
      // Check for nested node_modules only in workspace packages (not in root node_modules)
      if (depth > 1 && dirName === "node_modules" && !parentDir.includes("node_modules")) {
        return [dir];
      }
      const nestedViolations = [];
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            nestedViolations.push(...checkNested(itemPath, depth + 1, dir));
          }
        }
      }
      return nestedViolations;
    };

    const nestedNodeModules = checkNested(this.projectRoot);
    violations.push(...nestedNodeModules.map((v) => `Nested node_modules: ${v}`));

    // Check for missing workspace protocol in package.json files
    const checkWorkspaceProtocol = (filePath) => {
      if (!fs.existsSync(filePath)) return [];
      const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const deps = { ...content.dependencies, ...content.devDependencies };
      const protocolViolations = [];
      for (const [name, version] of Object.entries(deps || {})) {
        if (name.startsWith("@axon/") && !version.startsWith("workspace:")) {
          protocolViolations.push(`${filePath}: ${name} should use workspace:* protocol`);
        }
      }
      return protocolViolations;
    };

    // Check all package.json files for workspace protocol
    const workspaceViolations = [];
    workspaceViolations.push(...checkWorkspaceProtocol(path.join(this.projectRoot, "package.json")));

    const checkWorkspaces = (dir) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        if (fs.statSync(itemPath).isDirectory() && item !== "node_modules") {
          const pkgJsonPath = path.join(itemPath, "package.json");
          if (fs.existsSync(pkgJsonPath)) {
            workspaceViolations.push(...checkWorkspaceProtocol(pkgJsonPath));
          }
          checkWorkspaces(itemPath);
        }
      }
    };

    checkWorkspaces(path.join(this.projectRoot, "packages"));
    checkWorkspaces(path.join(this.projectRoot, "apps"));

    violations.push(...workspaceViolations);

    return violations;
  }

  /**
   * Check file permissions on critical files
   */
  checkFilePermissions() {
    const criticalFiles = ["package.json", "pnpm-workspace.yaml", ".gitignore"];
    const permissionIssues = [];

    for (const file of criticalFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        try {
          fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
          permissionIssues.push(`${file}: ${error.message}`);
        }
      }
    }

    return permissionIssues;
  }

  /**
   * Generate comprehensive quality gates report
   */
  generateQualityReport() {
    logSection("📊 QUALITY GATES VALIDATION REPORT");

    const categories = [
      { key: "eslint", name: "ESLint Validation (V1.13)", required: true },
      { key: "prettier", name: "Prettier Formatting (V1.14)", required: true },
      { key: "husky", name: "Husky Git Hooks (V1.15)", required: true },
      { key: "typescript", name: "TypeScript Type Checking", required: false },
      { key: "tests", name: "Test Execution", required: false },
    ];

    let overallPassed = true;
    let requiredFailures = 0;

    for (const category of categories) {
      const result = this.results[category.key];
      const status = result.passed ? "✅ PASS" : "❌ FAIL";
      const required = category.required ? "(REQUIRED)" : "(OPTIONAL)";

      log(`\n${status} ${category.name} ${required}`, result.passed ? colors.green : colors.red);

      for (const detail of result.details) {
        log(`  ${detail}`, colors.dim);
      }

      if (!result.passed) {
        overallPassed = false;
        if (category.required) {
          requiredFailures++;
        }
      }
    }

    log(`\n${"=".repeat(80)}`, colors.cyan);

    if (overallPassed) {
      logSuccess("🎉 ALL QUALITY GATES PASSED");
      logSuccess("✅ V1.13: ESLint runs without errors");
      logSuccess("✅ V1.14: Prettier formatting is consistent");
      logSuccess("✅ V1.15: Husky git hooks are functional");
    } else {
      logError("❌ QUALITY GATES FAILED");
      logError(`💥 ${requiredFailures} required validation(s) failed`);

      if (requiredFailures > 0) {
        log("\n🔧 Required actions:", colors.yellow + colors.bold);
        if (!this.results.eslint.passed) {
          log("  • Fix ESLint errors across all workspaces");
        }
        if (!this.results.prettier.passed) {
          log("  • Fix Prettier formatting issues");
        }
        if (!this.results.husky.passed) {
          log("  • Configure and test all git hooks");
        }
      }
    }

    return overallPassed;
  }

  /**
   * Run comprehensive quality gates validation
   */
  async validateQuality() {
    logSection("🚀 COMPREHENSIVE QUALITY GATES VALIDATION");

    await this.validateESLint();
    await this.validatePrettier();
    await this.validateHuskyHooks();
    await this.validateTypeScript();
    await this.validateTests();

    const passed = this.generateQualityReport();

    // Save results
    this.saveResults("quality-gates-validation.json");

    if (!passed) {
      process.exit(1);
    }

    return true;
  }

  /**
   * Run documentation validation
   */
  async validateDocs() {
    logSection("📚 DOCUMENTATION COMPLETENESS VALIDATION");

    await this.validateDocumentation();

    // Display results
    if (this.results.documentation.passed) {
      logSuccess("Documentation validation passed");
    } else {
      logError("Documentation validation failed");
    }

    this.results.documentation.details.forEach((detail) => {
      log(`  ${detail}`, this.results.documentation.passed ? colors.green : colors.red);
    });

    // Save results
    this.saveResults("documentation-validation.json");

    return this.results.documentation.passed;
  }

  /**
   * Run structure validation
   */
  async validateStructure() {
    logSection("🏗️ PROJECT STRUCTURE VALIDATION");

    await this.validateProjectStructure();

    // Display results
    if (this.results.structure.passed) {
      logSuccess("Project structure validation passed");
    } else {
      logError("Project structure validation failed");
    }

    this.results.structure.details.forEach((detail) => {
      log(`  ${detail}`, this.results.structure.passed ? colors.green : colors.red);
    });

    // Save results
    this.saveResults("structure-validation.json");

    return this.results.structure.passed;
  }

  /**
   * Validate PNPM configuration
   */
  async validatePnpm() {
    logSection("📦 PNPM CONFIGURATION VALIDATION");

    // Initialize pnpm validation results
    this.results.pnpm = { passed: false, details: [] };
    let allPnpmValid = true;

    // Validate pnpm version
    try {
      const version = execSync("pnpm --version", { encoding: "utf8" }).trim();
      const [major, minor, _patch] = version.split(".").map(Number);

      if (major < 10 || (major === 10 && minor < 14)) {
        this.results.pnpm.details.push(`pnpm version ${version} is below required 10.14.0+`);
        allPnpmValid = false;
      } else {
        this.results.pnpm.details.push(`pnpm version ${version} meets requirements`);
      }
    } catch (error) {
      this.results.pnpm.details.push("pnpm is not installed or not in PATH");
      allPnpmValid = false;
    }

    // Validate package.json configuration
    const packageJsonPath = path.join(this.projectRoot, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

        // Check packageManager field
        if (!packageJson.packageManager) {
          this.results.pnpm.details.push("packageManager field missing in package.json");
          allPnpmValid = false;
        } else if (!packageJson.packageManager.startsWith("pnpm@")) {
          this.results.pnpm.details.push("packageManager is not set to pnpm");
          allPnpmValid = false;
        } else {
          const [, specifiedVersion] = packageJson.packageManager.split("@");
          this.results.pnpm.details.push(`packageManager correctly set to pnpm@${specifiedVersion}`);
        }

        // Check engines
        if (!packageJson.engines?.pnpm) {
          this.results.pnpm.details.push("pnpm version not specified in engines");
        } else {
          this.results.pnpm.details.push(`pnpm engine requirement: ${packageJson.engines.pnpm}`);
        }

        // Check workspaces
        if (!packageJson.workspaces || packageJson.workspaces.length === 0) {
          this.results.pnpm.details.push("No workspaces defined in package.json");
        } else {
          this.results.pnpm.details.push(`${packageJson.workspaces.length} workspace patterns defined`);
        }
      } catch (error) {
        this.results.pnpm.details.push(`Error parsing package.json: ${error.message}`);
        allPnpmValid = false;
      }
    }

    // Validate pnpm-workspace.yaml
    const workspacePath = path.join(this.projectRoot, "pnpm-workspace.yaml");
    if (!fs.existsSync(workspacePath)) {
      this.results.pnpm.details.push("pnpm-workspace.yaml not found");
      allPnpmValid = false;
    } else {
      const content = fs.readFileSync(workspacePath, "utf8");
      if (!content.includes("packages:")) {
        this.results.pnpm.details.push("pnpm-workspace.yaml missing packages field");
        allPnpmValid = false;
      } else {
        const patterns = content.match(/^\s*-\s+"[^"]+"/gm) || [];
        this.results.pnpm.details.push(`${patterns.length} workspace patterns configured`);
      }
    }

    // Validate .npmrc
    const npmrcPath = path.join(this.projectRoot, ".npmrc");
    if (!fs.existsSync(npmrcPath)) {
      this.results.pnpm.details.push(".npmrc not found");
      allPnpmValid = false;
    } else {
      const content = fs.readFileSync(npmrcPath, "utf8");
      const requiredSettings = ["strict-peer-dependencies", "shamefully-hoist", "link-workspace-packages"];

      requiredSettings.forEach((setting) => {
        if (content.includes(`${setting}=`)) {
          this.results.pnpm.details.push(`${setting} configured`);
        } else {
          this.results.pnpm.details.push(`${setting} not configured in .npmrc`);
        }
      });
    }

    this.results.pnpm.passed = allPnpmValid;

    // Display results
    if (this.results.pnpm.passed) {
      logSuccess("PNPM configuration validation passed");
    } else {
      logError("PNPM configuration validation failed");
    }

    this.results.pnpm.details.forEach((detail) => {
      log(`  ${detail}`, this.results.pnpm.passed ? colors.green : colors.red);
    });

    // Save results
    this.saveResults("pnpm-validation.json");

    return this.results.pnpm.passed;
  }

  /**
   * Validate package.json changes and consistency
   */
  async validatePackageChanges() {
    logSection("📋 PACKAGE.JSON CHANGES VALIDATION");

    // Initialize package changes validation results
    this.results.packageChanges = { passed: false, details: [] };
    let allPackageValid = true;

    const packageJsonPath = path.join(this.projectRoot, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      this.results.packageChanges.details.push("package.json not found");
      this.results.packageChanges.passed = false;
      return false;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      // Validate engines
      const { engines } = packageJson;
      if (!engines) {
        this.results.packageChanges.details.push("No engines specified in package.json");
        allPackageValid = false;
      } else {
        if (!engines.node) {
          this.results.packageChanges.details.push("Node.js version not specified in engines");
          allPackageValid = false;
        } else if (!engines.node.match(/>=?\d+\.\d+\.\d+/)) {
          this.results.packageChanges.details.push("Invalid Node.js version format in engines");
          allPackageValid = false;
        } else {
          this.results.packageChanges.details.push(`Node.js engine requirement: ${engines.node}`);
        }

        if (!engines.pnpm) {
          this.results.packageChanges.details.push("pnpm version not specified in engines");
          allPackageValid = false;
        } else {
          this.results.packageChanges.details.push(`pnpm engine requirement: ${engines.pnpm}`);
        }
      }

      // Validate scripts
      const { scripts } = packageJson;
      if (!scripts) {
        this.results.packageChanges.details.push("No scripts defined in package.json");
        allPackageValid = false;
      } else {
        const requiredScripts = ["build", "test", "lint", "dev", "clean"];
        const missingScripts = requiredScripts.filter((script) => !scripts[script]);

        if (missingScripts.length > 0) {
          this.results.packageChanges.details.push(`Missing scripts: ${missingScripts.join(", ")}`);
          allPackageValid = false;
        } else {
          this.results.packageChanges.details.push("All required scripts are present");
        }
      }

      // Validate dependency versions
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      let vulnerableFound = false;
      for (const [name, version] of Object.entries(allDeps)) {
        // Check for problematic version patterns
        if (version.includes("*") || version.includes("x")) {
          this.results.packageChanges.details.push(`${name} uses wildcard version (${version})`);
          allPackageValid = false;
        }

        // Check for known vulnerable patterns
        const vulnerablePatterns = {
          lodash: "Consider using native methods or lodash-es",
          moment: "Consider using date-fns or native Date",
          request: "Deprecated library, use node-fetch or axios",
        };

        if (vulnerablePatterns[name] && !vulnerableFound) {
          this.results.packageChanges.details.push(`Found potentially outdated dependencies: ${name}`);
          vulnerableFound = true;
        }
      }

      if (!vulnerableFound) {
        this.results.packageChanges.details.push("No known vulnerable dependencies detected");
      }

      // Validate workspaces
      const { workspaces } = packageJson;
      if (!workspaces || !Array.isArray(workspaces)) {
        this.results.packageChanges.details.push("Workspaces configuration is missing or invalid");
        allPackageValid = false;
      } else {
        // Check if workspace directories exist
        let invalidWorkspaces = 0;
        for (const workspace of workspaces) {
          const cleanPattern = workspace.replace("/*", "");
          if (!fs.existsSync(cleanPattern)) {
            invalidWorkspaces++;
          }
        }

        if (invalidWorkspaces > 0) {
          this.results.packageChanges.details.push(`${invalidWorkspaces} workspace directories missing`);
        } else {
          this.results.packageChanges.details.push("All workspace directories exist");
        }
      }
    } catch (error) {
      this.results.packageChanges.details.push(`Error parsing package.json: ${error.message}`);
      allPackageValid = false;
    }

    this.results.packageChanges.passed = allPackageValid;

    // Display results
    if (this.results.packageChanges.passed) {
      logSuccess("Package changes validation passed");
    } else {
      logError("Package changes validation failed");
    }

    this.results.packageChanges.details.forEach((detail) => {
      log(`  ${detail}`, this.results.packageChanges.passed ? colors.green : colors.red);
    });

    // Save results
    this.saveResults("package-changes-validation.json");

    return this.results.packageChanges.passed;
  }

  /**
   * Verify builds across all packages
   */
  async verifyBuilds() {
    logSection("🏗️ BUILD VERIFICATION");

    // Initialize build verification results
    this.results.builds = { passed: false, details: [] };
    let allBuildsValid = true;

    try {
      // Clean before building
      log("🧹 Cleaning previous builds...", colors.cyan);
      execSync("pnpm clean", { stdio: "pipe" });
      this.results.builds.details.push("Previous builds cleaned successfully");

      // Run Turbo build
      log("📦 Building all packages...", colors.cyan);
      execSync("pnpm build", {
        encoding: "utf8",
        stdio: "pipe",
        timeout: 300000, // 5 minutes timeout
      });

      this.results.builds.details.push("Build completed successfully");

      // Run TypeScript type checking
      log("🔍 Running TypeScript type check...", colors.cyan);
      execSync("pnpm turbo type-check", {
        encoding: "utf8",
        stdio: "pipe",
        timeout: 180000, // 3 minutes timeout
      });

      this.results.builds.details.push("TypeScript type checking passed");

      // Verify package distributions
      log("📋 Verifying package distributions...", colors.cyan);
      const packageDirs = [
        "packages/core/config",
        "packages/core/errors",
        "packages/core/logger",
        "packages/core/types",
      ];

      let distIssues = 0;
      packageDirs.forEach((dir) => {
        const distDir = path.join(this.projectRoot, dir, "dist");
        const packageJson = path.join(this.projectRoot, dir, "package.json");

        if (!fs.existsSync(packageJson)) {
          distIssues++;
          return;
        }

        if (!fs.existsSync(distDir)) {
          distIssues++;
          return;
        }

        const distFiles = fs.readdirSync(distDir);
        const hasIndexJs = distFiles.some((f) => f.startsWith("index."));

        if (!hasIndexJs) {
          distIssues++;
        }
      });

      if (distIssues === 0) {
        this.results.builds.details.push("All package distributions are valid");
      } else {
        this.results.builds.details.push(`${distIssues} distribution issues found`);
        allBuildsValid = false;
      }
    } catch (error) {
      this.results.builds.details.push(`Build verification failed: ${error.message}`);
      allBuildsValid = false;
    }

    this.results.builds.passed = allBuildsValid;

    // Display results
    if (this.results.builds.passed) {
      logSuccess("Build verification passed");
    } else {
      logError("Build verification failed");
    }

    this.results.builds.details.forEach((detail) => {
      log(`  ${detail}`, this.results.builds.passed ? colors.green : colors.red);
    });

    // Save results
    this.saveResults("build-verification.json");

    return this.results.builds.passed;
  }
}

// ============================================================================
// UTILITY COMMANDS
// ============================================================================

class UtilityTool extends AxonTool {
  constructor() {
    super();
    this.results = {
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detect platform and generate configuration
   */
  async detectPlatform() {
    logSection("🔍 PLATFORM DETECTION");

    this.results.platformDetection = { passed: false, details: [], platform: {} };

    try {
      const platform = {
        os: execSync("uname -s", { encoding: "utf8" }).trim().toLowerCase(),
        arch: execSync("uname -m", { encoding: "utf8" }).trim(),
        cpus: require("os").cpus().length,
        totalMemory: Math.round(require("os").totalmem() / (1024 * 1024 * 1024)),
        freeMemory: Math.round(require("os").freemem() / (1024 * 1024 * 1024)),
        isRaspberryPi: false,
        isARM: false,
        recommendations: [],
      };

      // Check if ARM architecture
      platform.isARM = ["arm", "arm64", "aarch64", "armv7l"].includes(platform.arch);

      // Detect Raspberry Pi on Linux
      if (platform.os === "linux") {
        try {
          const cpuInfo = fs.readFileSync("/proc/cpuinfo", "utf8");
          platform.isRaspberryPi = cpuInfo.includes("Raspberry Pi");
          if (platform.isRaspberryPi) {
            const modelMatch = /Model\s+:\s+(.+)/.exec(cpuInfo);
            if (modelMatch) {
              platform.model = modelMatch[1].trim();
            }
          }
        } catch (error) {
          // Not a Linux system or no cpuinfo available
        }
      }

      // Generate recommendations
      if (platform.isRaspberryPi) {
        platform.recommendations.push("Detected Raspberry Pi - Optimizing for ARM64");
        platform.recommendations.push("Use lightweight Docker images");
        platform.recommendations.push("Limit concurrent builds to 2");

        if (platform.totalMemory < 4) {
          platform.recommendations.push("Warning: Low memory detected. Consider swap file");
        }
      }

      if (platform.isARM && !platform.isRaspberryPi) {
        platform.recommendations.push("ARM architecture detected - Using ARM-compatible dependencies");
      }

      if (platform.totalMemory < 8) {
        platform.recommendations.push(`Memory constrained environment (${platform.totalMemory}GB)`);
        platform.recommendations.push("Reduce Turborepo concurrency");
      }

      this.results.platformDetection.platform = platform;
      this.results.platformDetection.passed = true;

      // Display platform information
      log(`OS: ${platform.os}`, colors.green);
      log(`Architecture: ${platform.arch}`, colors.green);
      log(`CPUs: ${platform.cpus}`, colors.green);
      log(`Total Memory: ${platform.totalMemory} GB`, colors.green);
      log(`Is ARM: ${platform.isARM ? "Yes" : "No"}`, colors.green);
      log(`Is Raspberry Pi: ${platform.isRaspberryPi ? "Yes" : "No"}`, colors.green);

      if (platform.model) {
        log(`Model: ${platform.model}`, colors.green);
      }

      if (platform.recommendations.length > 0) {
        log("\n📋 Recommendations:", colors.yellow);
        platform.recommendations.forEach((rec) => {
          log(`  • ${rec}`, colors.yellow);
          this.results.platformDetection.details.push(rec);
        });
      }

      // Write platform environment file
      const envContent = `# Auto-generated platform configuration
# Generated: ${new Date().toISOString()}

PLATFORM_OS=${platform.os}
PLATFORM_ARCH=${platform.arch}
PLATFORM_CPUS=${platform.cpus}
PLATFORM_MEMORY_GB=${platform.totalMemory}
IS_RASPBERRY_PI=${platform.isRaspberryPi}
IS_ARM=${platform.isARM}
${platform.model ? `PLATFORM_MODEL=${platform.model}` : ""}

# Build optimization settings
TURBO_CONCURRENCY=${platform.totalMemory < 8 ? 2 : platform.cpus}
NODE_OPTIONS="--max-old-space-size=${Math.floor(platform.totalMemory * 512)}"
`;

      fs.writeFileSync(path.join(this.projectRoot, ".env.platform"), envContent);
      log("✅ Platform configuration written to .env.platform", colors.green);

      return true;
    } catch (error) {
      this.results.platformDetection.details.push(`Error detecting platform: ${error.message}`);
      this.results.platformDetection.passed = false;
      logError(`Platform detection failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Debug environment and provide comprehensive information
   */
  async debugEnvironment() {
    logSection("🔧 ENVIRONMENT DEBUG");

    this.results.environmentDebug = { passed: false, details: [], info: {} };

    try {
      const debugInfo = {
        system: {
          platform: require("os").platform(),
          arch: require("os").arch(),
          release: require("os").release(),
          hostname: require("os").hostname(),
          uptime: `${Math.floor(require("os").uptime() / 3600)} hours`,
          cpus: require("os").cpus().length,
          totalMemory: `${Math.round(require("os").totalmem() / (1024 * 1024 * 1024))} GB`,
          freeMemory: `${Math.round(require("os").freemem() / (1024 * 1024 * 1024))} GB`,
        },
        nodejs: {
          version: process.version,
          execPath: process.execPath,
          pid: process.pid,
        },
        tools: {},
        project: {},
      };

      // Check development tools
      const tools = [
        { name: "git", check: "git --version" },
        { name: "docker", check: "docker --version" },
        { name: "pnpm", check: "pnpm --version" },
        { name: "turbo", check: "turbo --version" },
        { name: "tsc", check: "tsc --version" },
      ];

      tools.forEach((tool) => {
        try {
          const version = execSync(tool.check, { encoding: "utf8", stdio: "pipe" }).trim();
          debugInfo.tools[tool.name] = version;
        } catch (error) {
          debugInfo.tools[tool.name] = "Not installed";
        }
      });

      // Project information
      const packageJsonPath = path.join(this.projectRoot, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
          debugInfo.project.name = pkg.name || "Unknown";
          debugInfo.project.version = pkg.version || "Unknown";
          debugInfo.project.workspaces = (pkg.workspaces || []).length;
          debugInfo.project.scripts = Object.keys(pkg.scripts || {}).length;
        } catch (error) {
          debugInfo.project.error = error.message;
        }
      }

      // Git information
      try {
        debugInfo.project.gitBranch = execSync("git branch --show-current", {
          encoding: "utf8",
          stdio: "pipe",
        }).trim();
        debugInfo.project.gitCommit = execSync("git rev-parse --short HEAD", {
          encoding: "utf8",
          stdio: "pipe",
        }).trim();
      } catch (error) {
        debugInfo.project.gitError = "Not a git repository or git not available";
      }

      this.results.environmentDebug.info = debugInfo;
      this.results.environmentDebug.passed = true;

      // Display environment information
      log("System Information:", colors.cyan);
      Object.entries(debugInfo.system).forEach(([key, value]) => {
        log(`  ${key}: ${value}`, colors.green);
      });

      log("\nNode.js Information:", colors.cyan);
      Object.entries(debugInfo.nodejs).forEach(([key, value]) => {
        log(`  ${key}: ${value}`, colors.green);
      });

      log("\nDevelopment Tools:", colors.cyan);
      Object.entries(debugInfo.tools).forEach(([key, value]) => {
        const color = value === "Not installed" ? colors.red : colors.green;
        log(`  ${key}: ${value}`, color);
      });

      log("\nProject Information:", colors.cyan);
      Object.entries(debugInfo.project).forEach(([key, value]) => {
        log(`  ${key}: ${value}`, colors.green);
      });

      return true;
    } catch (error) {
      this.results.environmentDebug.details.push(`Error debugging environment: ${error.message}`);
      this.results.environmentDebug.passed = false;
      logError(`Environment debug failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Synchronize workspace dependencies
   */
  async syncWorkspaceDeps() {
    logSection("🔄 WORKSPACE DEPENDENCIES SYNCHRONIZATION");

    this.results.workspaceSync = { passed: false, details: [], conflicts: [] };

    try {
      // Find all package.json files
      const findPackageJsonFiles = (dir, basePath = "") => {
        const files = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });

          for (const entry of entries) {
            if (entry.name === "node_modules") continue;

            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(basePath, entry.name);

            if (entry.isDirectory()) {
              files.push(...findPackageJsonFiles(fullPath, relativePath));
            } else if (entry.name === "package.json") {
              files.push(relativePath);
            }
          }
        } catch (error) {
          log(`Warning: Could not read directory ${dir}`, colors.yellow);
        }
        return files;
      };

      const packageJsonFiles = findPackageJsonFiles(this.projectRoot);
      const workspaces = [];

      // Parse all package.json files
      for (const file of packageJsonFiles) {
        const fullPath = path.join(this.projectRoot, file);
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, "utf8"));
          workspaces.push({
            path: file,
            name: content.name || "unnamed",
            dependencies: content.dependencies || {},
            devDependencies: content.devDependencies || {},
          });
        } catch (error) {
          this.results.workspaceSync.details.push(`Failed to parse ${file}: ${error.message}`);
        }
      }

      log(`Found ${workspaces.length} workspace packages`, colors.green);

      // Analyze dependency versions
      const dependencyMap = new Map();
      const conflicts = [];

      workspaces.forEach((workspace) => {
        const allDeps = { ...workspace.dependencies, ...workspace.devDependencies };

        Object.entries(allDeps).forEach(([depName, version]) => {
          if (!dependencyMap.has(depName)) {
            dependencyMap.set(depName, new Map());
          }

          const versionMap = dependencyMap.get(depName);
          if (!versionMap.has(version)) {
            versionMap.set(version, []);
          }

          versionMap.get(version).push(workspace.name);
        });
      });

      // Find conflicts
      dependencyMap.forEach((versionMap, depName) => {
        if (versionMap.size > 1) {
          const versions = Array.from(versionMap.entries()).map(([version, workspacesList]) => ({
            version,
            workspaces: workspacesList,
          }));

          conflicts.push({
            dependency: depName,
            versions,
          });
        }
      });

      this.results.workspaceSync.conflicts = conflicts;
      this.results.workspaceSync.details.push(`Analyzed ${dependencyMap.size} unique dependencies`);
      this.results.workspaceSync.details.push(`Found ${conflicts.length} version conflicts`);

      if (conflicts.length === 0) {
        logSuccess("All dependencies are synchronized across workspaces!");
        this.results.workspaceSync.passed = true;
      } else {
        log(`Found ${conflicts.length} dependency version conflicts:`, colors.yellow);
        conflicts.slice(0, 10).forEach((conflict) => {
          log(`  📦 ${conflict.dependency}:`, colors.yellow);
          conflict.versions.forEach((versionInfo) => {
            log(`    ${versionInfo.version} used by: ${versionInfo.workspaces.join(", ")}`, colors.dim);
          });
        });

        if (conflicts.length > 10) {
          log(`  ... and ${conflicts.length - 10} more conflicts`, colors.dim);
        }

        log("\n💡 Recommendations:", colors.cyan);
        log("  • Run 'pnpm update --latest' to update dependencies", colors.cyan);
        log("  • Run 'pnpm dedupe' to remove duplicates", colors.cyan);
        log("  • Consider using exact versions for critical dependencies", colors.cyan);
      }

      // Save results
      this.saveResults("workspace-deps-sync.json");

      return true;
    } catch (error) {
      this.results.workspaceSync.details.push(`Error syncing workspace dependencies: ${error.message}`);
      this.results.workspaceSync.passed = false;
      logError(`Workspace dependency sync failed: ${error.message}`);
      return false;
    }
  }
}

// ============================================================================
// PERFORMANCE TESTING TOOLS
// ============================================================================

class PerformanceTool extends AxonTool {
  /**
   * Benchmark pnpm install performance
   * From benchmark-install.cjs
   */
  async benchmarkInstall() {
    logInfo("🏎️ Starting pnpm install performance benchmark");

    const projectRoot = path.resolve(process.cwd());
    const tempBackupPath = path.join(projectRoot, ".benchmark-backup");
    const results = [];

    const formatDuration = (seconds) => {
      if (seconds < 60) {
        return `${seconds.toFixed(2)}s`;
      }
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = (seconds % 60).toFixed(0);
      return `${minutes}m ${remainingSeconds}s`;
    };

    const backupNodeModules = () => {
      logInfo("Backing up current node_modules...");
      const nodeModulesPath = path.join(projectRoot, "node_modules");
      const lockfilePath = path.join(projectRoot, "pnpm-lock.yaml");

      if (!fs.existsSync(tempBackupPath)) {
        fs.mkdirSync(tempBackupPath, { recursive: true });
      }

      if (fs.existsSync(nodeModulesPath)) {
        fs.writeFileSync(path.join(tempBackupPath, ".node_modules_existed"), "true");
        logSuccess("node_modules exists, will be cleared for benchmark");
      }

      if (fs.existsSync(lockfilePath)) {
        fs.copyFileSync(lockfilePath, path.join(tempBackupPath, "pnpm-lock.yaml"));
        logSuccess("Lockfile backed up");
      }
    };

    const clearNodeModules = () => {
      logInfo("Clearing node_modules and cache...");
      const nodeModulesPath = path.join(projectRoot, "node_modules");

      try {
        if (fs.existsSync(nodeModulesPath)) {
          execSync(`rm -rf "${nodeModulesPath}"`, { cwd: projectRoot });
          logSuccess("node_modules cleared");
        }

        try {
          execSync("pnpm store prune", { cwd: projectRoot, stdio: "ignore" });
          logSuccess("pnpm store pruned");
        } catch (e) {
          logWarning("Could not prune pnpm store (non-critical)");
        }
      } catch (error) {
        logError(`Failed to clear node_modules: ${error.message}`);
        throw error;
      }
    };

    const restoreBackup = () => {
      logInfo("Restoring original state...");
      const lockfileBackup = path.join(tempBackupPath, "pnpm-lock.yaml");
      const lockfilePath = path.join(projectRoot, "pnpm-lock.yaml");

      if (fs.existsSync(lockfileBackup)) {
        fs.copyFileSync(lockfileBackup, lockfilePath);
        logSuccess("Lockfile restored");
      }

      if (fs.existsSync(tempBackupPath)) {
        fs.rmSync(tempBackupPath, { recursive: true, force: true });
      }
      logSuccess("Backup cleaned up");
    };

    const runInstallBenchmark = (type = "cold") => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        logInfo(`Starting ${type} install benchmark...`);

        const child = spawn("pnpm", ["install", "--prefer-offline"], {
          cwd: projectRoot,
          stdio: "pipe",
          env: { ...process.env, CI: "true" },
        });

        let output = "";

        child.stdout.on("data", (data) => {
          const dataStr = data.toString();
          output += String(dataStr);
          process.stdout.write(`  ${colors.cyan}│${colors.reset} ${dataStr}`);
        });

        child.stderr.on("data", (data) => {
          const dataStr = data.toString();
          output += String(dataStr);
          process.stderr.write(`  ${colors.yellow}│${colors.reset} ${dataStr}`);
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
    };

    try {
      // Check if pnpm is installed
      try {
        execSync("pnpm --version", { stdio: "ignore" });
      } catch (error) {
        logError("pnpm is not installed or not in PATH");
        return false;
      }

      log(`${colors.cyan}${colors.bold}Axon Flow - pnpm Install Performance Benchmark${colors.reset}`);
      log("=".repeat(60));
      log(`${colors.yellow}Target: < 60 seconds for workspace builds${colors.reset}`);
      log(`${"=".repeat(60)}\n`);

      // Backup current state
      backupNodeModules();

      // Cold start benchmark
      log("\n=== COLD START BENCHMARK ===", colors.bold);
      clearNodeModules();
      const coldResult = await runInstallBenchmark("cold");
      results.push(coldResult);

      // Warm cache benchmark
      log("\n=== WARM CACHE BENCHMARK ===", colors.bold);
      clearNodeModules();
      const warmResult = await runInstallBenchmark("warm");
      results.push(warmResult);

      // No-op benchmark
      log("\n=== NO-OP BENCHMARK ===", colors.bold);
      const noopResult = await runInstallBenchmark("no-op");
      results.push(noopResult);

      // Generate report
      console.log(`\n${"=".repeat(60)}`);
      log("BENCHMARK RESULTS", colors.bold);
      console.log("=".repeat(60));

      const target = 60;
      const allPassed = results.every((result) => Boolean(result.success));

      results.forEach((result) => {
        const status = result.success ? "PASS" : "FAIL";
        const statusColor = result.success ? colors.green : colors.red;
        const icon = result.success ? "✓" : "✗";

        console.log(`\n${colors.bold}${result.type.toUpperCase()} Install:${colors.reset}`);
        console.log(`  Duration: ${formatDuration(result.duration)}`);
        console.log(`  Target: < ${target}s`);
        console.log(`  Status: ${statusColor}${icon} ${status}${colors.reset}`);

        if (!result.success) {
          const overtime = result.duration - target;
          console.log(`  ${colors.yellow}Exceeded by: ${formatDuration(overtime)}${colors.reset}`);
        }
      });

      // Summary
      console.log(`\n${"=".repeat(60)}`);
      console.log(`${colors.bold}SUMMARY:${colors.reset}`);

      const avgDuration = results.reduce((sum, r) => Number(sum) + Number(r.duration), 0) / results.length;
      console.log(`  Average Duration: ${formatDuration(avgDuration)}`);
      console.log(`  Fastest: ${formatDuration(Math.min(...results.map((r) => r.duration)))}`);
      console.log(`  Slowest: ${formatDuration(Math.max(...results.map((r) => r.duration)))}`);

      const finalStatus = allPassed ? "PASSED" : "FAILED";
      const finalColor = allPassed ? colors.green : colors.red;

      console.log(`\n${"=".repeat(60)}`);
      console.log(`${finalColor}${colors.bold}Performance Benchmark ${finalStatus}${colors.reset}`);
      console.log(`${"=".repeat(60)}\n`);

      if (!allPassed) {
        console.log(`${colors.yellow}⚠ Performance Optimization Suggestions:${colors.reset}`);
        console.log("  1. Ensure pnpm store is properly configured");
        console.log("  2. Check network connectivity and registry settings");
        console.log("  3. Consider using --prefer-offline for faster installs");
        console.log("  4. Verify no unnecessary dependencies in package.json");
        console.log("  5. Check for large packages that might slow installation\n");
      }

      // Restore original state
      restoreBackup();

      // Final install to restore node_modules
      if (allPassed) {
        logInfo("Restoring node_modules with final install...");
        execSync("pnpm install --prefer-offline", {
          cwd: projectRoot,
          stdio: "inherit",
        });
      }

      return allPassed;
    } catch (error) {
      logError(`Benchmark failed: ${error.message}`);

      // Try to restore on error
      try {
        restoreBackup();
      } catch (restoreError) {
        logError("Failed to restore backup");
      }
      return false;
    }
  }

  /**
   * Profile startup performance of commands
   * From profile-startup.cjs
   */
  async profileStartup() {
    logInfo("🚀 Starting Node.js startup profiling");

    const profileCommand = async (command, args = []) => {
      return new Promise((resolve, reject) => {
        const startTime = process.hrtime.bigint();
        const startMemory = process.memoryUsage();

        log(`${colors.cyan}⏱️  Profiling: ${command} ${args.join(" ")}${colors.reset}`);

        const child = spawn("node", ["--prof", "--prof-process", command, ...args], {
          stdio: "inherit",
          env: { ...process.env, NODE_ENV: "production" },
        });

        child.on("close", (code) => {
          const endTime = process.hrtime.bigint();
          const endMemory = process.memoryUsage();

          const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
          const memoryDelta = {
            heapUsed: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024, // MB
            external: (endMemory.external - startMemory.external) / 1024 / 1024, // MB
            rss: (endMemory.rss - startMemory.rss) / 1024 / 1024, // MB
          };

          if (code === 0) {
            resolve({
              command: `${command} ${args.join(" ")}`,
              duration,
              memoryDelta,
              exitCode: code,
            });
          } else {
            reject(new Error(`Command failed with exit code ${code}`));
          }
        });

        child.on("error", reject);
      });
    };

    const analyzeProfilerOutput = () => {
      const profileFiles = fs
        .readdirSync(process.cwd())
        .filter((file) => file.startsWith("isolate-") && file.endsWith(".log"));

      if (profileFiles.length === 0) {
        logWarning("No profiler output files found");
        return null;
      }

      const analysis = {
        files: profileFiles,
        totalSize: 0,
        recommendations: [],
      };

      profileFiles.forEach((file) => {
        const stats = fs.statSync(file);
        analysis.totalSize += stats.size;
      });

      // Add recommendations based on profile size
      if (analysis.totalSize > 10 * 1024 * 1024) {
        // > 10MB
        analysis.recommendations.push("Large profile size indicates complex startup - consider lazy loading");
      }

      return analysis;
    };

    const generateReport = (results, analysis) => {
      console.log(`\n${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}`);
      console.log(`${colors.bold}                    STARTUP PERFORMANCE REPORT                    ${colors.reset}`);
      console.log(`${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

      console.log(`${colors.bold}📊 PERFORMANCE METRICS:${colors.reset}`);
      console.log("─────────────────────────────────────────────────────────────");

      results.forEach((result) => {
        console.log(`\n${colors.cyan}Command:${colors.reset} ${result.command}`);
        console.log(`${colors.green}Duration:${colors.reset} ${result.duration.toFixed(2)}ms`);

        // Performance rating
        let rating, ratingColor;
        if (result.duration < 100) {
          rating = "Excellent";
          ratingColor = colors.green;
        } else if (result.duration < 500) {
          rating = "Good";
          ratingColor = colors.green;
        } else if (result.duration < 1000) {
          rating = "Acceptable";
          ratingColor = colors.yellow;
        } else {
          rating = "Needs Improvement";
          ratingColor = colors.red;
        }

        console.log(`${colors.blue}Rating:${colors.reset} ${ratingColor}${rating}${colors.reset}`);

        console.log(`\n${colors.bold}Memory Usage:${colors.reset}`);
        console.log(
          `  Heap: ${result.memoryDelta.heapUsed > 0 ? "+" : ""}${result.memoryDelta.heapUsed.toFixed(2)} MB`,
        );
        console.log(`  RSS: ${result.memoryDelta.rss > 0 ? "+" : ""}${result.memoryDelta.rss.toFixed(2)} MB`);
        console.log(
          `  External: ${result.memoryDelta.external > 0 ? "+" : ""}${result.memoryDelta.external.toFixed(2)} MB`,
        );
      });

      if (analysis) {
        console.log(`\n${colors.bold}🔍 PROFILER ANALYSIS:${colors.reset}`);
        console.log("─────────────────────────────────────────────────────────────");
        console.log(`Profile files generated: ${analysis.files.length}`);
        console.log(`Total profile size: ${(analysis.totalSize / 1024 / 1024).toFixed(2)} MB`);

        if (analysis.recommendations.length > 0) {
          console.log(`\n${colors.bold}💡 RECOMMENDATIONS:${colors.reset}`);
          analysis.recommendations.forEach((rec, index) => {
            console.log(`${Number(index) + 1}. ${rec}`);
          });
        }
      }

      // General recommendations
      console.log(`\n${colors.bold}🚀 OPTIMIZATION TIPS:${colors.reset}`);
      console.log("─────────────────────────────────────────────────────────────");
      console.log("1. Use --require for preloading modules");
      console.log("2. Implement lazy loading for non-critical modules");
      console.log("3. Consider using V8 code caching");
      console.log("4. Minimize synchronous I/O during startup");
      console.log("5. Use NODE_OPTIONS='--max-old-space-size=4096' for memory-intensive apps");
      console.log("6. Profile with '--cpu-prof' for detailed CPU profiling");
      console.log("7. Use 'clinic doctor' for advanced performance diagnostics\n");
    };

    try {
      log(`${colors.cyan}🚀 Starting Node.js startup profiling...${colors.reset}`);
      log("─────────────────────────────────────────────────────────────\n");

      const results = [];

      // Profile different startup scenarios
      const profilesToRun = [
        { command: "tools/scripts/axon-tools.cjs", args: ["validate", "pnpm"], name: "PNPM Validation" },
        { command: "tools/scripts/axon-tools.cjs", args: ["utils", "detect-platform"], name: "Platform Detection" },
      ];

      for (const profile of profilesToRun) {
        try {
          console.log(`\nProfiling ${colors.bold}${profile.name}${colors.reset}...`);
          const result = await profileCommand(profile.command, profile.args);
          results.push(result);
        } catch (error) {
          logError(`Failed to profile ${profile.name}: ${error.message}`);
        }
      }

      // Analyze profiler output
      const analysis = analyzeProfilerOutput();

      // Generate report
      generateReport(results, analysis);

      // Clean up profiler files
      const cleanup = process.argv.includes("--cleanup");
      if (cleanup && analysis) {
        logInfo("Cleaning up profiler files...");
        analysis.files.forEach((file) => {
          fs.unlinkSync(file);
        });
      }

      return true;
    } catch (error) {
      logError(`Startup profiling failed: ${error.message}`);
      return false;
    }
  }
}

// ============================================================================
// QUALITY ASSURANCE TOOLS
// ============================================================================

class QualityTool extends AxonTool {
  /**
   * Check for phantom dependencies
   * From check-phantom-deps.cjs
   */
  async checkPhantomDeps() {
    logInfo("👻 Starting phantom dependency check");

    const projectRoot = path.resolve(process.cwd());
    const phantomDeps = [];
    const validDeps = [];
    const warnings = [];
    const checkedFiles = new Set();

    const loadPackageJson = (packagePath) => {
      try {
        const content = fs.readFileSync(packagePath, "utf8");
        return JSON.parse(content);
      } catch (_error) {
        return null;
      }
    };

    const findWorkspaces = (patterns) => {
      const workspaces = [];
      patterns.forEach((pattern) => {
        const cleanPattern = pattern.replace(/\*/g, "");
        const baseDir = path.join(projectRoot, cleanPattern);

        if (fs.existsSync(baseDir)) {
          const entries = fs.readdirSync(baseDir, { withFileTypes: true });
          entries.forEach((entry) => {
            if (entry.isDirectory()) {
              const workspacePath = path.join(baseDir, entry.name);
              if (fs.existsSync(path.join(workspacePath, "package.json"))) {
                workspaces.push(workspacePath);
              }
            }
          });
        }
      });
      return workspaces;
    };

    const getDeclaredDependencies = () => {
      const rootPackageJson = loadPackageJson(path.join(projectRoot, "package.json"));
      if (!rootPackageJson) {
        throw new Error("Unable to load root package.json");
      }

      const allDeps = new Set();

      // Add root dependencies
      ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].forEach((depType) => {
        if (rootPackageJson[depType]) {
          Object.keys(rootPackageJson[depType]).forEach((dep) => allDeps.add(dep));
        }
      });

      // Add workspace dependencies
      const workspacePatterns = rootPackageJson.workspaces || [];
      const workspaces = findWorkspaces(workspacePatterns);

      workspaces.forEach((workspacePath) => {
        const pkgJson = loadPackageJson(path.join(workspacePath, "package.json"));
        if (pkgJson) {
          if (pkgJson.name) {
            allDeps.add(pkgJson.name);
          }

          ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].forEach((depType) => {
            if (pkgJson[depType]) {
              Object.keys(pkgJson[depType]).forEach((dep) => allDeps.add(dep));
            }
          });
        }
      });

      return allDeps;
    };

    const isBuiltinModule = (moduleName) => {
      const builtins = [
        "assert",
        "buffer",
        "child_process",
        "cluster",
        "console",
        "constants",
        "crypto",
        "dgram",
        "dns",
        "domain",
        "events",
        "fs",
        "http",
        "https",
        "module",
        "net",
        "os",
        "path",
        "process",
        "punycode",
        "querystring",
        "readline",
        "repl",
        "stream",
        "string_decoder",
        "sys",
        "timers",
        "tls",
        "tty",
        "url",
        "util",
        "v8",
        "vm",
        "zlib",
        "worker_threads",
        "perf_hooks",
        "async_hooks",
        "http2",
        "inspector",
        "trace_events",
        "diagnostics_channel",
        "node:fs",
        "node:path",
        "node:url",
        "node:util",
        "node:os",
        "node:crypto",
        "node:child_process",
        "node:process",
        "node:buffer",
        "node:stream",
      ];
      return builtins.includes(moduleName) || moduleName.startsWith("node:");
    };

    const extractImports = (filePath) => {
      const imports = new Set();
      try {
        const content = fs.readFileSync(filePath, "utf8");
        const patterns = [
          /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
          /import\s*\(['"]([^'"]+)['"]\)/g,
          /require\s*\(['"]([^'"]+)['"]\)/g,
          /require\.resolve\s*\(['"]([^'"]+)['"]\)/g,
          /import\s+type\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
        ];

        patterns.forEach((pattern) => {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const [, importPath] = match;
            if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
              const packageName = importPath.startsWith("@")
                ? importPath.split("/").slice(0, 2).join("/")
                : importPath.split("/")[0];

              if (!isBuiltinModule(packageName)) {
                imports.add(packageName);
              }
            }
          }
        });
      } catch (_error) {
        // Silently skip files that can't be read
      }
      return imports;
    };

    const scanDirectory = (dir, extensions = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]) => {
      const imports = new Set();
      const scanRecursive = (currentDir) => {
        try {
          const entries = fs.readdirSync(currentDir, { withFileTypes: true });
          entries.forEach((entry) => {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.name === "node_modules" || entry.name.startsWith(".")) {
              return;
            }

            if (entry.isDirectory()) {
              scanRecursive(fullPath);
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name);
              if (extensions.includes(ext)) {
                checkedFiles.add(fullPath);
                const fileImports = extractImports(fullPath);
                fileImports.forEach((imp) => imports.add(imp));
              }
            }
          });
        } catch (_error) {
          // Skip directories that can't be read
        }
      };
      scanRecursive(dir);
      return imports;
    };

    try {
      // Get declared dependencies
      const declaredDeps = getDeclaredDependencies();
      logInfo(`Found ${declaredDeps.size} declared dependencies`);

      // Scan for imports
      const usedImports = scanDirectory(projectRoot);
      logInfo(`Found ${usedImports.size} unique imports in ${checkedFiles.size} files`);

      // Find phantom dependencies
      usedImports.forEach((imp) => {
        if (!declaredDeps.has(imp)) {
          const modulePath = path.join(projectRoot, "node_modules", imp);
          if (fs.existsSync(modulePath)) {
            phantomDeps.push({
              name: imp,
              severity: "high",
              exists: true,
              message: `Package "${imp}" is used but not declared in any package.json`,
            });
          } else {
            phantomDeps.push({
              name: imp,
              severity: "critical",
              exists: false,
              message: `Package "${imp}" is imported but not installed`,
            });
          }
        } else {
          validDeps.push(imp);
        }
      });

      // Check for suspicious patterns
      const npmrcPath = path.join(projectRoot, ".npmrc");
      if (fs.existsSync(npmrcPath)) {
        const content = fs.readFileSync(npmrcPath, "utf8");
        if (content.includes("shamefully-hoist=true")) {
          warnings.push("shamefully-hoist=true is enabled, which may hide phantom dependencies");
        }
      }

      // Generate report
      console.log(`\n${"=".repeat(60)}`);
      logInfo("PHANTOM DEPENDENCY CHECK RESULTS");
      console.log("=".repeat(60));

      if (phantomDeps.length === 0) {
        console.log(`\n${colors.green}${colors.bold}✓ No phantom dependencies detected!${colors.reset}`);
        logSuccess(`All ${validDeps.length} imports are properly declared`);
      } else {
        console.log(
          `\n${colors.red}${colors.bold}✗ Found ${phantomDeps.length} phantom dependencies:${colors.reset}\n`,
        );

        const critical = phantomDeps.filter((d) => d.severity === "critical");
        const high = phantomDeps.filter((d) => d.severity === "high");

        if (critical.length > 0) {
          console.log(`${colors.red}${colors.bold}CRITICAL (Missing packages):${colors.reset}`);
          critical.forEach((dep) => {
            console.log(`👻 ${dep.name}: ${dep.message}`);
          });
          console.log();
        }

        if (high.length > 0) {
          console.log(`${colors.yellow}${colors.bold}HIGH (Undeclared but available):${colors.reset}`);
          high.forEach((dep) => {
            console.log(`👻 ${dep.name}: ${dep.message}`);
          });
          console.log();
        }

        console.log(`${colors.cyan}${colors.bold}How to fix:${colors.reset}`);
        console.log("1. Add missing packages to the appropriate package.json file");
        console.log("2. Use explicit dependencies instead of relying on transitive ones");
        console.log('3. Run "pnpm install" after adding dependencies');
        console.log('4. Consider using "pnpm why <package>" to understand dependency chains\n');
      }

      if (warnings.length > 0) {
        console.log(`${colors.yellow}${colors.bold}Warnings:${colors.reset}`);
        warnings.forEach((warning) => {
          logWarning(warning);
        });
        console.log();
      }

      // Summary
      console.log("=".repeat(60));
      console.log(`${colors.bold}SUMMARY:${colors.reset}`);
      console.log(`  Files scanned: ${checkedFiles.size}`);
      console.log(`  Valid dependencies: ${validDeps.length}`);
      console.log(`  Phantom dependencies: ${phantomDeps.length}`);
      console.log(`  Warnings: ${warnings.length}`);

      const status = phantomDeps.length === 0 ? "PASSED" : "FAILED";
      const statusColor = phantomDeps.length === 0 ? colors.green : colors.red;

      console.log(`\n${"=".repeat(60)}`);
      console.log(`${statusColor}${colors.bold}Phantom Dependency Check ${status}${colors.reset}`);
      console.log(`${"=".repeat(60)}\n`);

      return phantomDeps.length === 0;
    } catch (error) {
      logError(`Phantom dependency check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Run comprehensive monorepo health check
   * From monorepo-health.cjs
   */
  async checkMonorepoHealth() {
    logInfo("🏥 Starting monorepo health check");

    const projectRoot = process.cwd();
    const results = {
      timestamp: new Date().toISOString(),
      checks: {},
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
      performance: {},
    };

    const executeCheck = async (name, description, checkFn) => {
      log(`\n📋 ${description}`, colors.blue);
      const startTime = Date.now();

      try {
        const result = await checkFn();
        const duration = Date.now() - startTime;

        results.checks[name] = {
          description,
          status: result.success ? "PASS" : "FAIL",
          duration,
          ...result,
        };

        if (result.success) {
          log(`✅ ${description} - PASSED (${duration}ms)`, colors.green);
          results.summary.passed++;
        } else {
          log(`❌ ${description} - FAILED (${duration}ms)`, colors.red);
          if (result.error) log(`   Error: ${result.error}`, colors.red);
          results.summary.failed++;
        }

        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach((warning) => {
            log(`   ⚠️  ${warning}`, colors.yellow);
          });
          results.summary.warnings += Number(result.warnings.length);
        }

        results.summary.total++;
      } catch (error) {
        const duration = Date.now() - startTime;
        log(`❌ ${description} - ERROR (${duration}ms)`, colors.red);
        log(`   ${error.message}`, colors.red);

        results.checks[name] = {
          description,
          status: "ERROR",
          error: error.message,
          duration,
        };

        results.summary.failed++;
        results.summary.total++;
      }
    };

    // Define health checks
    const checkWorkspaceConfiguration = async () => {
      const packageJson = path.join(projectRoot, "package.json");
      const pnpmWorkspace = path.join(projectRoot, "pnpm-workspace.yaml");
      const turboJson = path.join(projectRoot, "turbo.json");

      if (!fs.existsSync(packageJson)) {
        return { success: false, error: "package.json not found" };
      }
      if (!fs.existsSync(pnpmWorkspace)) {
        return { success: false, error: "pnpm-workspace.yaml not found" };
      }
      if (!fs.existsSync(turboJson)) {
        return { success: false, error: "turbo.json not found" };
      }

      // Validate workspace patterns
      const workspaceConfig = fs.readFileSync(pnpmWorkspace, "utf8");
      const expectedPatterns = ["apps/*", "packages/*", "packages/core/*"];
      const missingPatterns = [];

      for (const pattern of expectedPatterns) {
        if (!workspaceConfig.includes(pattern)) {
          missingPatterns.push(pattern);
        }
      }

      if (missingPatterns.length > 0) {
        return {
          success: false,
          error: `Missing workspace patterns: ${missingPatterns.join(", ")}`,
        };
      }

      return { success: true, details: "Workspace configuration is valid" };
    };

    const checkEnvironmentValidation = async () => {
      const warnings = [];

      const nodeVersion = process.version;
      const requiredNodeVersion = "v24.6.0";

      if (nodeVersion < requiredNodeVersion) {
        warnings.push(`Node.js ${requiredNodeVersion}+ required, found ${nodeVersion}`);
      }

      const criticalDirs = ["packages/core", "tools/scripts"];
      const missingDirs = criticalDirs.filter((dir) => !fs.existsSync(path.join(projectRoot, dir)));

      if (missingDirs.length > 0) {
        return {
          success: false,
          error: `Missing critical directories: ${missingDirs.join(", ")}`,
        };
      }

      return {
        success: true,
        details: "Environment validation is valid",
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    };

    const runPerformanceBenchmarks = async () => {
      const benchmarks = {};

      const nodeModulesExists = fs.existsSync(path.join(projectRoot, "node_modules"));
      benchmarks.dependenciesInstalled = nodeModulesExists;

      const startTime = Date.now();
      try {
        execSync("pnpm list --depth 0", {
          cwd: projectRoot,
          stdio: "pipe",
          encoding: "utf8",
        });
        benchmarks.workspaceDiscoveryTime = Date.now() - startTime;
      } catch (_error) {
        benchmarks.workspaceDiscoveryTime = null;
      }

      results.performance = benchmarks;

      const warnings = [];
      if (!benchmarks.dependenciesInstalled) {
        warnings.push("Dependencies not installed - run 'pnpm install'");
      }

      if (benchmarks.workspaceDiscoveryTime !== null && benchmarks.workspaceDiscoveryTime > 5000) {
        warnings.push(`Workspace discovery is slow (${benchmarks.workspaceDiscoveryTime}ms)`);
      }

      return {
        success: true,
        details: "Performance benchmarks completed",
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    };

    try {
      log(`\n${colors.cyan}${colors.bold}🚀 AXON FLOW MONOREPO HEALTH CHECK${colors.reset}`);
      log("Starting comprehensive health validation...", colors.cyan);

      await executeCheck("workspace_config", "Workspace Configuration", checkWorkspaceConfiguration);
      await executeCheck("environment_validation", "Environment Validation", checkEnvironmentValidation);
      await executeCheck("performance_benchmarks", "Performance Benchmarks", runPerformanceBenchmarks);

      // Generate report
      log(`\n${colors.cyan}${colors.bold}🏥 MONOREPO HEALTH REPORT${colors.reset}`);

      log(`\n📊 Summary:`, colors.bold);
      log(`   Total Checks: ${results.summary.total}`);
      log(`   Passed: ${results.summary.passed}`, colors.green);
      log(`   Failed: ${results.summary.failed}`, colors.red);
      log(`   Warnings: ${results.summary.warnings}`, colors.yellow);

      // Performance metrics
      if (Object.keys(results.performance).length > 0) {
        log(`\n⚡ Performance Metrics:`, colors.bold);
        const perf = results.performance;

        if (perf.dependenciesInstalled !== undefined) {
          log(
            `   Dependencies: ${perf.dependenciesInstalled ? "✅ Installed" : "❌ Missing"}`,
            perf.dependenciesInstalled ? colors.green : colors.red,
          );
        }

        if (perf.workspaceDiscoveryTime !== null) {
          log(
            `   Workspace Discovery: ${perf.workspaceDiscoveryTime}ms`,
            perf.workspaceDiscoveryTime < 3000 ? colors.green : colors.yellow,
          );
        }
      }

      // Failed checks detail
      const failedChecks = Object.entries(results.checks).filter(
        ([, result]) => result.status === "FAIL" || result.status === "ERROR",
      );

      if (failedChecks.length > 0) {
        log(`\n❌ Failed Checks:`, colors.red + colors.bold);
        failedChecks.forEach(([name, result]) => {
          log(`   ${name}: ${result.error || result.description}`, colors.red);
        });
      }

      // Overall status
      const isHealthy = results.summary.failed === 0;
      log(
        `\n🏥 Overall Health: ${isHealthy ? "HEALTHY" : "UNHEALTHY"}`,
        isHealthy ? colors.green + colors.bold : colors.red + colors.bold,
      );

      if (!isHealthy) {
        log(`\n💡 Recommendations:`, colors.yellow + colors.bold);
        log(`   • Run individual validation scripts for detailed diagnostics`);
        log(`   • Ensure all dependencies are installed: pnpm install`);
      }

      // Save report to temp directory
      const reportsDir = path.join(projectRoot, ".temp", "reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const reportPath = path.join(reportsDir, "monorepo-health-report.json");
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
      log(`\n📄 Full report saved to: ${reportPath}`, colors.dim);

      return isHealthy;
    } catch (error) {
      logError(`Monorepo health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Run tests for staged files only
   * From test-staged.cjs
   */
  async testStaged() {
    logInfo("🧪 Starting staged file test runner");

    const getStagedFiles = () => {
      try {
        const output = execSync("git diff --cached --name-only", { encoding: "utf8" });
        return output.trim().split("\n").filter(Boolean);
      } catch (_error) {
        logWarning("Could not get staged files, falling back to all staged files");
        return process.argv.slice(2);
      }
    };

    const getWorkspaceRoots = () => {
      try {
        const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
        const workspaces = packageJson.workspaces || [];
        return workspaces.map((ws) => ws.replace("/*", ""));
      } catch (_error) {
        return ["packages", "apps"];
      }
    };

    const findTestFiles = (sourceFile) => {
      const testCandidates = [
        sourceFile.replace(/\.(js|ts|tsx)$/, ".test.$1"),
        sourceFile.replace(/\.(js|ts|tsx)$/, ".spec.$1"),
        sourceFile.replace("/src/", "/tests/").replace(/\.(js|ts|tsx)$/, ".test.$1"),
        sourceFile.replace("/src/", "/__tests__/").replace(/\.(js|ts|tsx)$/, ".test.$1"),
        path.join(
          path.dirname(sourceFile),
          "__tests__",
          path.basename(sourceFile).replace(/\.(js|ts|tsx)$/, ".test.$1"),
        ),
      ];
      return testCandidates.filter(fs.existsSync);
    };

    const getAffectedWorkspaces = (stagedFiles, workspaceRoots) => {
      const affectedWorkspaces = new Set();
      for (const file of stagedFiles) {
        for (const workspaceRoot of workspaceRoots) {
          if (file.startsWith(`${workspaceRoot}/`)) {
            const workspacePath = file.split("/").slice(0, 2).join("/");
            if (fs.existsSync(path.join(workspacePath, "package.json"))) {
              affectedWorkspaces.add(workspacePath);
            }
            break;
          }
        }
      }
      return Array.from(affectedWorkspaces);
    };

    try {
      const stagedFiles = getStagedFiles();
      const workspaceRoots = getWorkspaceRoots();
      const testPatterns = {
        unitTest: /\.(test|spec)\.(js|ts|tsx)$/,
        sourceFile: /\.(js|ts|tsx)$/,
      };

      if (stagedFiles.length === 0) {
        logInfo("📝 No staged files to test");
        return true;
      }

      logInfo(`🔍 Analyzing ${stagedFiles.length} staged file(s)...`);

      const sourceFiles = stagedFiles.filter(
        (file) => testPatterns.sourceFile.test(file) && !testPatterns.unitTest.test(file),
      );
      const testFiles = stagedFiles.filter((file) => testPatterns.unitTest.test(file));

      // Find related test files for modified source files
      const relatedTestFiles = [];
      for (const sourceFile of sourceFiles) {
        const related = findTestFiles(sourceFile);
        relatedTestFiles.push(...related);
      }

      const allTestFiles = [...new Set([...testFiles, ...relatedTestFiles])];

      if (allTestFiles.length === 0) {
        logInfo("📝 No test files found for staged changes, skipping test execution");
        return true;
      }

      logInfo(`🧪 Running tests for ${allTestFiles.length} test file(s)`);

      // Get affected workspaces
      const affectedWorkspaces = getAffectedWorkspaces(stagedFiles, workspaceRoots);

      if (affectedWorkspaces.length > 0) {
        // Run tests in affected workspaces using Turborepo
        const filterArg = affectedWorkspaces.map((ws) => `--filter=${ws}`).join(" ");
        const cmd = `pnpm turbo test ${filterArg} -- --run`;

        logInfo(`Running: ${cmd}`);
        execSync(cmd, {
          stdio: "inherit",
          timeout: 60000, // 1 minute timeout for staged file tests
        });
      } else {
        // Run tests directly with vitest
        const testFileList = allTestFiles.join(" ");
        const cmd = `npx vitest run ${testFileList}`;

        logInfo(`Running: ${cmd}`);
        execSync(cmd, {
          stdio: "inherit",
          timeout: 60000,
        });
      }

      logSuccess("All tests passed");
      return true;
    } catch (error) {
      logError(`Staged file testing failed: ${error.message}`);
      return false;
    }
  }
}

// ============================================================================
// MAIN CLI INTERFACE
// ============================================================================

class AxonToolsCLI {
  constructor() {
    this.commands = {
      env: {
        description: "Environment validation commands",
        subcommands: {
          validate: {
            description: "Validate development environment",
            handler: () => new EnvironmentTool().validateDev(),
          },
        },
      },
      turbo: {
        description: "Turbo cache optimization and performance commands",
        subcommands: {
          optimize: {
            description: "Optimize Turbo cache performance",
            handler: () => new TurboTool().optimizeCache(),
          },
          analyze: {
            description: "Analyze parallel execution efficiency",
            handler: () => new TurboTool().analyzeParallelExecution(),
          },
          monitor: {
            description: "Monitor build performance and cache efficiency",
            handler: () => new TurboTool().monitorPerformance(),
          },
          "validate-cache": {
            description: "Validate turbo cache integrity and structure",
            handler: () => new TurboTool().validateCache(),
          },
          "validate-config": {
            description: "Validate turbo.json configuration",
            handler: () => new TurboTool().validateConfig(),
          },
        },
      },
      security: {
        description: "Security vulnerability analysis and auditing commands",
        subcommands: {
          audit: {
            description: "Run security audit using pnpm",
            handler: () => new SecurityTool().runSecurityAudit(),
          },
          check: {
            description: "Process piped audit data from stdin",
            handler: () => new SecurityTool().processAuditData(),
          },
        },
      },
      validate: {
        description: "Validation commands for quality gates, documentation, and structure",
        subcommands: {
          quality: {
            description: "Validate ESLint, Prettier, Husky, TypeScript, and tests",
            handler: () => new ValidationTool().validateQuality(),
          },
          docs: {
            description: "Validate documentation completeness",
            handler: () => new ValidationTool().validateDocs(),
          },
          structure: {
            description: "Validate project structure compliance",
            handler: () => new ValidationTool().validateStructure(),
          },
          pnpm: {
            description: "Validate PNPM configuration",
            handler: () => new ValidationTool().validatePnpm(),
          },
          "package-changes": {
            description: "Validate package.json changes and consistency",
            handler: () => new ValidationTool().validatePackageChanges(),
          },
          builds: {
            description: "Verify builds across all packages",
            handler: () => new ValidationTool().verifyBuilds(),
          },
        },
      },
      utils: {
        description: "Utility commands for platform detection, environment debugging, and workspace management",
        subcommands: {
          "detect-platform": {
            description: "Detect platform and generate optimized configuration",
            handler: () => new UtilityTool().detectPlatform(),
          },
          "debug-env": {
            description: "Generate comprehensive environment debug report",
            handler: () => new UtilityTool().debugEnvironment(),
          },
          "sync-deps": {
            description: "Synchronize workspace dependencies and detect conflicts",
            handler: () => new UtilityTool().syncWorkspaceDeps(),
          },
        },
      },
      perf: {
        description: "Performance testing and benchmarking commands",
        subcommands: {
          "benchmark-install": {
            description: "Benchmark pnpm install performance against 60-second target",
            handler: () => new PerformanceTool().benchmarkInstall(),
          },
          "profile-startup": {
            description: "Profile Node.js startup performance with V8 profiler",
            handler: () => new PerformanceTool().profileStartup(),
          },
        },
      },
      quality: {
        description: "Quality assurance and dependency management commands",
        subcommands: {
          "phantom-deps": {
            description: "Check for phantom dependencies in the project",
            handler: () => new QualityTool().checkPhantomDeps(),
          },
          "health-check": {
            description: "Run comprehensive monorepo health check",
            handler: () => new QualityTool().checkMonorepoHealth(),
          },
          "test-staged": {
            description: "Run tests for staged files only",
            handler: () => new QualityTool().testStaged(),
          },
        },
      },
      // More command categories will be added as I consolidate scripts
    };
  }

  showHelp() {
    log("Axon Flow Unified Development Tools", colors.bold + colors.cyan);
    log("=====================================", colors.cyan);
    log("");
    log("Usage: node tools/scripts/axon-tools.cjs <command> <subcommand> [options]", colors.bold);
    log("");
    log("Commands:", colors.bold);

    Object.entries(this.commands).forEach(([command, config]) => {
      log(`  ${command.padEnd(12)} ${config.description}`, colors.green);

      Object.entries(config.subcommands).forEach(([sub, subConfig]) => {
        log(`    ${sub.padEnd(10)} ${subConfig.description}`, colors.cyan);
      });
      log("");
    });

    log("Examples:", colors.bold);
    log("  node axon-tools.cjs env validate                                 # Validate environment configuration");

    log("  node axon-tools.cjs utils detect-platform                       # Detect platform configuration");
    log("  node axon-tools.cjs utils debug-env                             # Generate environment debug report");
    log("  node axon-tools.cjs utils sync-deps                             # Sync workspace dependencies");
    log("  node axon-tools.cjs quality phantom-deps                        # Check for phantom dependencies");
    log("  node axon-tools.cjs quality health-check                        # Run comprehensive health check");
    log("  node axon-tools.cjs quality test-staged                         # Test only staged files");
    log("");
  }

  async execute(args) {
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
      this.showHelp();
      return;
    }

    const [command, subcommand] = args;

    if (!this.commands[command]) {
      logError(`Unknown command: ${command}`);
      this.showHelp();
      process.exit(1);
    }

    if (!subcommand || !this.commands[command].subcommands[subcommand]) {
      logError(`Unknown subcommand: ${subcommand} for command: ${command}`);
      this.showHelp();
      process.exit(1);
    }

    try {
      // Pass remaining args to handler for commands that need them
      const additionalArgs = args.slice(2);
      await this.commands[command].subcommands[subcommand].handler(additionalArgs);
    } catch (error) {
      logError(`Command failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (require.main === module) {
  const cli = new AxonToolsCLI();
  const args = process.argv.slice(2);
  cli.execute(args);
}

module.exports = {
  AxonToolsCLI,
  EnvironmentTool,
  TurboTool,
  SecurityTool,
  ValidationTool,
  UtilityTool,
  PerformanceTool,
  QualityTool,
  AxonTool,
  colors,
  log,
  logSection,
  logError,
  logSuccess,
  logWarning,
  logInfo,
};
