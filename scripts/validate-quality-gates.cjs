#!/usr/bin/env node

/**
 * Quality Gates Validator
 * Comprehensive validation for all code quality requirements
 * Implements V1.13, V1.14, and V1.15 validation criteria
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class QualityGateValidator {
  constructor() {
    this.results = {
      eslint: { passed: false, details: [] },
      prettier: { passed: false, details: [] },
      husky: { passed: false, details: [] },
      typescript: { passed: false, details: [] },
      tests: { passed: false, details: [] },
    };
  }

  async validateESLint() {
    console.log("🔍 Validating ESLint (V1.13)...");

    try {
      // Run ESLint across all workspaces
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

  async validatePrettier() {
    console.log("🎨 Validating Prettier formatting (V1.14)...");

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
        console.log("  🔧 Attempting to fix formatting...");
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

  async validateHuskyHooks() {
    console.log("🪝 Validating Husky git hooks (V1.15)...");

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

  async validateTypeScript() {
    console.log("🔧 Validating TypeScript configuration...");

    try {
      // Run TypeScript type checking across workspaces
      execSync("pnpm turbo typecheck", {
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

  async validateTests() {
    console.log("🧪 Validating test execution...");

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

  generateReport() {
    console.log(`\n${  "=".repeat(80)}`);
    console.log("📊 QUALITY GATES VALIDATION REPORT");
    console.log("=".repeat(80));

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

      console.log(`\n${status} ${category.name} ${required}`);

      for (const detail of result.details) {
        console.log(`  ${detail}`);
      }

      if (!result.passed) {
        overallPassed = false;
        if (category.required) {
          requiredFailures++;
        }
      }
    }

    console.log(`\n${  "=".repeat(80)}`);

    if (overallPassed) {
      console.log("🎉 ALL QUALITY GATES PASSED");
      console.log("✅ V1.13: ESLint runs without errors");
      console.log("✅ V1.14: Prettier formatting is consistent");
      console.log("✅ V1.15: Husky git hooks are functional");
    } else {
      console.log("❌ QUALITY GATES FAILED");
      console.log(`💥 ${requiredFailures} required validation(s) failed`);

      if (requiredFailures > 0) {
        console.log("\nRequired actions:");
        if (!this.results.eslint.passed) {
          console.log("  • Fix ESLint errors across all workspaces");
        }
        if (!this.results.prettier.passed) {
          console.log("  • Fix Prettier formatting issues");
        }
        if (!this.results.husky.passed) {
          console.log("  • Configure and test all git hooks");
        }
      }
    }

    console.log("=".repeat(80));

    return overallPassed;
  }

  async runValidation() {
    console.log("🚀 Starting comprehensive quality gate validation...\n");

    await this.validateESLint();
    await this.validatePrettier();
    await this.validateHuskyHooks();
    await this.validateTypeScript();
    await this.validateTests();

    const passed = this.generateReport();

    if (!passed) {
      process.exit(1);
    }

    return true;
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new QualityGateValidator();
  validator.runValidation().catch((error) => {
    console.error("❌ Quality gate validation failed:", error.message);
    process.exit(1);
  });
}

module.exports = QualityGateValidator;
