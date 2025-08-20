#!/usr/bin/env node

/**
 * Axon Flow - pnpm Configuration Validator
 * Validates pnpm setup, workspace configuration, and dependency resolution
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

class PnpmValidator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, "../..");
    this.errors = [];
    this.warnings = [];
    this.successes = [];
  }

  log(message, type = "info") {
    const prefix = {
      error: `${colors.red}✗${colors.reset}`,
      warning: `${colors.yellow}⚠${colors.reset}`,
      success: `${colors.green}✓${colors.reset}`,
      info: `${colors.blue}ℹ${colors.reset}`,
      header: `${colors.cyan}${colors.bold}▶${colors.reset}`,
    };

    console.log(`${prefix[type] || prefix.info} ${message}`);
  }

  validatePnpmVersion() {
    this.log("Validating pnpm version...", "header");

    try {
      const version = execSync("pnpm --version", { encoding: "utf8" }).trim();
      const [major, minor, patch] = version.split(".").map(Number);

      if (major < 10 || (major === 10 && minor < 14)) {
        this.errors.push(`pnpm version ${version} is below required 10.14.0+`);
        this.log(`pnpm version ${version} is below required 10.14.0+`, "error");
      } else {
        this.successes.push(`pnpm version ${version} meets requirements`);
        this.log(`pnpm version ${version} ✓`, "success");
      }
    } catch (error) {
      this.errors.push("pnpm is not installed or not in PATH");
      this.log("pnpm is not installed or not in PATH", "error");
    }
  }

  validatePackageJson() {
    this.log("Validating package.json configuration...", "header");

    const packageJsonPath = path.join(this.projectRoot, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      this.errors.push("package.json not found");
      this.log("package.json not found", "error");
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    // Check packageManager field
    if (!packageJson.packageManager) {
      this.errors.push("packageManager field missing in package.json");
      this.log("packageManager field missing", "error");
    } else if (!packageJson.packageManager.startsWith("pnpm@")) {
      this.errors.push("packageManager is not set to pnpm");
      this.log("packageManager is not set to pnpm", "error");
    } else {
      const specifiedVersion = packageJson.packageManager.split("@")[1];
      this.successes.push(`packageManager correctly set to pnpm@${specifiedVersion}`);
      this.log(`packageManager: pnpm@${specifiedVersion} ✓`, "success");
    }

    // Check engines
    if (!packageJson.engines?.pnpm) {
      this.warnings.push("pnpm version not specified in engines");
      this.log("pnpm version not specified in engines", "warning");
    } else {
      this.successes.push(`pnpm engine requirement: ${packageJson.engines.pnpm}`);
      this.log(`pnpm engine: ${packageJson.engines.pnpm} ✓`, "success");
    }

    // Check workspaces
    if (!packageJson.workspaces || packageJson.workspaces.length === 0) {
      this.warnings.push("No workspaces defined in package.json");
      this.log("No workspaces defined", "warning");
    } else {
      this.successes.push(`${packageJson.workspaces.length} workspace patterns defined`);
      this.log(`Workspaces: ${packageJson.workspaces.length} patterns ✓`, "success");
    }
  }

  validatePnpmWorkspace() {
    this.log("Validating pnpm-workspace.yaml...", "header");

    const workspacePath = path.join(this.projectRoot, "pnpm-workspace.yaml");

    if (!fs.existsSync(workspacePath)) {
      this.errors.push("pnpm-workspace.yaml not found");
      this.log("pnpm-workspace.yaml not found", "error");
      return;
    }

    const content = fs.readFileSync(workspacePath, "utf8");

    if (!content.includes("packages:")) {
      this.errors.push("pnpm-workspace.yaml missing packages field");
      this.log("Missing packages field", "error");
    } else {
      // Count workspace patterns
      const patterns = content.match(/^\s*-\s+"[^"]+"/gm) || [];
      this.successes.push(`${patterns.length} workspace patterns configured`);
      this.log(`Workspace patterns: ${patterns.length} ✓`, "success");
    }
  }

  validateNpmrc() {
    this.log("Validating .npmrc configuration...", "header");

    const npmrcPath = path.join(this.projectRoot, ".npmrc");

    if (!fs.existsSync(npmrcPath)) {
      this.errors.push(".npmrc not found");
      this.log(".npmrc not found", "error");
      return;
    }

    const content = fs.readFileSync(npmrcPath, "utf8");
    const requiredSettings = [
      "strict-peer-dependencies",
      "shamefully-hoist",
      "link-workspace-packages",
      "prefer-workspace-packages",
      "engine-strict",
      "registry",
      "audit-level",
    ];

    requiredSettings.forEach((setting) => {
      if (content.includes(`${setting}=`)) {
        this.successes.push(`${setting} configured`);
        this.log(`${setting} ✓`, "success");
      } else {
        this.warnings.push(`${setting} not configured in .npmrc`);
        this.log(`${setting} not configured`, "warning");
      }
    });

    // Check for security settings
    if (content.includes("shamefully-hoist=false")) {
      this.successes.push("Phantom dependency prevention enabled");
      this.log("Phantom dependency prevention ✓", "success");
    } else if (content.includes("shamefully-hoist=true")) {
      this.warnings.push("shamefully-hoist=true may allow phantom dependencies");
      this.log("shamefully-hoist=true (phantom deps risk)", "warning");
    }
  }

  validateWorkspaceResolution() {
    this.log("Validating workspace resolution...", "header");

    try {
      // Check if node_modules exists
      const nodeModulesPath = path.join(this.projectRoot, "node_modules");
      if (!fs.existsSync(nodeModulesPath)) {
        this.warnings.push("node_modules not found - run pnpm install");
        this.log("node_modules not found - run pnpm install", "warning");
        return;
      }

      // List workspaces
      const output = execSync("pnpm list --recursive --depth 0 --json", {
        encoding: "utf8",
        cwd: this.projectRoot,
      });

      const workspaces = JSON.parse(output);
      const workspaceCount = Array.isArray(workspaces) ? workspaces.length : 0;

      if (workspaceCount > 0) {
        this.successes.push(`${workspaceCount} workspaces resolved`);
        this.log(`Workspaces resolved: ${workspaceCount} ✓`, "success");
      } else {
        this.warnings.push("No workspaces found in resolution");
        this.log("No workspaces resolved", "warning");
      }
    } catch (error) {
      this.warnings.push("Could not validate workspace resolution");
      this.log("Could not validate workspace resolution", "warning");
    }
  }

  checkPhantomDependencies() {
    this.log("Checking for phantom dependencies...", "header");

    try {
      // Look for direct imports of packages not in package.json
      const nodeModulesPath = path.join(this.projectRoot, "node_modules");

      if (!fs.existsSync(nodeModulesPath)) {
        this.log("Skipping phantom dependency check (no node_modules)", "info");
        return;
      }

      // Check if .pnpm directory exists (indicates proper pnpm usage)
      const pnpmPath = path.join(nodeModulesPath, ".pnpm");
      if (fs.existsSync(pnpmPath)) {
        this.successes.push("pnpm store structure detected");
        this.log("pnpm store structure (.pnpm) ✓", "success");
      } else {
        this.warnings.push(".pnpm directory not found");
        this.log(".pnpm directory not found", "warning");
      }

      // With shamefully-hoist=false, packages should be symlinked
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, "package.json"), "utf8"));

      const declaredDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };

      // Count top-level packages in node_modules (should be minimal with proper hoisting)
      const topLevelPackages = fs
        .readdirSync(nodeModulesPath)
        .filter((name) => !name.startsWith(".") && !name.startsWith("@"));

      this.log(`Top-level packages in node_modules: ${topLevelPackages.length}`, "info");

      if (topLevelPackages.length > Object.keys(declaredDeps).length * 2) {
        this.warnings.push("Possible phantom dependencies detected");
        this.log("High number of top-level packages (possible phantom deps)", "warning");
      } else {
        this.successes.push("No obvious phantom dependencies detected");
        this.log("Phantom dependency check passed ✓", "success");
      }
    } catch (error) {
      this.warnings.push("Could not check for phantom dependencies");
      this.log("Could not complete phantom dependency check", "warning");
    }
  }

  validatePeerDependencies() {
    this.log("Validating peer dependencies...", "header");

    try {
      // Check for peer dependency warnings
      const output = execSync("pnpm list --json 2>&1", {
        encoding: "utf8",
        cwd: this.projectRoot,
      });

      if (output.includes("peer dep missing") || output.includes("WARN")) {
        this.warnings.push("Peer dependency warnings detected");
        this.log("Peer dependency warnings found", "warning");
      } else {
        this.successes.push("No peer dependency conflicts");
        this.log("Peer dependencies resolved ✓", "success");
      }
    } catch (error) {
      // pnpm list might exit with error if there are issues
      this.warnings.push("Could not validate peer dependencies");
      this.log("Could not validate peer dependencies", "warning");
    }
  }

  generateReport() {
    console.log(`\n${  "=".repeat(60)}`);
    this.log("VALIDATION SUMMARY", "header");
    console.log("=".repeat(60));

    console.log(`\n${colors.green}Successes: ${this.successes.length}${colors.reset}`);
    this.successes.forEach((msg) => { console.log(`  ${colors.green}✓${colors.reset} ${msg}`); });

    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}Warnings: ${this.warnings.length}${colors.reset}`);
      this.warnings.forEach((msg) => { console.log(`  ${colors.yellow}⚠${colors.reset} ${msg}`); });
    }

    if (this.errors.length > 0) {
      console.log(`\n${colors.red}Errors: ${this.errors.length}${colors.reset}`);
      this.errors.forEach((msg) => { console.log(`  ${colors.red}✗${colors.reset} ${msg}`); });
    }

    const status = this.errors.length === 0 ? "PASSED" : "FAILED";
    const statusColor = this.errors.length === 0 ? colors.green : colors.red;

    console.log(`\n${  "=".repeat(60)}`);
    console.log(`${statusColor}${colors.bold}Validation ${status}${colors.reset}`);
    console.log(`${"=".repeat(60)  }\n`);

    return this.errors.length === 0 ? 0 : 1;
  }

  async run() {
    console.log(`${colors.cyan}${colors.bold}Axon Flow - pnpm Configuration Validator${colors.reset}`);
    console.log(`${"=".repeat(60)  }\n`);

    this.validatePnpmVersion();
    this.validatePackageJson();
    this.validatePnpmWorkspace();
    this.validateNpmrc();
    this.validateWorkspaceResolution();
    this.checkPhantomDependencies();
    this.validatePeerDependencies();

    return this.generateReport();
  }
}

// Run validator
const validator = new PnpmValidator();
validator
  .run()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error(`${colors.red}Validation failed with error:${colors.reset}`, error);
    process.exit(1);
  });
