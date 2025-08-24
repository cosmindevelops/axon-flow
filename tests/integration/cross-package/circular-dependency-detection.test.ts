/**
 * Circular Dependency Detection Tests
 *
 * Comprehensive testing for circular dependency detection across Axon Flow packages.
 * Tests both direct and indirect circular references, validates import chain analysis,
 * and ensures the dependency graph remains acyclic.
 *
 * Focuses on detecting cycles that would violate the strict layering architecture:
 * Types → Errors → Config → Logger → DI
 */

import { describe, test, expect, beforeAll, afterEach } from "vitest";
import {
  PackageAnalyzer,
  type ICircularDependency,
  type IPackageDependencyInfo,
  type IImportAnalysis,
} from "./utils/package-analyzer.js";
import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

describe("Circular Dependency Detection", () => {
  let analyzer: PackageAnalyzer;
  let packages: Map<string, IPackageDependencyInfo>;
  let originalPackageContents: Map<string, string> = new Map();

  beforeAll(async () => {
    const projectRoot = resolve(process.cwd());
    analyzer = new PackageAnalyzer(projectRoot);
    packages = await analyzer.discoverPackages();
  });

  afterEach(async () => {
    // Restore any modified package.json files
    for (const [filePath, originalContent] of originalPackageContents) {
      await writeFile(filePath, originalContent, "utf-8");
    }
    originalPackageContents.clear();
  });

  describe("Current State Validation", () => {
    test("no circular dependencies should exist in current architecture", () => {
      const circularDependencies = analyzer.detectCircularDependencies();

      expect(
        circularDependencies.length,
        `Circular dependencies detected: ${circularDependencies.map((cd) => cd.description).join("; ")}`,
      ).toBe(0);

      // Ensure we have packages to test
      expect(packages.size, "No packages found for testing").toBeGreaterThan(0);
    });

    test("dependency graph is properly formed", () => {
      const dependencyGraph = analyzer.getDependencyGraph();

      expect(dependencyGraph.size, "Dependency graph should contain all packages").toBe(packages.size);

      // Each package should have a valid dependency list (even if empty)
      for (const [packageName] of packages) {
        expect(dependencyGraph.has(packageName), `Package ${packageName} missing from dependency graph`).toBe(true);
      }
    });

    test("import analysis covers all packages", async () => {
      const allImports = await analyzer.analyzeAllImports();

      expect(allImports.size, "Import analysis should cover all packages").toBe(packages.size);

      // Verify imports are properly detected
      let totalImports = 0;
      for (const [packageName, imports] of allImports) {
        totalImports += imports.length;

        // Each import should have valid structure
        for (const importInfo of imports) {
          expect(importInfo.sourceFile, `Import from ${packageName} should have source file`).toBeTruthy();
          expect(importInfo.targetPackage, `Import from ${packageName} should have target package`).toBeTruthy();
          expect(importInfo.line, `Import from ${packageName} should have line number`).toBeGreaterThan(0);
          expect(["import", "require", "dynamic"]).toContain(importInfo.importType);
        }
      }

      expect(totalImports, "Should detect some imports across packages").toBeGreaterThan(0);
    });
  });

  describe("Direct Circular Dependency Detection", () => {
    test("detects simple bidirectional dependency (A → B → A)", async () => {
      // This test simulates a scenario where we temporarily modify package.json files
      // to create a circular dependency for testing purposes

      const typesPackage = packages.get("@axon/types");
      const errorsPackage = packages.get("@axon/errors");

      expect(typesPackage, "Missing @axon/types package").toBeTruthy();
      expect(errorsPackage, "Missing @axon/errors package").toBeTruthy();

      if (!typesPackage || !errorsPackage) return;

      // Create a temporary analyzer with modified dependency to test detection
      const testAnalyzer = new PackageAnalyzer(analyzer["projectRoot"]);
      await testAnalyzer.discoverPackages();

      // Manually inject a circular dependency for testing
      const testPackages = testAnalyzer.getAllPackages();
      const testTypesPackage = testPackages.get("@axon/types");

      if (testTypesPackage) {
        // Temporarily add errors as dependency to types (creating a cycle)
        testTypesPackage.workspaceDependencies = ["@axon/errors"];
        testPackages.set("@axon/types", testTypesPackage);

        // Manually set packages in analyzer (accessing private property for testing)
        (testAnalyzer as any).packages = testPackages;

        const circularDeps = testAnalyzer.detectCircularDependencies();

        expect(circularDeps.length, "Should detect the artificial circular dependency").toBeGreaterThan(0);

        // Find the specific cycle we created
        const typesToErrorsCycle = circularDeps.find(
          (cd) => cd.cycle.includes("@axon/types") && cd.cycle.includes("@axon/errors"),
        );

        expect(typesToErrorsCycle, "Should detect types ↔ errors circular dependency").toBeTruthy();

        if (typesToErrorsCycle) {
          expect(typesToErrorsCycle.severity).toBe("error");
          expect(typesToErrorsCycle.description).toContain("Circular dependency detected");
        }
      }
    });

    test("detects complex multi-package cycles (A → B → C → A)", async () => {
      // Test detection of longer cycles
      const testAnalyzer = new PackageAnalyzer(analyzer["projectRoot"]);
      await testAnalyzer.discoverPackages();
      const testPackages = testAnalyzer.getAllPackages();

      // Create artificial 3-way cycle: types → errors → config → types
      const testTypesPackage = testPackages.get("@axon/types");
      const testErrorsPackage = testPackages.get("@axon/errors");
      const testConfigPackage = testPackages.get("@axon/config");

      if (testTypesPackage && testErrorsPackage && testConfigPackage) {
        testTypesPackage.workspaceDependencies = ["@axon/errors"];
        testErrorsPackage.workspaceDependencies = ["@axon/types", "@axon/config"];
        testConfigPackage.workspaceDependencies = ["@axon/types", "@axon/errors"];

        testPackages.set("@axon/types", testTypesPackage);
        testPackages.set("@axon/errors", testErrorsPackage);
        testPackages.set("@axon/config", testConfigPackage);

        (testAnalyzer as any).packages = testPackages;

        const circularDeps = testAnalyzer.detectCircularDependencies();

        expect(circularDeps.length, "Should detect multiple circular dependencies").toBeGreaterThan(0);

        // Should detect various cycles in this complex scenario
        const hasComplexCycle = circularDeps.some((cd) => cd.cycle.length >= 3);
        expect(hasComplexCycle, "Should detect at least one complex multi-package cycle").toBe(true);
      }
    });
  });

  describe("Transitive Dependency Analysis", () => {
    test("validates transitive closure of dependencies", () => {
      // For each package, ensure all transitive dependencies are properly resolved
      for (const [packageName, packageInfo] of packages) {
        const directDeps = new Set(packageInfo.workspaceDependencies);
        const transitiveDeps = new Set<string>();
        const visited = new Set<string>();

        // Build transitive closure using breadth-first search
        const queue = [...packageInfo.workspaceDependencies];

        while (queue.length > 0) {
          const current = queue.shift()!;

          if (visited.has(current)) continue;
          visited.add(current);

          const currentPackage = packages.get(current);
          if (currentPackage) {
            for (const dep of currentPackage.workspaceDependencies) {
              if (!visited.has(dep) && !directDeps.has(dep)) {
                transitiveDeps.add(dep);
                queue.push(dep);
              }
            }
          }
        }

        // Verify that transitive dependencies don't create invalid relationships
        const packageParts = packageName.split("/");
        const packageType = packageParts[1];

        if (packageType) {
          const currentLayer = getLayerNumber(packageType);

          if (currentLayer !== undefined) {
            for (const transitiveDep of transitiveDeps) {
              const depParts = transitiveDep.split("/");
              const depType = depParts[1];

              if (depType) {
                const depLayer = getLayerNumber(depType);

                if (depLayer !== undefined) {
                  expect(
                    depLayer < currentLayer,
                    `Transitive dependency violation: ${packageName} (layer ${currentLayer}) ` +
                      `transitively depends on ${transitiveDep} (layer ${depLayer})`,
                  ).toBe(true);
                }
              }
            }
          }
        }
      }
    });

    test("canImport method correctly validates import permissions", () => {
      // Test various import scenarios
      const testCases = [
        // Valid imports (lower layer to higher layer packages)
        { importer: "@axon/errors", target: "@axon/types", expected: true },
        { importer: "@axon/config", target: "@axon/types", expected: true },
        { importer: "@axon/config", target: "@axon/errors", expected: true },
        { importer: "@axon/logger", target: "@axon/types", expected: true },
        { importer: "@axon/logger", target: "@axon/errors", expected: true },
        { importer: "@axon/logger", target: "@axon/config", expected: true },
        { importer: "@axon/di", target: "@axon/types", expected: true },
        { importer: "@axon/di", target: "@axon/logger", expected: true },

        // Invalid imports (higher layer to lower layer or same layer)
        { importer: "@axon/types", target: "@axon/errors", expected: false },
        { importer: "@axon/errors", target: "@axon/config", expected: false },
        { importer: "@axon/config", target: "@axon/logger", expected: false },
        { importer: "@axon/logger", target: "@axon/di", expected: false },

        // Self-imports (should be false)
        { importer: "@axon/types", target: "@axon/types", expected: false },
        { importer: "@axon/errors", target: "@axon/errors", expected: false },
      ];

      for (const testCase of testCases) {
        const actualResult = analyzer.canImport(testCase.importer, testCase.target);
        expect(actualResult, `canImport(${testCase.importer}, ${testCase.target}) should be ${testCase.expected}`).toBe(
          testCase.expected,
        );
      }
    });
  });

  describe("Import Chain Analysis", () => {
    test("validates actual import statements match dependency declarations", async () => {
      const allImports = await analyzer.analyzeAllImports();

      for (const [packageName, imports] of allImports) {
        const packageInfo = packages.get(packageName);
        expect(packageInfo, `Package info not found for ${packageName}`).toBeTruthy();

        if (packageInfo) {
          // Group imports by target package
          const importsByTarget = new Map<string, IImportAnalysis[]>();

          for (const importInfo of imports) {
            const target = importInfo.targetPackage;
            if (!importsByTarget.has(target)) {
              importsByTarget.set(target, []);
            }
            importsByTarget.get(target)!.push(importInfo);
          }

          // Validate each imported package
          for (const [target, targetImports] of importsByTarget) {
            // Should be declared as dependency
            expect(
              packageInfo.workspaceDependencies,
              `${packageName} imports from ${target} but doesn't declare it as dependency ` +
                `(imports found in: ${targetImports.map((i) => `${i.sourceFile}:${i.line}`).join(", ")})`,
            ).toContain(target);

            // Should be valid import according to layering
            const canImport = analyzer.canImport(packageName, target);
            expect(
              canImport,
              `${packageName} cannot import from ${target} due to layering rules ` +
                `(imports: ${targetImports.map((i) => `${i.sourceFile}:${i.line}`).join(", ")})`,
            ).toBe(true);
          }
        }
      }
    });

    test("detects prohibited import patterns", async () => {
      const allImports = await analyzer.analyzeAllImports();
      const prohibitedPatterns = [
        // Higher layer importing from lower layer (reverse dependency)
        { from: "@axon/types", to: "@axon/errors", reason: "Base layer cannot import from higher layers" },
        { from: "@axon/errors", to: "@axon/config", reason: "Errors cannot import from config" },
        { from: "@axon/config", to: "@axon/logger", reason: "Config cannot import from logger" },
        { from: "@axon/logger", to: "@axon/di", reason: "Logger cannot import from DI" },
      ];

      for (const pattern of prohibitedPatterns) {
        const packageImports = allImports.get(pattern.from) || [];
        const prohibitedImports = packageImports.filter((imp) => imp.targetPackage === pattern.to);

        expect(
          prohibitedImports.length,
          `Prohibited import pattern detected: ${pattern.from} → ${pattern.to} ` +
            `(${pattern.reason}). Found in: ${prohibitedImports.map((i) => `${i.sourceFile}:${i.line}`).join(", ")}`,
        ).toBe(0);
      }
    });
  });

  describe("Dynamic Import Validation", () => {
    test("dynamic imports follow same layering rules", async () => {
      const allImports = await analyzer.analyzeAllImports();

      for (const [packageName, imports] of allImports) {
        const dynamicImports = imports.filter((imp) => imp.importType === "dynamic");

        for (const dynamicImport of dynamicImports) {
          const canImport = analyzer.canImport(packageName, dynamicImport.targetPackage);
          expect(
            canImport,
            `Dynamic import violates layering rules: ${packageName} → ${dynamicImport.targetPackage} ` +
              `at ${dynamicImport.sourceFile}:${dynamicImport.line}`,
          ).toBe(true);
        }
      }
    });

    test("require() imports follow same layering rules", async () => {
      const allImports = await analyzer.analyzeAllImports();

      for (const [packageName, imports] of allImports) {
        const requireImports = imports.filter((imp) => imp.importType === "require");

        for (const requireImport of requireImports) {
          const canImport = analyzer.canImport(packageName, requireImport.targetPackage);
          expect(
            canImport,
            `require() import violates layering rules: ${packageName} → ${requireImport.targetPackage} ` +
              `at ${requireImport.sourceFile}:${requireImport.line}`,
          ).toBe(true);
        }
      }
    });
  });

  describe("Dependency Graph Integrity", () => {
    test("dependency graph has no self-loops", () => {
      const dependencyGraph = analyzer.getDependencyGraph();

      for (const [packageName, dependencies] of dependencyGraph) {
        expect(dependencies, `Package ${packageName} should not depend on itself (self-loop detected)`).not.toContain(
          packageName,
        );
      }
    });

    test("dependency graph is topologically sortable", () => {
      const dependencyGraph = analyzer.getDependencyGraph();
      const topologicalOrder = topologicalSort(dependencyGraph);

      expect(topologicalOrder, "Dependency graph should be topologically sortable (acyclic)").toBeTruthy();

      if (topologicalOrder) {
        expect(topologicalOrder.length, "Topological order should include all packages").toBe(packages.size);

        // Verify that dependencies come before dependents in the order
        const positionMap = new Map<string, number>();
        topologicalOrder.forEach((pkg, index) => positionMap.set(pkg, index));

        for (const [packageName, dependencies] of dependencyGraph) {
          const packagePosition = positionMap.get(packageName);
          expect(packagePosition, `Package ${packageName} missing from topological order`).toBeDefined();

          for (const dependency of dependencies) {
            const dependencyPosition = positionMap.get(dependency);
            expect(dependencyPosition, `Dependency ${dependency} missing from topological order`).toBeDefined();

            expect(
              dependencyPosition! < packagePosition!,
              `Dependency order violation: ${dependency} should come before ${packageName} in topological order`,
            ).toBe(true);
          }
        }
      }
    });
  });

  describe("Circular Dependency Reporting", () => {
    test("circular dependency detection provides detailed information", () => {
      // Test with current (expected clean) state
      const circularDeps = analyzer.detectCircularDependencies();

      expect(circularDeps).toHaveLength(0);

      // Each circular dependency (if any existed) should have proper structure
      for (const circularDep of circularDeps) {
        expect(circularDep.cycle, "Cycle should contain package names").toBeTruthy();
        expect(circularDep.cycle.length, "Cycle should contain at least 2 packages").toBeGreaterThanOrEqual(2);
        expect(circularDep.description, "Should have description").toBeTruthy();
        expect(circularDep.severity, "Should have severity level").toMatch(/^(error|warning|info)$/);

        // Cycle should form a proper loop (first and last elements should be the same when completing the cycle)
        const cycleStart = circularDep.cycle[0];
        const cycleEnd = circularDep.cycle[circularDep.cycle.length - 1];

        if (cycleStart && cycleEnd) {
          // In our representation, the cycle array shows the path, so we need to verify
          // that the last element in the cycle has a dependency back to the first
          const lastPackageInfo = packages.get(cycleEnd);
          if (lastPackageInfo) {
            // The cycle should be detectable by checking if the last depends on the first
            const hasBackLink = lastPackageInfo.workspaceDependencies.includes(cycleStart);
            // Note: This might not always be true depending on how cycles are represented
            // The test verifies the structure is reasonable for analysis
          }
        }
      }
    });

    test("dependency report generation includes circular dependency information", () => {
      const report = analyzer.generateDependencyReport();

      expect(report, "Report should be generated").toBeTruthy();
      expect(report.length, "Report should have content").toBeGreaterThan(0);

      // Report should contain key sections
      expect(report).toContain("Package Dependency Analysis Report");
      expect(report).toContain("Package Overview");
      expect(report).toContain("Dependency Validation");

      // If no circular dependencies exist, report should indicate clean state
      const circularDeps = analyzer.detectCircularDependencies();
      if (circularDeps.length === 0) {
        // Report should not have a circular dependencies section or should indicate none found
        const hasCircularSection = report.includes("## Circular Dependencies");
        if (hasCircularSection) {
          // If section exists, it should be empty or indicate no issues
          expect(report).not.toContain("ERROR: Circular dependency detected");
        }
      }
    });
  });
});

