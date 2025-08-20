#!/usr/bin/env node

/**
 * Platform Detection Script for Axon Flow
 * Detects architecture and optimizes for Raspberry Pi deployment
 */

const os = require("os");
const fs = require("fs");
const path = require("path");

function detectPlatform() {
  const platform = {
    os: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)), // GB
    freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)), // GB
    isRaspberryPi: false,
    isARM: false,
    recommendations: [],
  };

  // Check if ARM architecture
  platform.isARM = ["arm", "arm64", "aarch64"].includes(platform.arch);

  // Detect Raspberry Pi
  if (platform.os === "linux") {
    try {
      const cpuInfo = fs.readFileSync("/proc/cpuinfo", "utf8");
      platform.isRaspberryPi = cpuInfo.includes("Raspberry Pi");

      if (platform.isRaspberryPi) {
        // Parse model information
        const modelMatch = /Model\s+:\s+(.+)/.exec(cpuInfo);
        if (modelMatch) {
          platform.model = modelMatch[1].trim();
        }
      }
    } catch (e) {
      // Not a Linux system with /proc/cpuinfo
    }
  }

  // Generate recommendations based on platform
  if (platform.isRaspberryPi) {
    platform.recommendations.push("Detected Raspberry Pi - Optimizing for ARM64");
    platform.recommendations.push("Recommended: Use lightweight Docker images");
    platform.recommendations.push("Recommended: Limit concurrent builds to 2");

    if (platform.totalMemory < 4) {
      platform.recommendations.push("Warning: Low memory detected. Consider swap file");
    }
  }

  if (platform.isARM && !platform.isRaspberryPi) {
    platform.recommendations.push("ARM architecture detected - Using ARM-compatible dependencies");
  }

  // Memory-based recommendations
  if (platform.totalMemory < 8) {
    platform.recommendations.push(`Memory constrained environment (${platform.totalMemory}GB)`);
    platform.recommendations.push("Recommended: Reduce Turborepo concurrency");
  }

  return platform;
}

function writeEnvFile(platform) {
  const envPath = path.join(process.cwd(), ".env.platform");
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

  fs.writeFileSync(envPath, envContent);
  console.log("✅ Platform configuration written to .env.platform");
}

function main() {
  console.log("🔍 Detecting platform configuration...\n");

  const platform = detectPlatform();

  console.log("Platform Information:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`OS:            ${platform.os}`);
  console.log(`Architecture:  ${platform.arch}`);
  console.log(`CPUs:          ${platform.cpus}`);
  console.log(`Total Memory:  ${platform.totalMemory} GB`);
  console.log(`Free Memory:   ${platform.freeMemory} GB`);
  console.log(`Is ARM:        ${platform.isARM ? "✅ Yes" : "❌ No"}`);
  console.log(`Is Raspberry:  ${platform.isRaspberryPi ? "✅ Yes" : "❌ No"}`);

  if (platform.model) {
    console.log(`Model:         ${platform.model}`);
  }

  if (platform.recommendations.length > 0) {
    console.log("\n📋 Recommendations:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    platform.recommendations.forEach((rec) => {
      console.log(`  • ${rec}`);
    });
  }

  // Write configuration to file
  writeEnvFile(platform);

  // Exit with appropriate code
  process.exit(0);
}

if (require.main === module) {
  main();
}
