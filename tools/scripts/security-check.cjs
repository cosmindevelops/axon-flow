#!/usr/bin/env node

/**
 * Security vulnerability checker for Axon Flow
 * Processes pnpm audit output and provides actionable security reports
 */

const fs = require("fs");
const path = require("path");

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

// Severity levels with their colors and priority
const severityLevels = {
  critical: { color: colors.red, priority: 4, emoji: "🚨" },
  high: { color: colors.red, priority: 3, emoji: "⚠️" },
  moderate: { color: colors.yellow, priority: 2, emoji: "⚡" },
  low: { color: colors.blue, priority: 1, emoji: "ℹ️" },
  info: { color: colors.cyan, priority: 0, emoji: "💡" },
};

/**
 * Parse audit JSON from stdin
 */
async function parseAuditInput() {
  return new Promise((resolve, reject) => {
    let data = "";

    process.stdin.on("data", (chunk) => {
      data += chunk;
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
function processVulnerabilities(auditData) {
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
function generateReport(vulnerabilities, summary) {
  console.log(`\n${  colors.bold  }═══════════════════════════════════════════════════════════════${  colors.reset}`);
  console.log(`${colors.bold  }                    SECURITY VULNERABILITY REPORT                  ${  colors.reset}`);
  console.log(`${colors.bold  }═══════════════════════════════════════════════════════════════${  colors.reset  }\n`);

  // Summary
  console.log(`${colors.bold  }📊 SUMMARY:${  colors.reset}`);
  console.log("─────────────────────────────────────────────────────────────");

  if (summary.total === 0) {
    console.log(`${colors.green  }✅ No vulnerabilities found! Your dependencies are secure.${  colors.reset}`);
    return;
  }

  console.log(`Total vulnerabilities: ${colors.bold}${summary.total}${colors.reset}`);

  if (summary.critical > 0) {
    console.log(
      `${severityLevels.critical.emoji}  Critical: ${severityLevels.critical.color}${summary.critical}${colors.reset}`,
    );
  }
  if (summary.high > 0) {
    console.log(`${severityLevels.high.emoji}  High: ${severityLevels.high.color}${summary.high}${colors.reset}`);
  }
  if (summary.moderate > 0) {
    console.log(
      `${severityLevels.moderate.emoji}  Moderate: ${severityLevels.moderate.color}${summary.moderate}${colors.reset}`,
    );
  }
  if (summary.low > 0) {
    console.log(`${severityLevels.low.emoji}  Low: ${severityLevels.low.color}${summary.low}${colors.reset}`);
  }
  if (summary.info > 0) {
    console.log(`${severityLevels.info.emoji}  Info: ${severityLevels.info.color}${summary.info}${colors.reset}`);
  }

  console.log(`\n${colors.green}✓${colors.reset} Fix available: ${summary.fixAvailable}`);
  console.log(`${colors.yellow}⚠${colors.reset} Manual review required: ${summary.requiresManualReview}`);

  // Detailed vulnerabilities by severity
  ["critical", "high", "moderate", "low", "info"].forEach((severity) => {
    const vulns = vulnerabilities[severity];
    if (vulns.length === 0) return;

    const level = severityLevels[severity];
    console.log(
      `\n${  level.color  }${colors.bold  }━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${  colors.reset}`,
    );
    console.log(
      `${level.emoji} ${level.color}${colors.bold}${severity.toUpperCase()} VULNERABILITIES (${vulns.length})${colors.reset}`,
    );
    console.log(`${level.color  }━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${  colors.reset}`);

    vulns.forEach((vuln, index) => {
      console.log(`\n${colors.bold}[${index + 1}] ${vuln.title}${colors.reset}`);
      console.log(`    Package: ${colors.cyan}${vuln.module}${colors.reset}`);
      console.log(`    Vulnerable: ${colors.red}${vuln.vulnerable_versions}${colors.reset}`);

      if (vuln.fixAvailable) {
        console.log(`    Fixed in: ${colors.green}${vuln.patched_versions}${colors.reset}`);
        console.log(`    Action: ${colors.green}Run 'pnpm update ${vuln.module}' or 'pnpm audit fix'${colors.reset}`);
      } else {
        console.log(`    Status: ${colors.yellow}No fix available yet${colors.reset}`);
        console.log(`    Action: ${colors.yellow}Monitor for updates or consider alternatives${colors.reset}`);
      }

      if (vuln.recommendation) {
        console.log(`    Recommendation: ${vuln.recommendation}`);
      }

      if (vuln.url) {
        console.log(`    More info: ${colors.blue}${vuln.url}${colors.reset}`);
      }
    });
  });

  // Recommendations
  console.log(`\n${  colors.bold  }💡 RECOMMENDATIONS:${  colors.reset}`);
  console.log("─────────────────────────────────────────────────────────────");

  if (summary.critical > 0 || summary.high > 0) {
    console.log(`${colors.red  }1. Address critical and high vulnerabilities immediately!${  colors.reset}`);
  }

  if (summary.fixAvailable > 0) {
    console.log(`2. Run ${  colors.green  }pnpm audit fix${  colors.reset  } to automatically fix available patches`);
  }

  if (summary.requiresManualReview > 0) {
    console.log("3. Review packages without fixes and consider:");
    console.log("   - Checking for alternative packages");
    console.log("   - Implementing workarounds");
    console.log("   - Monitoring for future patches");
  }

  console.log(`4. Run ${  colors.cyan  }pnpm outdated${  colors.reset  } to check for general updates`);
  console.log("5. Keep dependencies up-to-date with regular audits\n");
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log(`${colors.cyan  }🔍 Analyzing security vulnerabilities...${  colors.reset}`);

    const auditData = await parseAuditInput();
    const { vulnerabilities, summary } = processVulnerabilities(auditData);

    generateReport(vulnerabilities, summary);

    // Exit with appropriate code
    if (summary.critical > 0 || summary.high > 0) {
      process.exit(1); // Fail for critical/high vulnerabilities
    } else if (summary.moderate > 0) {
      process.exit(0); // Warning for moderate
    } else {
      process.exit(0); // Success
    }
  } catch (error) {
    console.error(`${colors.red  }❌ Error:${  colors.reset}`, error.message);
    console.error("\nUsage: pnpm audit --json | node tools/scripts/security-check.cjs");
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
