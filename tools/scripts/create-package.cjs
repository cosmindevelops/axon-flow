#!/usr/bin/env node

/**
 * Package Template Generator for Axon Flow
 *
 * Creates new packages with consistent structure following the
 * Hub-centric architecture and provider pattern conventions.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ANSI color codes for terminal output
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function validatePackageName(name) {
  // Validate @axon/package-name format
  const validNamePattern = /^@axon\/[a-z][a-z0-9-]*$/;

  if (!validNamePattern.test(name)) {
    throw new Error(
      `Package name "${name}" is invalid. Must follow format: @axon/package-name (lowercase, hyphens allowed)`,
    );
  }

  // Ensure package doesn't already exist
  const packageDir = getPackageDirectory(name);
  if (fs.existsSync(packageDir)) {
    throw new Error(`Package "${name}" already exists at ${packageDir}`);
  }
}

function getPackageDirectory(packageName) {
  const packagePath = packageName.replace("@axon/", "");
  return path.join(__dirname, "../../packages/core", packagePath);
}

function createDirectoryStructure(packageDir) {
  log(`📁 Creating directory structure at ${packageDir}`, colors.blue);

  // Create main directories
  fs.mkdirSync(packageDir, { recursive: true });
  fs.mkdirSync(path.join(packageDir, "src"), { recursive: true });

  log("  ✓ Created package directories", colors.green);
}

function createPackageJson(packageDir, packageName, description) {
  const packageJsonPath = path.join(packageDir, "package.json");

  const packageJson = {
    name: packageName,
    version: "0.1.0",
    description,
    type: "module",
    main: "./dist/index.js",
    types: "./dist/index.d.ts",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
    },
    files: ["dist"],
    scripts: {
      build: "tsup",
      dev: "tsup --watch",
      test: "vitest",
      "test:watch": "vitest --watch",
      lint: "eslint src/",
      "lint:fix": "eslint src/ --fix",
      "type-check": "tsc --noEmit",
      format: "prettier --write src/",
      clean: "rm -rf dist",
    },
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  log("  ✓ Created package.json", colors.green);
}

function createTsupConfig(packageDir) {
  const tsupConfigPath = path.join(packageDir, "tsup.config.ts");

  const tsupConfig = `import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
`;

  fs.writeFileSync(tsupConfigPath, tsupConfig);
  log("  ✓ Created tsup.config.ts", colors.green);
}

function createTsConfig(packageDir) {
  const tsConfigPath = path.join(packageDir, "tsconfig.json");

  const tsConfig = `{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
`;

  fs.writeFileSync(tsConfigPath, tsConfig);
  log("  ✓ Created tsconfig.json", colors.green);
}

function createIndexFile(packageDir, packageName) {
  const indexPath = path.join(packageDir, "src", "index.ts");

  const packageSimpleName = packageName.replace("@axon/", "");

  const indexContent = `/**
 * ${packageName}
 * 
 * TODO: Add package description and main exports
 */

// TODO: Export your main functionality here
export const ${packageSimpleName.replace(/-/g, "")}Version = "0.1.0";

// TODO: Remove this placeholder and add real exports
export function placeholder() {
  return "${packageName} is ready for implementation";
}
`;

  fs.writeFileSync(indexPath, indexContent);
  log("  ✓ Created src/index.ts", colors.green);
}

function createReadme(packageDir, packageName, description) {
  const readmePath = path.join(packageDir, "README.md");

  const packageSimpleName = packageName.replace("@axon/", "");

  const readmeContent = `# ${packageName}

${description}

## Installation

\`\`\`bash
pnpm add ${packageName}
\`\`\`

## Usage

\`\`\`typescript
import { placeholder } from "${packageName}";

// TODO: Add usage examples
console.log(placeholder());
\`\`\`

## API Reference

TODO: Document your API here

## Architecture

This package follows Axon Flow's Hub-centric architecture patterns:

- **Provider Pattern**: Abstracts external dependencies behind consistent interfaces
- **Registry Integration**: Supports dynamic capability discovery
- **Message-Driven**: Compatible with RabbitMQ message bus communication

## Development

\`\`\`bash
# Install dependencies
pnpm install

# Start development mode
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Lint code
pnpm lint

# Type check
pnpm type-check
\`\`\`

## Contributing

Follow the Axon Flow development guidelines:

1. Maintain semantic preservation during refactoring
2. Use TypeScript strict mode
3. Implement provider pattern for external dependencies
4. Follow naming conventions (interfaces start with \`I\`)
5. Write comprehensive tests

## License

MIT
`;

  fs.writeFileSync(readmePath, readmeContent);
  log("  ✓ Created README.md", colors.green);
}

