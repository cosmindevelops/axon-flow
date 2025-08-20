#!/usr/bin/env node

/**
 * Environment debugger for Axon Flow
 * Provides comprehensive environment information for debugging and troubleshooting
 */

const os = require("os");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

/**
 * Execute command safely
 */
function safeExec(command, defaultValue = "N/A") {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return defaultValue;
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Get system information
 */
function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    type: os.type(),
    hostname: os.hostname(),
    uptime: `${Math.floor(os.uptime() / 3600)  } hours`,
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || "Unknown",
    totalMemory: formatBytes(os.totalmem()),
    freeMemory: formatBytes(os.freemem()),
    usedMemory: formatBytes(os.totalmem() - os.freemem()),
    memoryUsage: `${((1 - os.freemem() / os.totalmem()) * 100).toFixed(1)  }%`,
  };
}

/**
 * Get Node.js information
 */
function getNodeInfo() {
  return {
    version: process.version,
    v8Version: process.versions.v8,
    npmVersion: safeExec("npm --version"),
    pnpmVersion: safeExec("pnpm --version"),
    yarnVersion: safeExec("yarn --version"),
    nodeModules: process.versions.modules,
    openssl: process.versions.openssl,
    execPath: process.execPath,
    argv: process.argv.join(" "),
    pid: process.pid,
    ppid: process.ppid,
  };
}

/**
 * Get environment variables
 */
function getEnvVars() {
  const sensitive = ["KEY", "SECRET", "PASSWORD", "TOKEN", "AUTH", "CREDENTIAL"];
  const envVars = {};

  Object.keys(process.env).forEach((key) => {
    const isSensitive = sensitive.some((s) => key.toUpperCase().includes(s));
    envVars[key] = isSensitive ? "[REDACTED]" : process.env[key];
  });

  return envVars;
}

/**
 * Get project information
 */
function getProjectInfo() {
  const projectRoot = process.cwd();
  const packageJsonPath = path.join(projectRoot, "package.json");
  const info = {
    cwd: projectRoot,
    packageJsonExists: fs.existsSync(packageJsonPath),
    name: "Unknown",
    version: "Unknown",
    workspaces: [],
    turboConfigExists: fs.existsSync(path.join(projectRoot, "turbo.json")),
    gitBranch: safeExec("git branch --show-current"),
    gitCommit: safeExec("git rev-parse --short HEAD"),
    gitStatus: `${safeExec("git status --porcelain | wc -l")  } files changed`,
  };

  if (info.packageJsonExists) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      info.name = pkg.name || "Unknown";
      info.version = pkg.version || "Unknown";
      info.workspaces = pkg.workspaces || [];
      info.scripts = `${Object.keys(pkg.scripts || {}).length  } scripts defined`;
      info.dependencies = `${Object.keys(pkg.dependencies || {}).length  } dependencies`;
      info.devDependencies = `${Object.keys(pkg.devDependencies || {}).length  } devDependencies`;
    } catch (error) {
      console.error(`Error reading package.json: ${error.message}`);
    }
  }

  return info;
}

/**
 * Check tool availability
 */
function checkTools() {
  const tools = [
    { name: "git", check: "git --version" },
    { name: "docker", check: "docker --version" },
    { name: "docker-compose", check: "docker-compose --version" },
    { name: "turbo", check: "turbo --version" },
    { name: "tsc", check: "tsc --version" },
    { name: "eslint", check: "eslint --version" },
    { name: "prettier", check: "prettier --version" },
    { name: "vitest", check: "vitest --version" },
  ];

  const results = {};
  tools.forEach((tool) => {
    const version = safeExec(tool.check);
    results[tool.name] = version !== "N/A" ? version : "Not installed";
  });

  return results;
}

/**
 * Display section header
 */
function displayHeader(title) {
  console.log(`\n${  colors.bold  }${colors.cyan  }═══ ${title} ═══${  colors.reset}`);
  console.log(colors.dim + "─".repeat(60) + colors.reset);
}

/**
 * Display key-value pairs
 */
function displayInfo(data, indent = 0) {
  const indentStr = " ".repeat(indent);
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === "object" && !Array.isArray(value)) {
      console.log(`${indentStr}${colors.yellow}${key}:${colors.reset}`);
      displayInfo(value, indent + 2);
    } else if (Array.isArray(value)) {
      console.log(`${indentStr}${colors.yellow}${key}:${colors.reset}`);
      value.forEach((item) => {
        console.log(`${indentStr}  - ${item}`);
      });
    } else {
      const displayValue = value === "[REDACTED]" ? colors.red + value + colors.reset : value;
      console.log(`${indentStr}${colors.yellow}${key}:${colors.reset} ${displayValue}`);
    }
  });
}

