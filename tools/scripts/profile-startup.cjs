#!/usr/bin/env node

/**
 * Startup performance profiler for Axon Flow
 * Profiles Node.js application startup time and generates performance reports
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

/**
 * Run profiling for a specific command
 */
async function profileCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    console.log(`${colors.cyan}⏱️  Profiling: ${command} ${args.join(" ")}${colors.reset}`);

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
}

/**
 * Analyze V8 profiler output
 */
function analyzeProfilerOutput() {
  const profileFiles = fs
    .readdirSync(process.cwd())
    .filter((file) => file.startsWith("isolate-") && file.endsWith(".log"));

  if (profileFiles.length === 0) {
    console.log(`${colors.yellow}⚠️  No profiler output files found${colors.reset}`);
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
}

/**
 * Generate performance report
 */
function generateReport(results, analysis) {
  console.log(`\n${  colors.bold  }═══════════════════════════════════════════════════════════════${  colors.reset}`);
  console.log(`${colors.bold  }                    STARTUP PERFORMANCE REPORT                    ${  colors.reset}`);
  console.log(`${colors.bold  }═══════════════════════════════════════════════════════════════${  colors.reset  }\n`);

  console.log(`${colors.bold  }📊 PERFORMANCE METRICS:${  colors.reset}`);
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
    console.log(`  Heap: ${result.memoryDelta.heapUsed > 0 ? "+" : ""}${result.memoryDelta.heapUsed.toFixed(2)} MB`);
    console.log(`  RSS: ${result.memoryDelta.rss > 0 ? "+" : ""}${result.memoryDelta.rss.toFixed(2)} MB`);
    console.log(
      `  External: ${result.memoryDelta.external > 0 ? "+" : ""}${result.memoryDelta.external.toFixed(2)} MB`,
    );
  });

  if (analysis) {
    console.log(`\n${  colors.bold  }🔍 PROFILER ANALYSIS:${  colors.reset}`);
    console.log("─────────────────────────────────────────────────────────────");
    console.log(`Profile files generated: ${analysis.files.length}`);
    console.log(`Total profile size: ${(analysis.totalSize / 1024 / 1024).toFixed(2)} MB`);

    if (analysis.recommendations.length > 0) {
      console.log(`\n${  colors.bold  }💡 RECOMMENDATIONS:${  colors.reset}`);
      analysis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
  }

  // General recommendations
  console.log(`\n${  colors.bold  }🚀 OPTIMIZATION TIPS:${  colors.reset}`);
  console.log("─────────────────────────────────────────────────────────────");
  console.log("1. Use --require for preloading modules");
  console.log("2. Implement lazy loading for non-critical modules");
  console.log("3. Consider using V8 code caching");
  console.log("4. Minimize synchronous I/O during startup");
  console.log("5. Use NODE_OPTIONS='--max-old-space-size=4096' for memory-intensive apps");
  console.log("6. Profile with '--cpu-prof' for detailed CPU profiling");
  console.log("7. Use 'clinic doctor' for advanced performance diagnostics\n");
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log(`${colors.cyan  }🚀 Starting Node.js startup profiling...${  colors.reset}`);
    console.log("─────────────────────────────────────────────────────────────\n");

    const results = [];

    // Profile different startup scenarios
    const profilesToRun = [
      { command: "tools/scripts/validate-pnpm.cjs", args: [], name: "PNPM Validation" },
      { command: "tools/scripts/detect-platform.cjs", args: [], name: "Platform Detection" },
    ];

    for (const profile of profilesToRun) {
      try {
        console.log(`\nProfiling ${colors.bold}${profile.name}${colors.reset}...`);
        const result = await profileCommand(profile.command, profile.args);
        results.push(result);
      } catch (error) {
        console.error(`${colors.red}Failed to profile ${profile.name}: ${error.message}${colors.reset}`);
      }
    }

    // Analyze profiler output
    const analysis = analyzeProfilerOutput();

    // Generate report
    generateReport(results, analysis);

    // Clean up profiler files
    const cleanup = process.argv.includes("--cleanup");
    if (cleanup && analysis) {
      console.log(`${colors.yellow  }Cleaning up profiler files...${  colors.reset}`);
      analysis.files.forEach((file) => {
        fs.unlinkSync(file);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error(`${colors.red  }❌ Error:${  colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
