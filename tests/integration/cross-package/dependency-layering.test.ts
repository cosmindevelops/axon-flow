/**
 * Dependency Layering Validation Tests
 *
 * Tests the strict dependency layering requirements for Axon Flow:
 * Types → Errors → Config → Logger → DI
 *
 * Validates that packages only depend on packages from lower layers,
 * ensuring proper architectural boundaries and preventing violations
 * of the established dependency hierarchy.
 */

import { describe, test, expect, beforeAll } from "vitest";
import {
  PackageAnalyzer,
  DEPENDENCY_LAYERS,
  type IPackageDependencyInfo,
  type IPackageValidationResult,
} from "./utils/package-analyzer.js";
import { resolve } from "node:path";

describe("Dependency Layering Validation", () => {
  let analyzer: PackageAnalyzer;
  let packages: Map<string, IPackageDependencyInfo>;

  beforeAll(async () => {
    const projectRoot = resolve(process.cwd());
    analyzer = new PackageAnalyzer(projectRoot);
    packages = await analyzer.discoverPackages();
  });

  describe("Package Discovery", () => {
    test("should discover all expected core packages", () => {
      const expectedPackages = ["@axon/types", "@axon/errors", "@axon/config", "@axon/logger", "@axon/di"];

      for (const expectedPackage of expectedPackages) {
        expect(packages.has(expectedPackage), `Missing expected package: ${expectedPackage}`).toBe(true);
      }

      expect(packages.size, "Unexpected number of packages discovered").toBeGreaterThanOrEqual(expectedPackages.length);
    });

    test("should correctly parse package.json dependencies", () => {
      for (const [packageName, packageInfo] of packages) {
        expect(packageInfo.name).toBe(packageName);
        expect(packageInfo.path).toBeTruthy();
        expect(packageInfo.packageJson).toBeTruthy();
        expect(Array.isArray(packageInfo.dependencies)).toBe(true);
        expect(Array.isArray(packageInfo.workspaceDependencies)).toBe(true);

        // All workspace dependencies should start with @axon/
        for (const dep of packageInfo.workspaceDependencies) {
          expect(dep).toMatch(/^@axon\//);
        }
      }
    });
  });

  describe("Layer 0: @axon/types (Base Layer)", () => {
    test("should have no @axon dependencies", () => {
      const typesPackage = packages.get("@axon/types");
      expect(typesPackage, "Missing @axon/types package").toBeTruthy();

      if (typesPackage) {
        expect(
          typesPackage.workspaceDependencies,
          "@axon/types must not depend on any other @axon packages (base layer rule)",
        ).toHaveLength(0);
      }
    });

    test("should only have external dependencies", () => {
      const typesPackage = packages.get("@axon/types");
      expect(typesPackage).toBeTruthy();

      if (typesPackage) {
        // Should have external dependencies (like zod) but no internal ones
        const externalDeps = typesPackage.dependencies.filter((dep) => !dep.startsWith("@axon/"));
        expect(externalDeps.length, "Types package should have some external dependencies").toBeGreaterThan(0);
        expect(typesPackage.workspaceDependencies, "Types package should have no workspace dependencies").toHaveLength(
          0,
        );
      }
    });
  });

  describe("Layer 1: @axon/errors", () => {
    test("should depend only on @axon/types", () => {
      const errorsPackage = packages.get("@axon/errors");
      expect(errorsPackage, "Missing @axon/errors package").toBeTruthy();

      if (errorsPackage) {
        const allowedDependencies = ["@axon/types"];

        expect(
          errorsPackage.workspaceDependencies,
          `@axon/errors should only depend on: ${allowedDependencies.join(", ")}`,
        ).toEqual(expect.arrayContaining(allowedDependencies));

        // Should not have more dependencies than allowed
        for (const dep of errorsPackage.workspaceDependencies) {
          expect(allowedDependencies, `@axon/errors has unauthorized dependency: ${dep}`).toContain(dep);
        }
      }
    });

    test("should not depend on higher-layer packages", () => {
      const errorsPackage = packages.get("@axon/errors");
      expect(errorsPackage).toBeTruthy();

      if (errorsPackage) {
        const prohibitedDependencies = ["@axon/config", "@axon/logger", "@axon/di"];

        for (const prohibitedDep of prohibitedDependencies) {
          expect(
            errorsPackage.workspaceDependencies,
            `@axon/errors must not depend on higher-layer package: ${prohibitedDep}`,
          ).not.toContain(prohibitedDep);
        }
      }
    });
  });

  describe("Layer 2: @axon/config", () => {
    test("should depend only on @axon/types and @axon/errors", () => {
      const configPackage = packages.get("@axon/config");
      expect(configPackage, "Missing @axon/config package").toBeTruthy();

      if (configPackage) {
        const allowedDependencies = ["@axon/types", "@axon/errors"];

        // Should have all required dependencies
        for (const requiredDep of allowedDependencies) {
          expect(configPackage.workspaceDependencies, `@axon/config should depend on: ${requiredDep}`).toContain(
            requiredDep,
          );
        }

        // Should not have more dependencies than allowed
        for (const dep of configPackage.workspaceDependencies) {
          expect(allowedDependencies, `@axon/config has unauthorized dependency: ${dep}`).toContain(dep);
        }
      }
    });

    test("should not depend on higher-layer packages", () => {
      const configPackage = packages.get("@axon/config");
      expect(configPackage).toBeTruthy();

      if (configPackage) {
        const prohibitedDependencies = ["@axon/logger", "@axon/di"];

        for (const prohibitedDep of prohibitedDependencies) {
          expect(
            configPackage.workspaceDependencies,
            `@axon/config must not depend on higher-layer package: ${prohibitedDep}`,
          ).not.toContain(prohibitedDep);
        }
      }
    });
  });

  describe("Layer 3: @axon/logger", () => {
    test("should depend only on lower-layer packages", () => {
      const loggerPackage = packages.get("@axon/logger");
      expect(loggerPackage, "Missing @axon/logger package").toBeTruthy();

      if (loggerPackage) {
        const allowedDependencies = ["@axon/types", "@axon/errors", "@axon/config"];

        // Should have all required dependencies
        for (const requiredDep of allowedDependencies) {
          expect(loggerPackage.workspaceDependencies, `@axon/logger should depend on: ${requiredDep}`).toContain(
            requiredDep,
          );
        }

        // Should not have more dependencies than allowed
        for (const dep of loggerPackage.workspaceDependencies) {
          expect(allowedDependencies, `@axon/logger has unauthorized dependency: ${dep}`).toContain(dep);
        }
      }
    });

    test("should not depend on DI package", () => {
      const loggerPackage = packages.get("@axon/logger");
      expect(loggerPackage).toBeTruthy();

      if (loggerPackage) {
        expect(
          loggerPackage.workspaceDependencies,
          "@axon/logger must not depend on @axon/di (higher layer)",
        ).not.toContain("@axon/di");
      }
    });
  });

  describe("Layer 4: @axon/di (Top Layer)", () => {
    test("can depend on all lower-layer packages", () => {
      const diPackage = packages.get("@axon/di");
      expect(diPackage, "Missing @axon/di package").toBeTruthy();

      if (diPackage) {
        // DI can depend on any combination of lower-layer packages
        const allowedDependencies = ["@axon/types", "@axon/errors", "@axon/config", "@axon/logger"];

        // All its dependencies should be from allowed set
        for (const dep of diPackage.workspaceDependencies) {
          expect(allowedDependencies, `@axon/di has dependency from unauthorized layer: ${dep}`).toContain(dep);
        }

        // Should have at least some dependencies (likely types and errors at minimum)
        expect(
          diPackage.workspaceDependencies.length,
          "@axon/di should depend on at least some core packages",
        ).toBeGreaterThan(0);
      }
    });

    test("should not create any circular dependencies", () => {
      const diPackage = packages.get("@axon/di");
      expect(diPackage).toBeTruthy();

      if (diPackage) {
        // Verify that none of DI's dependencies depend back on DI
        for (const dependency of diPackage.workspaceDependencies) {
          const depPackage = packages.get(dependency);
          expect(depPackage).toBeTruthy();

          if (depPackage) {
            expect(
              depPackage.workspaceDependencies,
              `Circular dependency detected: ${dependency} depends back on @axon/di`,
            ).not.toContain("@axon/di");
          }
        }
      }
    });
  });

  describe("Comprehensive Layer Validation", () => {
    test("all packages should follow dependency layering rules", () => {
      const validationResults = analyzer.validateDependencyLayering();

      for (const result of validationResults) {
        expect(
          result.isValid,
          `Package ${result.packageName} violates dependency layering rules: ${result.errors.join("; ")}`,
        ).toBe(true);

        expect(result.errors, `Package ${result.packageName} has dependency layering errors`).toHaveLength(0);
      }
    });

    test("layer assignments match expected architecture", () => {
      const expectedLayerAssignments = {
        "@axon/types": 0,
        "@axon/errors": 1,
        "@axon/config": 2,
        "@axon/logger": 3,
        "@axon/di": 4,
      };

      for (const [packageName, expectedLayer] of Object.entries(expectedLayerAssignments)) {
        const packageType = packageName.split("/")[1] as keyof typeof DEPENDENCY_LAYERS;
        const actualLayer = DEPENDENCY_LAYERS[packageType];

        expect(actualLayer, `Package ${packageName} should be at layer ${expectedLayer}`).toBe(expectedLayer);
      }
    });

    test("packages can only import from authorized layers", () => {
      for (const [packageName, packageInfo] of packages) {
        const packageType = packageName.split("/")[1] as keyof typeof DEPENDENCY_LAYERS;
        const currentLayer = DEPENDENCY_LAYERS[packageType];

        if (currentLayer === undefined) continue;

        for (const dependency of packageInfo.workspaceDependencies) {
          const depType = dependency.split("/")[1] as keyof typeof DEPENDENCY_LAYERS;
          const depLayer = DEPENDENCY_LAYERS[depType];

          expect(depLayer, `Unknown dependency package type: ${depType} in ${dependency}`).toBeDefined();

          expect(
            depLayer < currentLayer,
            `${packageName} (layer ${currentLayer}) cannot depend on ${dependency} (layer ${depLayer}). ` +
              `Dependencies must only reference lower layers.`,
          ).toBe(true);
        }
      }
    });
  });

  describe("Import Resolution Validation", () => {
    test("package.json dependencies match actual imports", async () => {
      // This test ensures that if a package imports from another package,
      // it has declared that dependency in its package.json
      const allImports = await analyzer.analyzeAllImports();

      for (const [packageName, imports] of allImports) {
        const packageInfo = packages.get(packageName);
        expect(packageInfo).toBeTruthy();

        if (packageInfo) {
          const uniqueTargets = [...new Set(imports.map((imp) => imp.targetPackage))];

          for (const target of uniqueTargets) {
            expect(
              packageInfo.workspaceDependencies,
              `${packageName} imports from ${target} but doesn't declare it as a dependency`,
            ).toContain(target);
          }
        }
      }
    });

    test("no unauthorized cross-package imports exist", async () => {
      const allImports = await analyzer.analyzeAllImports();

      for (const [packageName, imports] of allImports) {
        for (const importInfo of imports) {
          const canImport = analyzer.canImport(packageName, importInfo.targetPackage);

          expect(
            canImport,
            `Unauthorized import in ${packageName}: cannot import ${importInfo.targetPackage} ` +
              `(file: ${importInfo.sourceFile}:${importInfo.line})`,
          ).toBe(true);
        }
      }
    });
  });

  describe("Dependency Graph Analysis", () => {
    test("dependency graph is acyclic", () => {
      const circularDependencies = analyzer.detectCircularDependencies();

      expect(
        circularDependencies,
        `Circular dependencies detected: ${circularDependencies.map((cd) => cd.description).join("; ")}`,
      ).toHaveLength(0);
    });

    test("dependency graph structure is correct", () => {
      const dependencyGraph = analyzer.getDependencyGraph();

      // Verify that each package's dependencies match expected patterns
      for (const [packageName, dependencies] of dependencyGraph) {
        const packageType = packageName.split("/")[1] as keyof typeof DEPENDENCY_LAYERS;
        const currentLayer = DEPENDENCY_LAYERS[packageType];

        if (currentLayer === undefined) continue;

        // All dependencies should be from lower layers
        for (const dependency of dependencies) {
          const depType = dependency.split("/")[1] as keyof typeof DEPENDENCY_LAYERS;
          const depLayer = DEPENDENCY_LAYERS[depType];

          expect(
            depLayer < currentLayer,
            `Graph validation: ${packageName} should not depend on ${dependency} (same or higher layer)`,
          ).toBe(true);
        }
      }
    });
  });

  describe("Workspace Configuration Validation", () => {
    test("all workspace dependencies use workspace: protocol", () => {
      for (const [packageName, packageInfo] of packages) {
        const packageJsonDeps = (packageInfo.packageJson.dependencies as Record<string, string>) || {};

        for (const [depName, depVersion] of Object.entries(packageJsonDeps)) {
          if (depName.startsWith("@axon/")) {
            expect(
              depVersion,
              `${packageName} should use 'workspace:*' for dependency ${depName}, got '${depVersion}'`,
            ).toBe("workspace:*");
          }
        }
      }
    });

    test("package exports are properly configured", () => {
      for (const [packageName, packageInfo] of packages) {
        expect(packageInfo.exports, `${packageName} should have exports configuration`).toBeTruthy();

        const exports = packageInfo.exports as Record<string, unknown>;
        expect(exports["."], `${packageName} should have main export configuration`).toBeTruthy();
      }
    });
  });
});
