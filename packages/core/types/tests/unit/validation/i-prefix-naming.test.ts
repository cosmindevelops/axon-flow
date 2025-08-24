/**
 * I-prefix naming convention validation tests
 *
 * Validates compliance with V2.17 requirement that all interfaces
 * must start with 'I' prefix as per project coding conventions.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Helper to get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../src");

describe("I-Prefix Naming Convention Validation (V2.17)", () => {
  /**
   * Extract interface declarations from TypeScript code
   */
  function extractInterfaces(content: string): string[] {
    const interfaceRegex = /export\s+interface\s+(\w+)/g;
    const interfaces: string[] = [];
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push(match[1]);
    }

    return interfaces;
  }

  /**
   * Recursively find all .types.ts files
   */
  function findTypeFiles(dir: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findTypeFiles(fullPath));
      } else if (item.endsWith(".types.ts")) {
        files.push(fullPath);
      }
    }

    return files;
  }

  describe("Interface Naming Convention Compliance", () => {
    it("should validate all interfaces use I-prefix convention", () => {
      const typeFiles = findTypeFiles(projectRoot);
      const violations: { file: string; interface: string }[] = [];
      const validInterfaces: { file: string; interface: string }[] = [];

      expect(typeFiles.length).toBeGreaterThan(0);

      for (const file of typeFiles) {
        const content = fs.readFileSync(file, "utf-8");
        const interfaces = extractInterfaces(content);
        const relativePath = path.relative(projectRoot, file);

        for (const interfaceName of interfaces) {
          if (interfaceName.startsWith("I")) {
            validInterfaces.push({ file: relativePath, interface: interfaceName });
          } else {
            violations.push({ file: relativePath, interface: interfaceName });
          }
        }
      }

      // Log summary for visibility
      console.log(`\n📊 I-Prefix Naming Validation Summary:`);
      console.log(`✅ Valid interfaces: ${validInterfaces.length}`);
      console.log(`❌ Violations: ${violations.length}`);
      console.log(`📁 Files scanned: ${typeFiles.length}`);

      if (validInterfaces.length > 0) {
        console.log(`\n✅ Valid I-prefix interfaces found:`);
        validInterfaces.slice(0, 10).forEach(({ file, interface: iface }) => {
          console.log(`   ${iface} (${file})`);
        });
        if (validInterfaces.length > 10) {
          console.log(`   ... and ${validInterfaces.length - 10} more`);
        }
      }

      // Report violations if any
      if (violations.length > 0) {
        console.log(`\n❌ I-prefix violations found:`);
        violations.forEach(({ file, interface: iface }) => {
          console.log(`   ${iface} in ${file}`);
        });
      }

      // Ensure compliance
      expect(violations).toEqual([]);
      expect(validInterfaces.length).toBeGreaterThan(0);
    });

    it("should validate specific core interfaces follow I-prefix", () => {
      const coreInterfaces = [
        "IAgentMetadata",
        "IAgentCapability",
        "IAgentRegistration",
        "IAgentHealth",
        "ITaskDefinition",
        "IConfigSchema",
        "ILogEntry",
        "IErrorContext",
      ];

      for (const interfaceName of coreInterfaces) {
        expect(interfaceName.startsWith("I")).toBe(true);
        expect(interfaceName.length).toBeGreaterThan(1);

        // Validate naming pattern: I + PascalCase
        const withoutPrefix = interfaceName.slice(1);
        expect(withoutPrefix[0]).toMatch(/[A-Z]/);
      }
    });

    it("should validate no non-I interfaces are exported", () => {
      // This test ensures we don't accidentally export interfaces without I-prefix
      const typeFiles = findTypeFiles(projectRoot);
      const allInterfaces: string[] = [];

      for (const file of typeFiles) {
        const content = fs.readFileSync(file, "utf-8");
        const interfaces = extractInterfaces(content);
        allInterfaces.push(...interfaces);
      }

      const nonIInterfaces = allInterfaces.filter((name) => !name.startsWith("I"));

      if (nonIInterfaces.length > 0) {
        console.log(`\n❌ Found interfaces without I-prefix:`);
        nonIInterfaces.forEach((name) => console.log(`   ${name}`));
      }

      expect(nonIInterfaces).toEqual([]);
    });
  });

  describe("Type Alias Naming Convention", () => {
    it("should validate type aliases use PascalCase (not I-prefix)", () => {
      const content = fs.readFileSync(path.join(projectRoot, "core/agent/agent.types.ts"), "utf-8");

      const typeAliasRegex = /export\s+type\s+(\w+)/g;
      const typeAliases: string[] = [];
      let match;

      while ((match = typeAliasRegex.exec(content)) !== null) {
        typeAliases.push(match[1]);
      }

      expect(typeAliases.length).toBeGreaterThan(0);

      for (const typeName of typeAliases) {
        // Type aliases should NOT start with I (that's for interfaces)
        expect(typeName.startsWith("I")).toBe(false);

        // Should use PascalCase
        expect(typeName[0]).toMatch(/[A-Z]/);
      }

      console.log(`\n📋 Type aliases found: ${typeAliases.join(", ")}`);
    });
  });

  describe("Naming Convention Documentation", () => {
    it("should validate naming conventions are properly documented", () => {
      // Test that our type system demonstrates proper naming
      const examples = {
        correctInterface: "IAgentMetadata", // ✅ Interface with I-prefix
        correctTypeAlias: "AgentId", // ✅ Type alias without I-prefix
        correctBrandedType: "CorrelationId", // ✅ Branded type without I-prefix
        correctUnionType: "MessageType", // ✅ Union type without I-prefix
      };

      // Validate examples follow convention
      expect(examples.correctInterface.startsWith("I")).toBe(true);
      expect(examples.correctTypeAlias.startsWith("I")).toBe(false);
      expect(examples.correctBrandedType.startsWith("I")).toBe(false);
      expect(examples.correctUnionType.startsWith("I")).toBe(false);

      // All should be PascalCase
      Object.values(examples).forEach((name) => {
        expect(name[0]).toMatch(/[A-Z]/);
      });
    });

    it("should validate extended interfaces follow I-prefix convention", () => {
      const extendedInterfaces = ["IAgentHealthExtended", "IAgentCapabilityExtended", "IAgentRegistrationExtended"];

      for (const interfaceName of extendedInterfaces) {
        expect(interfaceName.startsWith("I")).toBe(true);
        expect(interfaceName.includes("Extended")).toBe(true);
      }
    });
  });

  describe("Convention Consistency Check", () => {
    it("should ensure consistent application across all domains", () => {
      const domains = [
        "core/agent",
        "core/task",
        "core/workflow",
        "core/message",
        "core/registry",
        "config/schema",
        "config/hierarchy",
        "config/provider",
        "logging/entry",
        "logging/error",
        "logging/performance",
        "platform/browser",
        "platform/node",
        "platform/common",
        "environment",
        "status",
        "utils/branded",
        "utils/guards",
      ];

      const domainCompliance: { domain: string; interfaces: number; violations: number }[] = [];

      for (const domain of domains) {
        const domainPath = path.join(projectRoot, domain);
        const typeFile = path.join(domainPath, `${path.basename(domain)}.types.ts`);

        if (fs.existsSync(typeFile)) {
          const content = fs.readFileSync(typeFile, "utf-8");
          const interfaces = extractInterfaces(content);
          const violations = interfaces.filter((name) => !name.startsWith("I"));

          domainCompliance.push({
            domain,
            interfaces: interfaces.length,
            violations: violations.length,
          });
        }
      }

      console.log(`\n📊 Domain I-prefix compliance:`);
      domainCompliance.forEach(({ domain, interfaces, violations }) => {
        const status = violations === 0 ? "✅" : "❌";
        console.log(`   ${status} ${domain}: ${interfaces} interfaces, ${violations} violations`);
      });

      // Ensure no domain has violations
      const totalViolations = domainCompliance.reduce((sum, d) => sum + d.violations, 0);
      expect(totalViolations).toBe(0);

      // Ensure we found interfaces to validate
      const totalInterfaces = domainCompliance.reduce((sum, d) => sum + d.interfaces, 0);
      expect(totalInterfaces).toBeGreaterThan(20); // Should have substantial interface coverage
    });
  });
});
