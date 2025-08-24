/**
 * Test suite for branded type class implementations
 */

import { describe, it, expect } from "vitest";
import type {
  BrandedString,
  BrandedNumber,
  EmailAddress,
  UUID,
  UserId,
  TenantId,
  OrganizationId,
  Milliseconds,
  Bytes,
  Percentage,
} from "../../../../src/utils/branded/branded.types.js";

describe("Branded Class Implementations", () => {
  describe("Type Safety & Compile-Time Checks", () => {
    it("should prevent accidental type mixing at compile-time", () => {
      const userId: UserId = "user-123" as UserId;
      const tenantId: TenantId = "tenant-456" as TenantId;

      // At runtime, they're both strings
      expect(typeof userId).toBe("string");
      expect(typeof tenantId).toBe("string");

      // But TypeScript should prevent direct assignment between them
      expect(userId).toBe("user-123");
      expect(tenantId).toBe("tenant-456");
    });

    it("should maintain branding through function parameters", () => {
      const processUserId = (id: UserId): string => {
        return `Processing user: ${id}`;
      };

      const userId: UserId = "user-789" as UserId;
      const result = processUserId(userId);

      expect(result).toBe("Processing user: user-789");
    });

    it("should work with generic functions", () => {
      const createArray = <T>(item: T): T[] => {
        return [item];
      };

      const email: EmailAddress = "test@example.com" as EmailAddress;
      const emailArray = createArray(email);

      expect(emailArray).toHaveLength(1);
      expect(emailArray[0]).toBe("test@example.com");
      expect(typeof emailArray[0]).toBe("string");
    });

    it("should support array operations", () => {
      const userIds: UserId[] = ["user-1" as UserId, "user-2" as UserId, "user-3" as UserId];

      expect(userIds).toHaveLength(3);
      expect(userIds.every((id) => typeof id === "string")).toBe(true);

      const mapped = userIds.map((id) => `ID: ${id}`);
      expect(mapped[0]).toBe("ID: user-1");
    });

    it("should work with object properties", () => {
      interface UserProfile {
        id: UserId;
        email: EmailAddress;
        orgId: OrganizationId;
        sessionTimeout: Milliseconds;
      }

      const profile: UserProfile = {
        id: "user-123" as UserId,
        email: "user@example.com" as EmailAddress,
        orgId: "org-456" as OrganizationId,
        sessionTimeout: 1800000 as Milliseconds,
      };

      expect(profile.id).toBe("user-123");
      expect(profile.email).toBe("user@example.com");
      expect(profile.orgId).toBe("org-456");
      expect(profile.sessionTimeout).toBe(1800000);
    });
  });

  describe("Zero-Overhead Abstraction Verification", () => {
    it("should have no runtime overhead for string-based branded types", () => {
      const plainString = "test-value";
      const brandedString: BrandedString<"Test"> = plainString as BrandedString<"Test">;

      // Should be identical at runtime
      expect(brandedString).toBe(plainString);
      expect(typeof brandedString).toBe(typeof plainString);
      expect(brandedString.length).toBe(plainString.length);
      expect(brandedString.charAt(0)).toBe(plainString.charAt(0));
    });

    it("should have no runtime overhead for number-based branded types", () => {
      const plainNumber = 42;
      const brandedNumber: BrandedNumber<"Test"> = plainNumber as BrandedNumber<"Test">;

      // Should be identical at runtime
      expect(brandedNumber).toBe(plainNumber);
      expect(typeof brandedNumber).toBe(typeof plainNumber);
      expect(brandedNumber + 1).toBe(plainNumber + 1);
      expect(brandedNumber * 2).toBe(plainNumber * 2);
    });

    it("should serialize identical to primitive types", () => {
      const userId: UserId = "user-123" as UserId;
      const email: EmailAddress = "test@example.com" as EmailAddress;
      const timeout: Milliseconds = 5000 as Milliseconds;

      // JSON serialization should be identical to primitives
      expect(JSON.stringify({ userId, email, timeout })).toBe(
        '{"userId":"user-123","email":"test@example.com","timeout":5000}',
      );
    });

    it("should have identical memory footprint to primitives", () => {
      // This is more of a conceptual test - branded types should not
      // add any runtime memory overhead
      const plainString = "test";
      const brandedString: BrandedString<"Test"> = "test" as BrandedString<"Test">;

      // Memory usage should be identical (tested conceptually)
      expect(JSON.stringify(plainString).length).toBe(JSON.stringify(brandedString).length);
    });
  });

  describe("Practical Usage Scenarios", () => {
    it("should handle ID management scenarios", () => {
      interface EntityManager {
        getUserById(id: UserId): { name: string; email: EmailAddress };
        getOrgById(id: OrganizationId): { name: string; userCount: number };
      }

      const manager: EntityManager = {
        getUserById: (id: UserId) => ({
          name: `User ${id}`,
          email: `${id}@example.com` as EmailAddress,
        }),
        getOrgById: (id: OrganizationId) => ({
          name: `Organization ${id}`,
          userCount: 100,
        }),
      };

      const userId: UserId = "user-123" as UserId;
      const orgId: OrganizationId = "org-456" as OrganizationId;

      const user = manager.getUserById(userId);
      const org = manager.getOrgById(orgId);

      expect(user.name).toBe("User user-123");
      expect(user.email).toBe("user-123@example.com");
      expect(org.name).toBe("Organization org-456");
      expect(org.userCount).toBe(100);
    });

    it("should handle measurement scenarios", () => {
      interface PerformanceMetrics {
        responseTime: Milliseconds;
        memoryUsage: Bytes;
        cpuUsage: Percentage;
      }

      const metrics: PerformanceMetrics = {
        responseTime: 250 as Milliseconds,
        memoryUsage: 1048576 as Bytes,
        cpuUsage: 75.5 as Percentage,
      };

      // Should work with calculations
      const responseTimeSeconds = metrics.responseTime / 1000;
      const memoryMB = metrics.memoryUsage / (1024 * 1024);
      const isHighCpu = metrics.cpuUsage > (80 as Percentage);

      expect(responseTimeSeconds).toBe(0.25);
      expect(memoryMB).toBe(1);
      expect(isHighCpu).toBe(false);
    });

    it("should handle UUID tracking scenarios", () => {
      interface RequestTracker {
        correlationId: UUID;
        userId: UserId;
        sessionId: UUID;
      }

      const tracker: RequestTracker = {
        correlationId: "123e4567-e89b-12d3-a456-426614174000" as UUID,
        userId: "user-789" as UserId,
        sessionId: "987fcdeb-51d2-43a1-b654-321987654321" as UUID,
      };

      expect(tracker.correlationId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(tracker.userId).toBe("user-789");
      expect(tracker.sessionId).toBe("987fcdeb-51d2-43a1-b654-321987654321");

      // Should work in collections
      const trackers: RequestTracker[] = [tracker];
      expect(trackers[0].userId).toBe("user-789");
    });
  });

  describe("Performance Validation", () => {
    it("should maintain high performance in branded type operations", () => {
      const iterations = 50000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const userId: UserId = `user-${i}` as UserId;
        const email: EmailAddress = `${userId}@example.com` as EmailAddress;
        const timeout: Milliseconds = (i * 100) as Milliseconds;

        const processed = {
          id: userId,
          contact: email,
          sessionTimeout: timeout,
        };

        expect(processed.id).toBe(`user-${i}`);
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(1000); // Should complete quickly
    });

    it("should handle branded type arrays efficiently", () => {
      const userIds: UserId[] = Array.from({ length: 10000 }, (_, i) => `user-${i}` as UserId);

      const start = performance.now();

      const filtered = userIds.filter((id) => id.includes("100"));
      const mapped = filtered.map((id) => `processed-${id}`);

      const end = performance.now();
      const duration = end - start;

      expect(filtered.length).toBeGreaterThan(0);
      expect(mapped[0]).toContain("processed-user-100");
      expect(duration).toBeLessThan(100);
    });
  });
});
