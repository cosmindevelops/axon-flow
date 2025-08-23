/**
 * Unit tests for file rotation functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { FileRotationManager, PlatformDetector } from "../../../src/utils/utils.classes.js";

// Mock fs module
const mockWriteStream = {
  write: vi.fn().mockImplementation((data, callback) => {
    if (callback) callback();
    return true;
  }),
  end: vi.fn().mockImplementation((callback) => {
    if (callback) callback();
    return true;
  }),
  on: vi.fn(),
  once: vi.fn(),
  emit: vi.fn(),
};

vi.mock("fs", () => ({
  createWriteStream: vi.fn(() => mockWriteStream),
  promises: {
    mkdir: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
    appendFile: vi.fn(),
  },
}));

describe("FileRotationManager", () => {
  const mockFs = vi.mocked(fs);
  const testBasePath = "/tmp/test.log";
  let rotationManager: FileRotationManager;

  // Mock platform detector to return Node.js environment
  const platformMock = {
    isNode: () => true,
    isBrowser: () => false,
    isDeno: () => false,
    supportsFileSystem: () => true,
    supportsStreams: () => true,
    supportsCompression: () => true,
    getDetection: () => ({
      platform: "node" as const,
      isNode: true,
      isBrowser: false,
      isDeno: false,
      supportsFileSystem: true,
      supportsStreams: true,
      supportsCompression: true,
      supportsHighResTime: true,
    }),
  };

  vi.spyOn(PlatformDetector, "getInstance").mockReturnValue(platformMock as any);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful directory creation
    mockFs.mkdir.mockResolvedValue(undefined);

    // Mock file stats
    mockFs.stat.mockResolvedValue({
      size: 1024,
      mtimeMs: Date.now(),
    } as any);
  });

  afterEach(async () => {
    if (rotationManager) {
      await rotationManager.close();
    }
  });

  describe("Size-based rotation", () => {
    it("should rotate when file size exceeds limit", async () => {
      const maxSize = 1000; // 1KB
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize,
        maxFiles: 3,
      });

      // Mock current file size as near limit
      mockFs.stat.mockResolvedValue({
        size: 900,
        mtimeMs: Date.now(),
      } as any);

      // Mock directory listing for cleanup
      mockFs.readdir.mockResolvedValue(["test.log"] as any);

      // Write data that would exceed limit
      const largeData = "x".repeat(200); // This + existing 900 = 1100 > 1000

      await rotationManager.write(largeData);

      // Should have created stream twice (initial + rotation)
      expect(vi.mocked(require("fs").createWriteStream)).toHaveBeenCalledTimes(2);
    });

    it("should clean up old files when exceeding max files limit", async () => {
      const maxFiles = 2;
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles,
      });

      // Mock directory with multiple log files
      mockFs.readdir.mockResolvedValue([
        "test.log",
        "test.log.1",
        "test.log.2",
        "test.log.3",
        "other.txt", // Should be ignored
      ] as any);

      // Mock file stats with different timestamps
      mockFs.stat
        .mockResolvedValueOnce({ size: 100, mtimeMs: Date.now() - 4000 } as any) // oldest
        .mockResolvedValueOnce({ size: 100, mtimeMs: Date.now() - 3000 } as any)
        .mockResolvedValueOnce({ size: 100, mtimeMs: Date.now() - 2000 } as any)
        .mockResolvedValueOnce({ size: 100, mtimeMs: Date.now() - 1000 } as any); // newest

      // Trigger rotation by writing large data
      const largeData = "x".repeat(2000);
      await rotationManager.write(largeData);

      // Should delete excess files (keeping only 2 newest)
      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining("test.log"));
    });
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

      await rotationManager.write("test data");

      expect(vi.mocked(require("fs").createWriteStream)).toHaveBeenCalledWith(`${testBasePath}.${expectedDate}`, {
        flags: "a",
      });
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

      await rotationManager.write("test data");

      expect(vi.mocked(require("fs").createWriteStream)).toHaveBeenCalledWith(`${testBasePath}.${expectedDateTime}`, {
        flags: "a",
      });
    });
  });

  describe("Directory management", () => {
    it("should create directory if it doesn't exist", async () => {
      const nestedPath = "/tmp/logs/app/test.log";
      rotationManager = new FileRotationManager(nestedPath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      await rotationManager.write("test data");

      expect(mockFs.mkdir).toHaveBeenCalledWith("/tmp/logs/app", { recursive: true });
    });

    it("should handle existing directory gracefully", async () => {
      mockFs.mkdir.mockRejectedValueOnce({ code: "EEXIST" } as any);

      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      await expect(rotationManager.write("test data")).resolves.not.toThrow();
      expect(mockFs.mkdir).toHaveBeenCalled();
    });

    it("should propagate other directory creation errors", async () => {
      mockFs.mkdir.mockRejectedValueOnce(new Error("Permission denied"));

      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      await expect(rotationManager.write("test data")).rejects.toThrow("Permission denied");
    });
  });

  describe("Error handling", () => {
    it("should handle write errors gracefully", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      // Mock createWriteStream to return a stream that errors on write
      const mockStream = {
        write: vi.fn((data, callback) => {
          callback(new Error("Disk full"));
        }),
        end: vi.fn((callback) => callback && callback()),
        on: vi.fn(),
      };

      vi.mocked(require("fs").createWriteStream).mockReturnValue(mockStream as any);

      await expect(rotationManager.write("test data")).rejects.toThrow("Disk full");
    });

    it("should handle cleanup errors without failing", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 100,
        maxFiles: 1,
      });

      // Mock readdir to fail
      mockFs.readdir.mockRejectedValue(new Error("Cannot read directory"));

      // Should not throw despite cleanup failure
      const largeData = "x".repeat(200);
      await expect(rotationManager.write(largeData)).resolves.toBeDefined();
    });

    it("should handle stat errors during cleanup", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 100,
        maxFiles: 2,
      });

      mockFs.readdir.mockResolvedValue(["test.log", "test.log.1"] as any);

      // Mock stat to fail for some files
      mockFs.stat
        .mockResolvedValueOnce({ size: 100, mtimeMs: Date.now() } as any)
        .mockRejectedValueOnce(new Error("File not found"));

      const largeData = "x".repeat(200);
      await expect(rotationManager.write(largeData)).resolves.toBeDefined();

      // Should still attempt to delete valid files
      expect(mockFs.unlink).not.toHaveBeenCalled(); // No files to delete in this case
    });
  });

  describe("Close functionality", () => {
    it("should close stream properly", async () => {
      rotationManager = new FileRotationManager(testBasePath, 1000, 3);

      const mockStream = {
        write: vi.fn((data, callback) => callback()),
        end: vi.fn((callback) => callback()),
        on: vi.fn(),
      };

      vi.mocked(require("fs").createWriteStream).mockReturnValue(mockStream as any);

      await rotationManager.write("test data");
      await rotationManager.close();

      expect(mockStream.end).toHaveBeenCalled();
    });

    it("should handle close when no stream exists", async () => {
      rotationManager = new FileRotationManager(testBasePath, 1000, 3);

      // Should not throw when closing without writing
      await expect(rotationManager.close()).resolves.not.toThrow();
    });
  });

  describe("Performance characteristics", () => {
    it("should handle rapid sequential writes", async () => {
      rotationManager = new FileRotationManager(testBasePath, 1000, 3);

      const mockStream = {
        write: vi.fn((data, callback) => {
          // Simulate async write completion
          setTimeout(() => callback(), 1);
        }),
        end: vi.fn((callback) => callback && callback()),
        on: vi.fn(),
      };

      vi.mocked(require("fs").createWriteStream).mockReturnValue(mockStream as any);

      // Write multiple entries rapidly
      const writes = Array.from({ length: 10 }, (_, i) => rotationManager.write(`log entry ${i}\n`));

      await Promise.all(writes);

      expect(mockStream.write).toHaveBeenCalledTimes(10);
    });

    it("should handle concurrent writes safely", async () => {
      rotationManager = new FileRotationManager(testBasePath, 1000, 3);

      const writePromises = Array.from({ length: 5 }, async (_, i) => {
        await rotationManager.write(`concurrent write ${i}\n`);
      });

      // All writes should complete without error
      await expect(Promise.all(writePromises)).resolves.not.toThrow();
    });
  });
});
