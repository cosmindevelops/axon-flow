#!/usr/bin/env node

/**
 * Package.json Changes Validator
 * Validates changes to package.json files for quality and consistency
 * Ensures dependency updates follow project conventions
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class PackageValidator {
  constructor() {
    this.rootPackage = this.loadPackageJson();
    this.errors = [];
    this.warnings = [];
  }

  loadPackageJson(filePath = "package.json") {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      this.errors.push(`Failed to load ${filePath}: ${error.message}`);
      return null;
    }
  }

  validateEngines() {
    const { engines } = this.rootPackage;
    if (!engines) {
      this.warnings.push("No engines specified in package.json");
      return;
    }

    if (!engines.node) {
      this.errors.push("Node.js version not specified in engines");
    } else if (!engines.node.match(/>=?\d+\.\d+\.\d+/)) {
      this.errors.push("Invalid Node.js version format in engines");
    }

    if (!engines.pnpm) {
      this.errors.push("pnpm version not specified in engines");
    }
  }

  validateDependencyVersions() {
    const allDeps = {
      ...this.rootPackage.dependencies,
      ...this.rootPackage.devDependencies,
    };

    for (const [name, version] of Object.entries(allDeps)) {
      // Check for exact versions on critical dependencies
      const exactVersionDeps = ["typescript", "turbo", "pnpm"];
      if (exactVersionDeps.includes(name) && version.startsWith("^")) {
        this.warnings.push(`${name} should use exact version instead of caret (^) for consistency`);
      }

      // Check for potentially problematic version patterns
      if (version.includes("*") || version.includes("x")) {
        this.errors.push(`${name} uses wildcard version (${version}) which can cause instability`);
      }

      // Check for prerelease versions in production dependencies
      if (
        this.rootPackage.dependencies?.[name] &&
        (version.includes("beta") || version.includes("alpha") || version.includes("rc"))
      ) {
        this.warnings.push(`${name} is using prerelease version ${version} in production dependencies`);
      }
    }
  }

  validateScripts() {
    const { scripts } = this.rootPackage;
    if (!scripts) {
      this.errors.push("No scripts defined in package.json");
      return;
    }

    const requiredScripts = ["build", "test", "lint", "dev", "clean", "verify"];

    for (const script of requiredScripts) {
      if (!scripts[script]) {
        this.errors.push(`Required script '${script}' is missing`);
      }
    }

    // Validate turbo usage in scripts
    const turboScripts = Object.entries(scripts).filter(([, cmd]) => cmd.includes("turbo"));

    for (const [scriptName, cmd] of turboScripts) {
      if (!cmd.includes("turbo ") && !cmd.includes("turbo run")) {
        this.warnings.push(`Script '${scriptName}' may not be using turbo correctly: ${cmd}`);
      }
    }
  }

  validateWorkspaces() {
    const { workspaces } = this.rootPackage;
    if (!workspaces || !Array.isArray(workspaces)) {
      this.errors.push("Workspaces configuration is missing or invalid");
      return;
    }

    // Check if workspace directories exist
    for (const workspace of workspaces) {
      const cleanPattern = workspace.replace("/*", "");
      if (!fs.existsSync(cleanPattern)) {
        this.warnings.push(`Workspace directory '${cleanPattern}' does not exist`);
      }
    }

    // Validate workspace package.json files
    const workspaceDirs = workspaces.map((ws) => ws.replace("/*", "")).filter((dir) => fs.existsSync(dir));

    for (const dir of workspaceDirs) {
      if (dir.endsWith("/*")) continue;

      try {
        const subdirs = fs
          .readdirSync(dir, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => path.join(dir, dirent.name));

        for (const subdir of subdirs) {
          const pkgPath = path.join(subdir, "package.json");
          if (fs.existsSync(pkgPath)) {
            this.validateWorkspacePackage(pkgPath);
          }
        }
      } catch (error) {
        this.warnings.push(`Could not validate workspaces in ${dir}: ${error.message}`);
      }
    }
  }

  validateWorkspacePackage(packagePath) {
    const pkg = this.loadPackageJson(packagePath);
    if (!pkg) return;

    // Check naming convention
    if (pkg.name && !pkg.name.startsWith("@axon/")) {
      this.warnings.push(`Workspace package ${packagePath} should use @axon/ scope`);
    }

    // Check for consistent TypeScript config
    if (fs.existsSync(path.join(path.dirname(packagePath), "src"))) {
      const tsconfigPath = path.join(path.dirname(packagePath), "tsconfig.json");
      if (!fs.existsSync(tsconfigPath)) {
        this.warnings.push(`TypeScript package ${packagePath} missing tsconfig.json`);
      }
    }
  }

  validateSecurityPolicies() {
    // Check for known vulnerable patterns
    const allDeps = {
      ...this.rootPackage.dependencies,
      ...this.rootPackage.devDependencies,
    };

    const vulnerablePatterns = {
      lodash: "Consider using native methods or lodash-es for tree-shaking",
      moment: "Consider using date-fns or native Date for better performance",
      request: "Deprecated library, use node-fetch or axios instead",
    };

    for (const [dep, suggestion] of Object.entries(vulnerablePatterns)) {
      if (allDeps[dep]) {
        this.warnings.push(`${dep}: ${suggestion}`);
      }
    }
  }

  async runValidation() {
    if (!this.rootPackage) {
      console.error("❌ Could not load package.json");
      process.exit(1);
    }

    console.log("🔍 Validating package.json changes...");

    this.validateEngines();
    this.validateDependencyVersions();
    this.validateScripts();
    this.validateWorkspaces();
    this.validateSecurityPolicies();

    // Report results
    if (this.errors.length > 0) {
      console.error("❌ Package validation errors:");
      this.errors.forEach((error) => { console.error(`  • ${error}`); });
      process.exit(1);
    }

    if (this.warnings.length > 0) {
      console.warn("⚠️  Package validation warnings:");
      this.warnings.forEach((warning) => { console.warn(`  • ${warning}`); });
    }

    console.log("✅ Package validation completed successfully");
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new PackageValidator();
  validator.runValidation().catch((error) => {
    console.error("❌ Package validation failed:", error.message);
    process.exit(1);
  });
}

module.exports = PackageValidator;