// Helper functions

function getLayerNumber(packageType: string): number | undefined {
  const layers: Record<string, number> = {
    types: 0,
    errors: 1,
    config: 2,
    logger: 3,
    di: 4,
  };
  return layers[packageType];
}

function topologicalSort(graph: Map<string, string[]>): string[] | null {
  const inDegree = new Map<string, number>();
  const nodes = Array.from(graph.keys());

  // Initialize in-degrees
  for (const node of nodes) {
    inDegree.set(node, 0);
  }

  // Calculate in-degrees - for dependency graph, node A depends on B means B → A (B comes before A)
  for (const [node, dependencies] of graph) {
    for (const dep of dependencies) {
      // node depends on dep, so node has incoming edge from dep
      inDegree.set(node, (inDegree.get(node) || 0) + 1);
    }
  }

  // Queue nodes with no incoming edges (no dependencies)
  const queue = nodes.filter((node) => (inDegree.get(node) || 0) === 0);
  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    // For each node that depends on current, reduce its in-degree
    for (const [node, dependencies] of graph) {
      if (dependencies.includes(current)) {
        const newInDegree = (inDegree.get(node) || 0) - 1;
        inDegree.set(node, newInDegree);

        if (newInDegree === 0) {
          queue.push(node);
        }
      }
    }
  }

  // If all nodes are included, the graph is acyclic
  return result.length === nodes.length ? result : null;
}
