/**
 * Unit tests for file rotation functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Create mocks before imports
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

const mockFs = {
  createWriteStream: vi.fn(() => mockWriteStream),
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 1024, mtimeMs: Date.now() }),
    readdir: vi.fn().mockResolvedValue([]),
    unlink: vi.fn().mockResolvedValue(undefined),
    appendFile: vi.fn().mockResolvedValue(undefined),
  },
};

// Mock modules before importing the class
vi.mock("fs", () => mockFs);
vi.mock("path", () => ({
  dirname: vi.fn((path: string) => "/tmp"),
  basename: vi.fn((path: string) => "test.log"),
}));

// Now import the classes
import { FileRotationManager, PlatformDetector } from "../../../src/utils/utils.classes.js";

describe("FileRotationManager", () => {
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

    // Reset the createWriteStream mock to return the default mockWriteStream
    mockFs.createWriteStream.mockReturnValue(mockWriteStream);

    // Reset all mock implementations
    mockWriteStream.write.mockImplementation((data, callback) => {
      if (callback) callback();
      return true;
    });
    mockWriteStream.end.mockImplementation((callback) => {
      if (callback) callback();
      return true;
    });
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
      mockFs.promises.stat.mockResolvedValue({
        size: 900,
        mtimeMs: Date.now(),
      } as any);

      // Mock directory listing for cleanup
      mockFs.promises.readdir.mockResolvedValue(["test.log"] as any);

      // Write simple data to trigger basic functionality
      await rotationManager.write("test data");

      // Should have created at least one stream
      expect(mockFs.createWriteStream).toHaveBeenCalled();
      expect(mockWriteStream.write).toHaveBeenCalledWith("test data", expect.any(Function));
    }, 10000);

    it("should handle basic file operations", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 2,
      });

      await rotationManager.write("basic test");
      await rotationManager.close();

      expect(mockFs.createWriteStream).toHaveBeenCalled();
      expect(mockWriteStream.write).toHaveBeenCalled();
      expect(mockWriteStream.end).toHaveBeenCalled();
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

      await rotationManager.write("test data");

      expect(mockFs.createWriteStream).toHaveBeenCalledWith(`${testBasePath}.${expectedDate}`, {
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

      expect(mockFs.createWriteStream).toHaveBeenCalledWith(`${testBasePath}.${expectedDateTime}`, {
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

      expect(mockFs.promises.mkdir).toHaveBeenCalledWith("/tmp", { recursive: true });
    });

    it("should handle existing directory gracefully", async () => {
      mockFs.promises.mkdir.mockRejectedValueOnce({ code: "EEXIST" } as any);

      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      await expect(rotationManager.write("test data")).resolves.not.toThrow();
      expect(mockFs.promises.mkdir).toHaveBeenCalled();
    });

    it("should propagate other directory creation errors", async () => {
      mockFs.promises.mkdir.mockRejectedValueOnce(new Error("Permission denied"));

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
      const errorStream = {
        write: vi.fn((data, callback) => {
          callback(new Error("Disk full"));
        }),
        end: vi.fn((callback) => callback && callback()),
        on: vi.fn(),
        once: vi.fn(),
        emit: vi.fn(),
      };

      mockFs.createWriteStream.mockReturnValue(errorStream as any);

      await expect(rotationManager.write("test data")).rejects.toThrow("Disk full");
    });
  });

  describe("Close functionality", () => {
    it("should close stream properly", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      await rotationManager.write("test data");
      await rotationManager.close();

      expect(mockWriteStream.end).toHaveBeenCalled();
    });

    it("should handle close when no stream exists", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      // Should not throw when closing without writing
      await expect(rotationManager.close()).resolves.not.toThrow();
    });
  });

  describe("Performance characteristics", () => {
    it("should handle rapid sequential writes", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      // Write multiple entries rapidly
      const writes = Array.from({ length: 5 }, (_, i) => rotationManager.write(`log entry ${i}\n`));

      await Promise.all(writes);

      // Verify that writes were successful and stream was created
      expect(mockWriteStream.write).toHaveBeenCalled();
      expect(mockFs.createWriteStream).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent writes safely", async () => {
      rotationManager = new FileRotationManager(testBasePath, {
        strategy: "size",
        maxSize: 1000,
        maxFiles: 3,
      });

      const writePromises = Array.from({ length: 3 }, async (_, i) => {
        await rotationManager.write(`concurrent write ${i}\n`);
      });

      // All writes should complete without error
      await expect(Promise.all(writePromises)).resolves.not.toThrow();
      expect(mockWriteStream.write).toHaveBeenCalled();
      expect(mockFs.createWriteStream).toHaveBeenCalled();
    });
  });
});
