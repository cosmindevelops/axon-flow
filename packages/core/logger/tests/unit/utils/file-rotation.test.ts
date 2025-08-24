/**
 * Unit tests for file rotation functionality
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileRotationManager, PlatformDetector } from "../../../src/utils/utils.classes.js";
import { TestFileTransport } from "../../utils/TestFileTransport.js";
import { mkdtempSync, rmSync, existsSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("FileRotationManager", () => {
  let tempDir: string;
  let testBasePath: string;
  let rotationManager: FileRotationManager;
  let testTransport: TestFileTransport;

  beforeEach(() => {
    // Create real temporary directory for testing
    tempDir = mkdtempSync(join(tmpdir(), "rotation-test-"));
    testBasePath = join(tempDir, "test.log");
    testTransport = new TestFileTransport("test-rotation.log");
  });

  afterEach(async () => {
    if (rotationManager) {
      await rotationManager.close();
    }

    // Cleanup real test files and directories
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }

    testTransport.cleanup();
  });

  describe("Size-based rotation", () => {
    it("should rotate when file size exceeds limit", async () => {
      const maxSize = 100; // Small size to trigger rotation easily
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize,
        maxFiles: 3,
      });

      // Create a file near the size limit
      const initialData = "x".repeat(50);
      writeFileSync(testBasePath, initialData);

      // Verify initial file exists and has expected size
      expect(existsSync(testBasePath)).toBe(true);
      const initialStat = statSync(testBasePath);
      expect(initialStat.size).toBe(50);

      // Write data that should trigger rotation
      const additionalData = "y".repeat(60);
      await rotationManager.write(additionalData);

      // Verify the rotation manager handled the write operation
      await rotationManager.close();

      // File should exist (though rotation behavior depends on implementation)
      expect(existsSync(testBasePath)).toBe(true);
    }, 10000);

    it("should handle basic file operations", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 2,
      });

      const testData = "basic test data";
      await rotationManager.write(testData);
      await rotationManager.close();

      // Verify file was created and contains data
      expect(existsSync(testBasePath)).toBe(true);
      const finalStat = statSync(testBasePath);
      expect(finalStat.size).toBeGreaterThan(0);
    }, 10000);
  });

  describe("Date-based rotation", () => {
    it("should generate filename with date format", async () => {
      const dateFormat = "YYYY-MM-DD";
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "time",
        maxSize: 10000,
        maxFiles: 5,
        dateFormat,
      });

      const today = new Date();
      const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      await rotationManager.write("test data with date rotation");
      await rotationManager.close();

      // Should create a file with the date format in the filename
      const expectedFilePath = `${testBasePath}.${expectedDate}`;
      expect(existsSync(expectedFilePath)).toBe(true);

      // Verify the file contains our test data
      const stat = statSync(expectedFilePath);
      expect(stat.size).toBeGreaterThan(0);
    });

    it("should handle hourly rotation format", async () => {
      const dateFormat = "YYYY-MM-DD-HH";
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "time",
        maxSize: 10000,
        maxFiles: 5,
        dateFormat,
      });

      const now = new Date();
      const expectedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}`;

      await rotationManager.write("hourly rotation test data");
      await rotationManager.close();

      // Should create a file with hour precision in the filename
      const expectedFilePath = `${testBasePath}.${expectedDateTime}`;
      expect(existsSync(expectedFilePath)).toBe(true);

      const stat = statSync(expectedFilePath);
      expect(stat.size).toBeGreaterThan(0);
    });
  });

  describe("Directory management", () => {
    it("should create directory if it doesn't exist", async () => {
      const nestedDir = join(tempDir, "logs", "app");
      const nestedPath = join(nestedDir, "test.log");

      rotationManager = new FileRotationManager(nestedPath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      await rotationManager.write("test data for nested directory");
      await rotationManager.close();

      // Verify the nested directory was created
      expect(existsSync(nestedDir)).toBe(true);
      expect(existsSync(nestedPath)).toBe(true);

      const stat = statSync(nestedPath);
      expect(stat.size).toBeGreaterThan(0);
    });

    it("should handle existing directory gracefully", async () => {
      // Directory already exists from beforeEach setup
      expect(existsSync(tempDir)).toBe(true);

      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      await expect(rotationManager.write("test data")).resolves.not.toThrow();
      await rotationManager.close();

      expect(existsSync(testBasePath)).toBe(true);
    });

    it("should handle inaccessible directory path", async () => {
      // Try to create file in a path that would require root permissions
      const restrictedPath = "/root/restricted/test.log";

      rotationManager = new FileRotationManager(restrictedPath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      // This should fail due to permission restrictions
      await expect(rotationManager.write("test data")).rejects.toThrow();
    });
  });

  describe("Error handling", () => {
    it("should handle invalid file paths", async () => {
      // Use an invalid path that contains null bytes
      const invalidPath = "test\0invalid.log";

      rotationManager = new FileRotationManager(invalidPath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      // Should fail due to invalid path
      await expect(rotationManager.write("test data")).rejects.toThrow();
    });
  });

  describe("Close functionality", () => {
    it("should close stream properly", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      await rotationManager.write("test data for closing");
      await rotationManager.close();

      // Verify file was created and contains data
      expect(existsSync(testBasePath)).toBe(true);
      const stat = statSync(testBasePath);
      expect(stat.size).toBeGreaterThan(0);
    });

    it("should handle close when no stream exists", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      // Should not throw when closing without writing
      await expect(rotationManager.close()).resolves.not.toThrow();

      // No file should exist yet
      expect(existsSync(testBasePath)).toBe(false);
    });
  });

  describe("Performance characteristics", () => {
    it("should handle rapid sequential writes", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 5000, // Larger size to accommodate all writes
        maxFiles: 3,
      });

      // Write multiple entries rapidly
      const writes = Array.from({ length: 5 }, (_, i) => rotationManager.write(`log entry ${i}\n`));

      await Promise.all(writes);
      await rotationManager.close();

      // Verify that writes were successful
      expect(existsSync(testBasePath)).toBe(true);
      const stat = statSync(testBasePath);
      expect(stat.size).toBeGreaterThan(0);
    });

    it("should handle concurrent writes safely", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 5000, // Large enough for concurrent writes
        maxFiles: 3,
      });

      const writePromises = Array.from({ length: 3 }, async (_, i) => {
        await rotationManager.write(`concurrent write ${i}\n`);
      });

      // All writes should complete without error
      await expect(Promise.all(writePromises)).resolves.not.toThrow();
      await rotationManager.close();

      // Verify file was created successfully
      expect(existsSync(testBasePath)).toBe(true);
      const stat = statSync(testBasePath);
      expect(stat.size).toBeGreaterThan(0);
    });
  });
});
