#!/usr/bin/env node

/**
 * Axon Flow - Phantom Dependency Checker
 * Detects packages that are used but not explicitly declared as dependencies
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

class PhantomDependencyChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, "../..");
    this.phantomDeps = [];
    this.validDeps = [];
    this.warnings = [];
    this.checkedFiles = new Set();
  }

  log(message, type = "info") {
    const prefix = {
      error: `${colors.red}✗${colors.reset}`,
      warning: `${colors.yellow}⚠${colors.reset}`,
      success: `${colors.green}✓${colors.reset}`,
      info: `${colors.blue}ℹ${colors.reset}`,
      header: `${colors.cyan}${colors.bold}▶${colors.reset}`,
      phantom: `${colors.red}👻${colors.reset}`,
    };

    console.log(`${prefix[type] || prefix.info} ${message}`);
  }

  loadPackageJson(packagePath) {
    try {
      const content = fs.readFileSync(packagePath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  getDeclaredDependencies() {
    const rootPackageJson = this.loadPackageJson(path.join(this.projectRoot, "package.json"));

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
    const workspaces = this.findWorkspaces(workspacePatterns);

    workspaces.forEach((workspacePath) => {
      const pkgJson = this.loadPackageJson(path.join(workspacePath, "package.json"));
      if (pkgJson) {
        // Add workspace itself as a valid dependency
        if (pkgJson.name) {
          allDeps.add(pkgJson.name);
        }

        // Add workspace dependencies
        ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].forEach((depType) => {
          if (pkgJson[depType]) {
            Object.keys(pkgJson[depType]).forEach((dep) => allDeps.add(dep));
          }
        });
      }
    });

    return allDeps;
  }

  findWorkspaces(patterns) {
    const workspaces = [];

    patterns.forEach((pattern) => {
      // Simple glob pattern matching (handles "packages/*", "apps/*", etc.)
      const cleanPattern = pattern.replace(/\*/g, "");
      const baseDir = path.join(this.projectRoot, cleanPattern);

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
  }

  extractImports(filePath) {
    const imports = new Set();

    try {
      const content = fs.readFileSync(filePath, "utf8");

      // Match various import patterns
      const patterns = [
        // ES6 imports
        /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
        /import\s*\(['"]([^'"]+)['"]\)/g,

        // CommonJS requires
        /require\s*\(['"]([^'"]+)['"]\)/g,
        /require\.resolve\s*\(['"]([^'"]+)['"]\)/g,

        // TypeScript type imports
        /import\s+type\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      ];

      patterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1];

          // Extract package name from import path
          if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
            // Handle scoped packages
            const packageName = importPath.startsWith("@")
              ? importPath.split("/").slice(0, 2).join("/")
              : importPath.split("/")[0];

            // Filter out Node.js built-in modules
            if (!this.isBuiltinModule(packageName)) {
              imports.add(packageName);
            }
          }
        }
      });
    } catch (error) {
      // Silently skip files that can't be read
    }

    return imports;
  }

  isBuiltinModule(moduleName) {
    // Node.js built-in modules
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
  }

  scanDirectory(dir, extensions = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]) {
    const imports = new Set();

    const scanRecursive = (currentDir) => {
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        entries.forEach((entry) => {
          const fullPath = path.join(currentDir, entry.name);

          // Skip node_modules and hidden directories
          if (entry.name === "node_modules" || entry.name.startsWith(".")) {
            return;
          }

          if (entry.isDirectory()) {
            scanRecursive(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              this.checkedFiles.add(fullPath);
              const fileImports = this.extractImports(fullPath);
              fileImports.forEach((imp) => imports.add(imp));
            }
          }
        });
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    scanRecursive(dir);
    return imports;
  }

  checkPhantomDependencies() {
    this.log("Scanning for phantom dependencies...", "header");

    // Get declared dependencies
    const declaredDeps = this.getDeclaredDependencies();
    this.log(`Found ${declaredDeps.size} declared dependencies`, "info");

    // Scan for imports
    const usedImports = this.scanDirectory(this.projectRoot);
    this.log(`Found ${usedImports.size} unique imports in ${this.checkedFiles.size} files`, "info");

    // Find phantom dependencies
    usedImports.forEach((imp) => {
      if (!declaredDeps.has(imp)) {
        // Check if it's available in node_modules (inherited from other packages)
        const modulePath = path.join(this.projectRoot, "node_modules", imp);
        if (fs.existsSync(modulePath)) {
          this.phantomDeps.push({
            name: imp,
            severity: "high",
            exists: true,
            message: `Package "${imp}" is used but not declared in any package.json`,
          });
        } else {
          // Import that doesn't exist at all - likely a missing dependency
          this.phantomDeps.push({
            name: imp,
            severity: "critical",
            exists: false,
            message: `Package "${imp}" is imported but not installed`,
          });
        }
      } else {
        this.validDeps.push(imp);
      }
    });

    // Check for suspicious patterns
    this.checkSuspiciousPatterns();
  }

  checkSuspiciousPatterns() {
    // Check if shamefully-hoist is enabled
    const npmrcPath = path.join(this.projectRoot, ".npmrc");
    if (fs.existsSync(npmrcPath)) {
      const content = fs.readFileSync(npmrcPath, "utf8");
      if (content.includes("shamefully-hoist=true")) {
        this.warnings.push("shamefully-hoist=true is enabled, which may hide phantom dependencies");
      }
    }

    // Check for nested node_modules
    const checkForNestedNodeModules = (dir, depth = 0) => {
      if (depth > 3) return; // Limit recursion depth

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        entries.forEach((entry) => {
          if (entry.isDirectory()) {
            const fullPath = path.join(dir, entry.name);
            if (entry.name === "node_modules" && depth > 0) {
              this.warnings.push(`Nested node_modules found at: ${fullPath}`);
            } else if (entry.name !== "node_modules" && !entry.name.startsWith(".")) {
              checkForNestedNodeModules(fullPath, depth + 1);
            }
          }
        });
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    checkForNestedNodeModules(this.projectRoot);
  }

  generateReport() {
    console.log(`\n${  "=".repeat(60)}`);
    this.log("PHANTOM DEPENDENCY CHECK RESULTS", "header");
    console.log("=".repeat(60));

    if (this.phantomDeps.length === 0) {
      console.log(`\n${colors.green}${colors.bold}✓ No phantom dependencies detected!${colors.reset}`);
      this.log(`All ${this.validDeps.length} imports are properly declared`, "success");
    } else {
      console.log(
        `\n${colors.red}${colors.bold}✗ Found ${this.phantomDeps.length} phantom dependencies:${colors.reset}\n`,
      );

      // Group by severity
      const critical = this.phantomDeps.filter((d) => d.severity === "critical");
      const high = this.phantomDeps.filter((d) => d.severity === "high");

      if (critical.length > 0) {
        console.log(`${colors.red}${colors.bold}CRITICAL (Missing packages):${colors.reset}`);
        critical.forEach((dep) => {
          this.log(`${dep.name}: ${dep.message}`, "phantom");
        });
        console.log();
      }

      if (high.length > 0) {
        console.log(`${colors.yellow}${colors.bold}HIGH (Undeclared but available):${colors.reset}`);
        high.forEach((dep) => {
          this.log(`${dep.name}: ${dep.message}`, "phantom");
        });
        console.log();
      }

      console.log(`${colors.cyan}${colors.bold}How to fix:${colors.reset}`);
      console.log("1. Add missing packages to the appropriate package.json file");
      console.log("2. Use explicit dependencies instead of relying on transitive ones");
      console.log('3. Run "pnpm install" after adding dependencies');
      console.log('4. Consider using "pnpm why <package>" to understand dependency chains\n');
    }

    if (this.warnings.length > 0) {
      console.log(`${colors.yellow}${colors.bold}Warnings:${colors.reset}`);
      this.warnings.forEach((warning) => {
        this.log(warning, "warning");
      });
      console.log();
    }

    // Summary
    console.log("=".repeat(60));
    console.log(`${colors.bold}SUMMARY:${colors.reset}`);
    console.log(`  Files scanned: ${this.checkedFiles.size}`);
    console.log(`  Valid dependencies: ${this.validDeps.length}`);
    console.log(`  Phantom dependencies: ${this.phantomDeps.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);

    const status = this.phantomDeps.length === 0 ? "PASSED" : "FAILED";
    const statusColor = this.phantomDeps.length === 0 ? colors.green : colors.red;

    console.log(`\n${  "=".repeat(60)}`);
    console.log(`${statusColor}${colors.bold}Phantom Dependency Check ${status}${colors.reset}`);
    console.log(`${"=".repeat(60)  }\n`);

    return this.phantomDeps.length === 0 ? 0 : 1;
  }

  run() {
    console.log(`${colors.cyan}${colors.bold}Axon Flow - Phantom Dependency Checker${colors.reset}`);
    console.log(`${"=".repeat(60)  }\n`);

    try {
      this.checkPhantomDependencies();
      return this.generateReport();
    } catch (error) {
      this.log(`Check failed: ${error.message}`, "error");
      console.error(error);
      return 1;
    }
  }
}

// Run checker
const checker = new PhantomDependencyChecker();
process.exit(checker.run());