/**
 * Main execution
 */
function main() {
  console.log(
    `${colors.bold + colors.blue  }\n╔════════════════════════════════════════════════════════════╗${  colors.reset}`,
  );
  console.log(
    `${colors.bold + colors.blue  }║           AXON FLOW ENVIRONMENT DEBUG REPORT              ║${  colors.reset}`,
  );
  console.log(
    `${colors.bold + colors.blue  }╚════════════════════════════════════════════════════════════╝${  colors.reset}`,
  );
  console.log(`${colors.dim  }Generated at: ${new Date().toISOString()}${  colors.reset}`);

  // System Information
  displayHeader("SYSTEM INFORMATION");
  displayInfo(getSystemInfo());

  // Node.js Information
  displayHeader("NODE.JS INFORMATION");
  displayInfo(getNodeInfo());

  // Project Information
  displayHeader("PROJECT INFORMATION");
  displayInfo(getProjectInfo());

  // Available Tools
  displayHeader("DEVELOPMENT TOOLS");
  displayInfo(checkTools());

  // Environment Variables (filtered)
  const showEnv = process.argv.includes("--env");
  if (showEnv) {
    displayHeader("ENVIRONMENT VARIABLES");
    const envVars = getEnvVars();
    const axonEnvVars = {};
    const nodeEnvVars = {};
    const otherEnvVars = {};

    Object.entries(envVars).forEach(([key, value]) => {
      if (key.startsWith("AXON_") || key.includes("DATABASE") || key.includes("REDIS") || key.includes("RABBITMQ")) {
        axonEnvVars[key] = value;
      } else if (key.startsWith("NODE_") || key.startsWith("NPM_") || key.startsWith("PNPM_")) {
        nodeEnvVars[key] = value;
      } else {
        otherEnvVars[key] = value;
      }
    });

    if (Object.keys(axonEnvVars).length > 0) {
      console.log(`${colors.cyan  }\nAxon Flow Variables:${  colors.reset}`);
      displayInfo(axonEnvVars, 2);
    }

    if (Object.keys(nodeEnvVars).length > 0) {
      console.log(`${colors.cyan  }\nNode.js Variables:${  colors.reset}`);
      displayInfo(nodeEnvVars, 2);
    }

    console.log(`${colors.cyan  }\nOther Variables:${  colors.reset}`);
    console.log(`${colors.dim  }  (Use --env-all to see all)${  colors.reset}`);
  }

  // Network Information
  displayHeader("NETWORK INFORMATION");
  const networkInterfaces = os.networkInterfaces();
  Object.entries(networkInterfaces).forEach(([name, interfaces]) => {
    interfaces.forEach((iface) => {
      if (iface.family === "IPv4" && !iface.internal) {
        console.log(`  ${colors.yellow}${name}:${colors.reset} ${iface.address}`);
      }
    });
  });

  // Recommendations
  displayHeader("DIAGNOSTICS & RECOMMENDATIONS");
  const recommendations = [];

  // Check Node version
  const nodeVersion = parseInt(process.version.slice(1).split(".")[0]);
  if (nodeVersion < 24) {
    recommendations.push(`${colors.red}⚠ Node.js version ${process.version} is below required v24.6.0${colors.reset}`);
  } else {
    recommendations.push(`${colors.green}✓ Node.js version ${process.version} meets requirements${colors.reset}`);
  }

  // Check pnpm
  const pnpmVersion = safeExec("pnpm --version");
  if (pnpmVersion === "N/A") {
    recommendations.push(`${colors.red}⚠ pnpm is not installed - run: npm install -g pnpm${colors.reset}`);
  } else {
    recommendations.push(`${colors.green}✓ pnpm ${pnpmVersion} is installed${colors.reset}`);
  }

  // Check memory
  const memUsagePercent = parseFloat(((1 - os.freemem() / os.totalmem()) * 100).toFixed(1));
  if (memUsagePercent > 80) {
    recommendations.push(
      `${colors.yellow}⚠ High memory usage (${memUsagePercent}%) - consider closing other applications${colors.reset}`,
    );
  } else {
    recommendations.push(`${colors.green}✓ Memory usage is healthy (${memUsagePercent}%)${colors.reset}`);
  }

  recommendations.forEach((rec) => { console.log(`  ${  rec}`); });

  // Footer
  console.log(`\n${  colors.dim  }${"─".repeat(60)  }${colors.reset}`);
  console.log(`${colors.dim  }Options: --env (show environment vars), --env-all (show all vars)${  colors.reset}`);
  console.log(`${colors.dim  }Report bugs to: https://github.com/cosmin/axon-flow/issues${  colors.reset  }\n`);
}

// Run if called directly
if (require.main === module) {
  main();
}
