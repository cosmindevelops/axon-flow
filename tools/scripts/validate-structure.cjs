#!/usr/bin/env node

/**
 * Directory Structure Validation Script for Axon Flow
 * Ensures the monorepo structure meets architectural requirements
 */

const fs = require("fs");
const path = require("path");

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

// Anti-patterns to check
const ANTI_PATTERNS = [
  {
    name: "Nested node_modules",
    check: () => {
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
        const violations = [];
        if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const itemPath = path.join(dir, item);
            if (fs.statSync(itemPath).isDirectory()) {
              violations.push(...checkNested(itemPath, depth + 1, dir));
            }
          }
        }
        return violations;
      };
      return checkNested(process.cwd());
    },
  },
  {
    name: "Package sprawl",
    check: () => {
      const packagesDir = path.join(process.cwd(), "packages");
      const violations = [];
      const checkSprawl = (dir, depth = 0) => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          if (fs.statSync(itemPath).isDirectory() && item !== "node_modules") {
            // Check if it's a package (has package.json)
            const pkgJsonPath = path.join(itemPath, "package.json");
            if (fs.existsSync(pkgJsonPath)) {
              if (depth > 2) {
                violations.push(`Deeply nested package: ${itemPath}`);
              }
            } else if (depth > 0) {
              // Directory without package.json at package level
              checkSprawl(itemPath, depth + 1);
            }
          }
        }
      };
      checkSprawl(packagesDir);
      return violations;
    },
  },
  {
    name: "Missing workspace protocol",
    check: () => {
      const violations = [];
      const checkPackageJson = (filePath) => {
        if (!fs.existsSync(filePath)) return;
        const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const deps = { ...content.dependencies, ...content.devDependencies };
        for (const [name, version] of Object.entries(deps || {})) {
          if (name.startsWith("@axon/") && !version.startsWith("workspace:")) {
            violations.push(`${filePath}: ${name} should use workspace:* protocol`);
          }
        }
      };

      // Check root package.json
      checkPackageJson(path.join(process.cwd(), "package.json"));

      // Check all workspace package.json files
      const checkWorkspaces = (dir) => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          if (fs.statSync(itemPath).isDirectory() && item !== "node_modules") {
            const pkgJsonPath = path.join(itemPath, "package.json");
            if (fs.existsSync(pkgJsonPath)) {
              checkPackageJson(pkgJsonPath);
            }
            checkWorkspaces(itemPath);
          }
        }
      };
      checkWorkspaces(path.join(process.cwd(), "packages"));
      checkWorkspaces(path.join(process.cwd(), "apps"));

      return violations;
    },
  },
];

function validateStructure(basePath, structure, parentPath = "") {
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
          const childResults = validateStructure(basePath, spec.children, path.join(parentPath, name));
          results.valid.push(...childResults.valid);
          results.missing.push(...childResults.missing);
          results.errors.push(...childResults.errors);
        }
      }
    }
  }

  return results;
}

function checkPermissions(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch (err) {
    return false;
  }
}

function main() {
  console.log("🔍 Validating Axon Flow Monorepo Structure\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const basePath = process.cwd();
  const results = validateStructure(basePath, REQUIRED_STRUCTURE);

  // Display results
  console.log("\n✅ Valid Structure Elements:", results.valid.length);
  if (results.valid.length > 0 && process.argv.includes("--verbose")) {
    results.valid.forEach((item) => {
      console.log(`   ✓ ${item}`);
    });
  }

  if (results.missing.length > 0) {
    console.log("\n❌ Missing Required Elements:");
    results.missing.forEach((item) => {
      console.log(`   ✗ ${item}`);
    });
  }

  if (results.errors.length > 0) {
    console.log("\n⚠️  Structure Errors:");
    results.errors.forEach((error) => {
      console.log(`   ! ${error}`);
    });
  }

  // Check anti-patterns
  console.log("\n🔍 Checking for Anti-Patterns:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let antiPatternFound = false;
  for (const pattern of ANTI_PATTERNS) {
    const violations = pattern.check();
    if (violations.length > 0) {
      antiPatternFound = true;
      console.log(`\n❌ ${pattern.name}:`);
      violations.forEach((v) => {
        console.log(`   ${v}`);
      });
    } else {
      console.log(`✅ ${pattern.name}: None found`);
    }
  }

  // Check permissions
  console.log("\n🔐 Checking File Permissions:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const criticalFiles = ["package.json", "pnpm-workspace.yaml", ".gitignore"];
  let permissionIssues = false;

  for (const file of criticalFiles) {
    const filePath = path.join(basePath, file);
    if (fs.existsSync(filePath)) {
      if (checkPermissions(filePath)) {
        console.log(`✅ ${file}: Read/Write OK`);
      } else {
        console.log(`❌ ${file}: Permission issues`);
        permissionIssues = true;
      }
    }
  }

  // Summary
  console.log("\n📊 Validation Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const hasIssues = results.missing.length > 0 || results.errors.length > 0 || antiPatternFound || permissionIssues;

  if (hasIssues) {
    console.log("❌ Validation FAILED - Issues found");
    console.log("\nRecommendations:");
    if (results.missing.length > 0) {
      console.log("  • Create missing required directories and files");
    }
    if (antiPatternFound) {
      console.log("  • Fix anti-pattern violations");
    }
    if (permissionIssues) {
      console.log("  • Fix file permission issues");
    }
    process.exit(1);
  } else {
    console.log("✅ Validation PASSED - Structure is compliant!");
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