function updateWorkspaceConfig(packageName) {
  log("📝 Updating workspace configuration...", colors.blue);

  // Add to pnpm workspace (it should already include packages/core/* pattern)
  // But we'll verify the workspace pattern exists
  const workspaceFile = path.join(__dirname, "../../pnpm-workspace.yaml");
  if (fs.existsSync(workspaceFile)) {
    const content = fs.readFileSync(workspaceFile, "utf8");
    if (!content.includes("packages/core/*")) {
      log("  ⚠ Warning: pnpm workspace may need manual update", colors.yellow);
    } else {
      log("  ✓ Workspace configuration is compatible", colors.green);
    }
  }
}

function runInitialBuild(packageDir, packageName) {
  log("🔨 Running initial build...", colors.blue);

  try {
    // Navigate to package directory and run build
    process.chdir(packageDir);
    execSync("pnpm build", { stdio: "pipe" });
    log("  ✓ Initial build successful", colors.green);
  } catch (error) {
    log("  ⚠ Initial build failed - this is normal for new packages", colors.yellow);
    log("  → Run `pnpm build` manually after implementing your package", colors.yellow);
  }
}

function showCompletionMessage(packageName, packageDir) {
  const packageSimpleName = packageName.replace("@axon/", "");

  log(`\n${  "=".repeat(60)}`, colors.green);
  log(`${colors.bold}${colors.green}🎉 Package "${packageName}" created successfully!${colors.reset}`);
  log("=".repeat(60), colors.green);

  log(`\n📍 Location: ${packageDir}`, colors.blue);

  log("\n📋 Next Steps:", colors.yellow);
  log(`  1. cd packages/core/${packageSimpleName}`);
  log(`  2. Update src/index.ts with your implementation`);
  log(`  3. Update README.md with proper documentation`);
  log(`  4. Add dependencies to package.json if needed`);
  log(`  5. Run pnpm dev to start development`);
  log(`  6. Run pnpm test to ensure everything works`);

  log("\n🏗️ Architecture Reminders:", colors.blue);
  log("  • Use Provider Pattern for external dependencies");
  log('  • Implement interfaces starting with "I" prefix');
  log("  • Follow Hub-centric orchestration patterns");
  log("  • Support registry-based capability discovery");

  log("\n✨ Happy coding!", colors.green);
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes("--help") || args.includes("-h")) {
    log("📦 Axon Flow Package Generator", colors.bold);
    log("\nUsage: node create-package.cjs <package-name> <description>", colors.blue);
    log("\nExample:", colors.yellow);
    log('  node create-package.cjs @axon/storage "Storage provider abstraction"');
    log("\nPackage name must follow format: @axon/package-name");
    process.exit(0);
  }

  const [packageName, ...descriptionParts] = args;
  const description = descriptionParts.join(" ");

  if (!description) {
    log("❌ Error: Description is required", colors.red);
    process.exit(1);
  }

  try {
    log("🚀 Creating new Axon Flow package...", colors.bold);

    // Validate inputs
    validatePackageName(packageName);

    // Create package
    const packageDir = getPackageDirectory(packageName);

    createDirectoryStructure(packageDir);
    createPackageJson(packageDir, packageName, description);
    createTsupConfig(packageDir);
    createTsConfig(packageDir);
    createIndexFile(packageDir, packageName);
    createReadme(packageDir, packageName, description);
    updateWorkspaceConfig(packageName);

    // Return to original directory before build attempt
    process.chdir(__dirname);
    runInitialBuild(packageDir, packageName);

    showCompletionMessage(packageName, packageDir);
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validatePackageName,
  getPackageDirectory,
  createDirectoryStructure,
  createPackageJson,
  createTsupConfig,
  createTsConfig,
  createIndexFile,
  createReadme,
};
