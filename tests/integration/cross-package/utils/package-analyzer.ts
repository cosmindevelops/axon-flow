/**
 * Cross-Package Integration Test - Package Analyzer Utility
 *
 * Provides utilities for analyzing package dependencies, import relationships,
 * and circular dependency detection for cross-package integration tests.
 */

import { readFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { glob } from "glob";

/**
 * Package dependency information
 */
export interface IPackageDependencyInfo {
  /** Package name (e.g., "@axon/types") */
  name: string;
  /** Absolute path to package directory */
  path: string;
  /** Package.json contents */
  packageJson: Record<string, unknown>;
  /** Direct dependencies from package.json */
  dependencies: string[];
  /** Development dependencies */
  devDependencies: string[];
  /** Internal workspace dependencies */
  workspaceDependencies: string[];
  /** Export map from package.json */
  exports: Record<string, unknown>;
}

/**
 * Import analysis result
 */
export interface IImportAnalysis {
  /** Source file path */
  sourceFile: string;
  /** Target package being imported */
  targetPackage: string;
  /** Import specifier (what's being imported) */
  importSpecifier: string;
  /** Import type (import, require, dynamic) */
  importType: "import" | "require" | "dynamic";
  /** Line number of import */
  line: number;
}

/**
 * Circular dependency detection result
 */
export interface ICircularDependency {
  /** Packages involved in circular dependency */
  cycle: string[];
  /** Description of the circular dependency */
  description: string;
  /** Severity level */
  severity: "error" | "warning" | "info";
}

/**
 * Package dependency validation result
 */
export interface IPackageValidationResult {
  /** Package being validated */
  packageName: string;
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Detected circular dependencies */
  circularDependencies: ICircularDependency[];
  /** Import analysis results */
  importAnalysis: IImportAnalysis[];
}

/**
 * Expected dependency layering structure for Axon Flow
 */
export const DEPENDENCY_LAYERS = {
  /** Base layer - no dependencies on other packages */
  types: 0,
  /** Second layer - depends only on types */
  errors: 1,
  /** Third layer - depends on types and errors */
  config: 2,
  /** Fourth layer - depends on types, errors, config */
  logger: 3,
  /** Fifth layer - depends on all lower layers */
  di: 4,
} as const;

/**
 * Package analyzer for cross-package integration testing
 */
export class PackageAnalyzer {
  private packages = new Map<string, IPackageDependencyInfo>();
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Discover and analyze all packages in the workspace
   */
  async discoverPackages(): Promise<Map<string, IPackageDependencyInfo>> {
    const packageJsonPaths = await glob("packages/core/*/package.json", {
      cwd: this.projectRoot,
      absolute: true,
    });

    for (const packageJsonPath of packageJsonPaths) {
      try {
        const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
        const packagePath = dirname(packageJsonPath);
        const packageName = packageJson.name as string;

        const packageInfo: IPackageDependencyInfo = {
          name: packageName,
          path: packagePath,
          packageJson,
          dependencies: Object.keys(packageJson.dependencies || {}),
          devDependencies: Object.keys(packageJson.devDependencies || {}),
          workspaceDependencies: Object.keys(packageJson.dependencies || {}).filter((dep) => dep.startsWith("@axon/")),
          exports: packageJson.exports || {},
        };

        this.packages.set(packageName, packageInfo);
      } catch (error) {
        console.warn(`Failed to analyze package at ${packageJsonPath}:`, error);
      }
    }

    return this.packages;
  }

  /**
   * Get package information by name
   */
  getPackage(name: string): IPackageDependencyInfo | undefined {
    return this.packages.get(name);
  }

  /**
   * Get all discovered packages
   */
  getAllPackages(): Map<string, IPackageDependencyInfo> {
    return new Map(this.packages);
  }

  /**
   * Analyze imports in a specific file
   */
  async analyzeImports(filePath: string): Promise<IImportAnalysis[]> {
    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const imports: IImportAnalysis[] = [];

      // Determine the current package by looking at the file path
      const currentPackage = this.getPackageFromFilePath(filePath);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;

        // Match ES6 imports
        const importMatch = line.match(/^import\s+.*\s+from\s+["'](@axon\/[^"']+)["']/);
        if (importMatch && importMatch[1]) {
          const targetPackage = this.extractBasePackageName(importMatch[1]);
          const specifierMatch = line.match(/^import\s+(.+?)\s+from/);

          // Only include cross-package imports (not internal imports)
          if (targetPackage !== currentPackage) {
            imports.push({
              sourceFile: filePath,
              targetPackage,
              importSpecifier: specifierMatch?.[1] || "",
              importType: "import",
              line: i + 1,
            });
          }
        }

        // Match CommonJS requires
        const requireMatch = line.match(/require\(["'](@axon\/[^"']+)["']\)/);
        if (requireMatch && requireMatch[1]) {
          const targetPackage = this.extractBasePackageName(requireMatch[1]);

          if (targetPackage !== currentPackage) {
            imports.push({
              sourceFile: filePath,
              targetPackage,
              importSpecifier: "",
              importType: "require",
              line: i + 1,
            });
          }
        }

        // Match dynamic imports
        const dynamicImportMatch = line.match(/import\(["'](@axon\/[^"']+)["']\)/);
        if (dynamicImportMatch && dynamicImportMatch[1]) {
          const targetPackage = this.extractBasePackageName(dynamicImportMatch[1]);

          if (targetPackage !== currentPackage) {
            imports.push({
              sourceFile: filePath,
              targetPackage,
              importSpecifier: "",
              importType: "dynamic",
              line: i + 1,
            });
          }
        }
      }

      return imports;
    } catch (error) {
      console.warn(`Failed to analyze imports in ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Analyze all imports across all packages
   */
  async analyzeAllImports(): Promise<Map<string, IImportAnalysis[]>> {
    const results = new Map<string, IImportAnalysis[]>();

    for (const [packageName, packageInfo] of Array.from(this.packages.entries())) {
      const sourceFiles = await glob("src/**/*.{ts,tsx}", {
        cwd: packageInfo.path,
        absolute: true,
      });

      const packageImports: IImportAnalysis[] = [];
      for (const sourceFile of sourceFiles) {
        const imports = await this.analyzeImports(sourceFile);
        packageImports.push(...imports);
      }

      results.set(packageName, packageImports);
    }

    return results;
  }

  /**
   * Detect circular dependencies between packages
   */
  detectCircularDependencies(): ICircularDependency[] {
    const circularDeps: ICircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (packageName: string, path: string[]): void => {
      if (recursionStack.has(packageName)) {
        // Found a cycle
        const cycleStart = path.indexOf(packageName);
        const cycle = path.slice(cycleStart).concat(packageName);

        circularDeps.push({
          cycle,
          description: `Circular dependency detected: ${cycle.join(" → ")}`,
          severity: "error",
        });
        return;
      }

      if (visited.has(packageName)) {
        return;
      }

      visited.add(packageName);
      recursionStack.add(packageName);

      const packageInfo = this.packages.get(packageName);
      if (packageInfo) {
        for (const dependency of packageInfo.workspaceDependencies) {
          if (this.packages.has(dependency)) {
            dfs(dependency, [...path, packageName]);
          }
        }
      }

      recursionStack.delete(packageName);
    };

    for (const packageName of Array.from(this.packages.keys())) {
      if (!visited.has(packageName)) {
        dfs(packageName, []);
      }
    }

    return circularDeps;
  }

  /**
   * Validate dependency layering according to Axon Flow architecture
   */
  validateDependencyLayering(): IPackageValidationResult[] {
    const results: IPackageValidationResult[] = [];

    for (const [packageName, packageInfo] of Array.from(this.packages.entries())) {
      const validation: IPackageValidationResult = {
        packageName,
        isValid: true,
        errors: [],
        warnings: [],
        circularDependencies: [],
        importAnalysis: [],
      };

      // Extract package type from name (e.g., "@axon/types" -> "types")
      const packageType = packageName.split("/")[1] as keyof typeof DEPENDENCY_LAYERS;
      const currentLayer = DEPENDENCY_LAYERS[packageType];

      if (currentLayer === undefined) {
        validation.errors.push(`Unknown package type: ${packageType}`);
        validation.isValid = false;
        continue;
      }

      // Check that dependencies are from lower layers only
      for (const dependency of packageInfo.workspaceDependencies) {
        const depType = dependency.split("/")[1] as keyof typeof DEPENDENCY_LAYERS;
        const depLayer = DEPENDENCY_LAYERS[depType];

        if (depLayer === undefined) {
          validation.warnings.push(`Unknown dependency package type: ${depType}`);
          continue;
        }

        if (depLayer >= currentLayer) {
          validation.errors.push(
            `Invalid dependency: ${packageName} (layer ${currentLayer}) depends on ${dependency} (layer ${depLayer}). ` +
              `Dependencies must only reference lower layers.`,
          );
          validation.isValid = false;
        }
      }

      results.push(validation);
    }

    return results;
  }

  /**
   * Get dependency graph as adjacency list
   */
  getDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const [packageName, packageInfo] of Array.from(this.packages.entries())) {
      graph.set(packageName, packageInfo.workspaceDependencies);
    }

    return graph;
  }

  /**
   * Check if a package can be safely imported by another package
   */
  canImport(importer: string, target: string): boolean {
    const importerInfo = this.packages.get(importer);
    const targetInfo = this.packages.get(target);

    if (!importerInfo || !targetInfo) {
      return false;
    }

    // Check direct dependencies
    if (importerInfo.workspaceDependencies.includes(target)) {
      return true;
    }

    // Check transitive dependencies
    const visited = new Set<string>();
    const queue = [...importerInfo.workspaceDependencies];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      if (current === target) {
        return true;
      }

      const currentInfo = this.packages.get(current);
      if (currentInfo) {
        queue.push(...currentInfo.workspaceDependencies);
      }
    }

    return false;
  }

  /**
   * Extract the base package name from an import specifier
   * @example "@axon/logger/performance" -> "@axon/logger"
   */
  private extractBasePackageName(importSpecifier: string): string {
    const parts = importSpecifier.split("/");
    if (parts.length >= 2 && parts[0] === "@axon") {
      return `${parts[0]}/${parts[1]}`;
    }
    return importSpecifier;
  }

  /**
   * Determine which package a file belongs to based on its path
   */
  private getPackageFromFilePath(filePath: string): string | null {
    for (const [packageName, packageInfo] of Array.from(this.packages.entries())) {
      if (filePath.startsWith(packageInfo.path)) {
        return packageName;
      }
    }
    return null;
  }

  /**
   * Generate a report of package dependencies and relationships
   */
  generateDependencyReport(): string {
    let report = "# Package Dependency Analysis Report\n\n";

    report += "## Package Overview\n\n";
    for (const [packageName, packageInfo] of Array.from(this.packages.entries())) {
      report += `### ${packageName}\n`;
      report += `- Path: ${packageInfo.path}\n`;
      report += `- Dependencies: ${packageInfo.workspaceDependencies.join(", ") || "none"}\n`;
      report += `- Layer: ${DEPENDENCY_LAYERS[packageName.split("/")[1] as keyof typeof DEPENDENCY_LAYERS]}\n\n`;
    }

    report += "## Dependency Validation\n\n";
    const validationResults = this.validateDependencyLayering();
    for (const result of validationResults) {
      report += `### ${result.packageName}\n`;
      report += `- Valid: ${result.isValid ? "✅" : "❌"}\n`;

      if (result.errors.length > 0) {
        report += "- Errors:\n";
        for (const error of result.errors) {
          report += `  - ${error}\n`;
        }
      }

      if (result.warnings.length > 0) {
        report += "- Warnings:\n";
        for (const warning of result.warnings) {
          report += `  - ${warning}\n`;
        }
      }
      report += "\n";
    }

    const circularDeps = this.detectCircularDependencies();
    if (circularDeps.length > 0) {
      report += "## Circular Dependencies\n\n";
      for (const circularDep of circularDeps) {
        report += `- ${circularDep.severity.toUpperCase()}: ${circularDep.description}\n`;
      }
      report += "\n";
    }

    return report;
  }
}
