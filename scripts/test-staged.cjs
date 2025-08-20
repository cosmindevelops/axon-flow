#!/usr/bin/env node

/**
 * Intelligent Test Runner for Staged Files
 * Runs tests only for relevant files to optimize pre-commit performance
 * Supports monorepo structure with workspace-aware testing
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

class StagedTestRunner {
  constructor() {
    this.stagedFiles = this.getStagedFiles();
    this.workspaceRoots = this.getWorkspaceRoots();
    this.testPatterns = {
      unitTest: /\.(test|spec)\.(js|ts|tsx)$/,
      sourceFile: /\.(js|ts|tsx)$/,
    };
  }

  getStagedFiles() {
    try {
      const output = execSync("git diff --cached --name-only", { encoding: "utf8" });
      return output.trim().split("\n").filter(Boolean);
    } catch (error) {
      console.warn("Could not get staged files, falling back to all staged files");
      return process.argv.slice(2); // Use files passed by lint-staged
    }
  }

  getWorkspaceRoots() {
    try {
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
      const workspaces = packageJson.workspaces || [];
      return workspaces.map((ws) => ws.replace("/*", ""));
    } catch (error) {
      return ["packages", "apps"];
    }
  }

  findTestFiles(sourceFile) {
    const testCandidates = [
      // Co-located tests
      sourceFile.replace(/\.(js|ts|tsx)$/, ".test.$1"),
      sourceFile.replace(/\.(js|ts|tsx)$/, ".spec.$1"),
      // Test directory structure
      sourceFile.replace("/src/", "/tests/").replace(/\.(js|ts|tsx)$/, ".test.$1"),
      sourceFile.replace("/src/", "/__tests__/").replace(/\.(js|ts|tsx)$/, ".test.$1"),
      // Common test patterns
      path.join(path.dirname(sourceFile), "__tests__", path.basename(sourceFile).replace(/\.(js|ts|tsx)$/, ".test.$1")),
    ];

    return testCandidates.filter(fs.existsSync);
  }

  getAffectedWorkspaces() {
    const affectedWorkspaces = new Set();

    for (const file of this.stagedFiles) {
      for (const workspaceRoot of this.workspaceRoots) {
        if (file.startsWith(`${workspaceRoot  }/`)) {
          const workspacePath = file.split("/").slice(0, 2).join("/");
          if (fs.existsSync(path.join(workspacePath, "package.json"))) {
            affectedWorkspaces.add(workspacePath);
          }
          break;
        }
      }
    }

    return Array.from(affectedWorkspaces);
  }

  async runTests() {
    const sourceFiles = this.stagedFiles.filter(
      (file) => this.testPatterns.sourceFile.test(file) && !this.testPatterns.unitTest.test(file),
    );

    const testFiles = this.stagedFiles.filter((file) => this.testPatterns.unitTest.test(file));

    // Find related test files for modified source files
    const relatedTestFiles = [];
    for (const sourceFile of sourceFiles) {
      const related = this.findTestFiles(sourceFile);
      relatedTestFiles.push(...related);
    }

    const allTestFiles = [...new Set([...testFiles, ...relatedTestFiles])];

    if (allTestFiles.length === 0) {
      console.log("📝 No test files found for staged changes, skipping test execution");
      return true;
    }

    console.log(`🧪 Running tests for ${allTestFiles.length} test file(s)`);

    try {
      // Get affected workspaces
      const affectedWorkspaces = this.getAffectedWorkspaces();

      if (affectedWorkspaces.length > 0) {
        // Run tests in affected workspaces using Turborepo
        const filterArg = affectedWorkspaces.map((ws) => `--filter=${ws}`).join(" ");
        const cmd = `pnpm turbo test ${filterArg} -- --run`;

        console.log(`Running: ${cmd}`);
        execSync(cmd, {
          stdio: "inherit",
          timeout: 60000, // 1 minute timeout for staged file tests
        });
      } else {
        // Run tests directly with vitest
        const testFileList = allTestFiles.join(" ");
        const cmd = `npx vitest run ${testFileList}`;

        console.log(`Running: ${cmd}`);
        execSync(cmd, {
          stdio: "inherit",
          timeout: 60000,
        });
      }

      console.log("✅ All tests passed");
      return true;
    } catch (error) {
      console.error("❌ Test execution failed:", error.message);
      return false;
    }
  }

  async run() {
    if (this.stagedFiles.length === 0) {
      console.log("📝 No staged files to test");
      return true;
    }

    console.log(`🔍 Analyzing ${this.stagedFiles.length} staged file(s)...`);

    const success = await this.runTests();

    if (!success) {
      console.error("❌ Staged file testing failed");
      process.exit(1);
    }

    return true;
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new StagedTestRunner();
  runner.run().catch((error) => {
    console.error("❌ Staged test runner failed:", error.message);
    process.exit(1);
  });
}

module.exports = StagedTestRunner;
