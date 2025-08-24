/**
 * Test suite for branded type definitions
 */

import { describe, expect, it } from "vitest";
import type {
  BrandedNumber,
  BrandedString,
  Bytes,
  CorrelationId,
  EmailAddress,
  FilePath,
  HashValue,
  Milliseconds,
  OrganizationId,
  Percentage,
  PlatformId,
  ResourceId,
  TenantId,
  Timestamp,
  Token,
  URL,
  UUID,
  UserId,
  Version,
} from "../../../../src/utils/branded/branded.types.js";

describe("Branded Type Definitions", () => {
  describe("Basic Branded Types", () => {
    it("should create branded strings with compile-time safety", () => {
      const brandedStr: BrandedString<"TestBrand"> = "test" as BrandedString<"TestBrand">;
      expect(typeof brandedStr).toBe("string");
      expect(brandedStr).toBe("test");
    });

    it("should create branded numbers with compile-time safety", () => {
      const brandedNum: BrandedNumber<"TestBrand"> = 42 as BrandedNumber<"TestBrand">;
      expect(typeof brandedNum).toBe("number");
      expect(brandedNum).toBe(42);
    });

    it("should maintain different types for different brands", () => {
      const userId: BrandedString<"UserId"> = "user-123" as BrandedString<"UserId">;
      const tenantId: BrandedString<"TenantId"> = "tenant-456" as BrandedString<"TenantId">;

      expect(typeof userId).toBe("string");
      expect(typeof tenantId).toBe("string");
      expect(userId).toBe("user-123");
      expect(tenantId).toBe("tenant-456");
    });
  });

  describe("Communication & Networking Branded Types", () => {
    describe("EmailAddress", () => {
      it("should create email address branded type", () => {
        const email: EmailAddress = "user@example.com" as EmailAddress;
        expect(typeof email).toBe("string");
        expect(email).toBe("user@example.com");
      });

      it("should be assignable to string in contexts that accept it", () => {
        const email: EmailAddress = "user@example.com" as EmailAddress;
        const stringValue: string = email;
        expect(stringValue).toBe("user@example.com");
      });
    });

    describe("URL", () => {
      it("should create URL branded type", () => {
        const url: URL = "https://example.com" as URL;
        expect(typeof url).toBe("string");
        expect(url).toBe("https://example.com");
      });
    });

    describe("UUID", () => {
      it("should create UUID branded type", () => {
        const uuid: UUID = "123e4567-e89b-12d3-a456-426614174000" as UUID;
        expect(typeof uuid).toBe("string");
        expect(uuid).toBe("123e4567-e89b-12d3-a456-426614174000");
      });
    });

    describe("CorrelationId", () => {
      it("should create correlation ID branded type", () => {
        const corrId: CorrelationId = "corr-123456" as CorrelationId;
        expect(typeof corrId).toBe("string");
        expect(corrId).toBe("corr-123456");
      });
    });
  });

  describe("System & Resource Branded Types", () => {
    describe("FilePath", () => {
      it("should create file path branded type", () => {
        const path: FilePath = "/home/user/file.txt" as FilePath;
        expect(typeof path).toBe("string");
        expect(path).toBe("/home/user/file.txt");
      });
    });

    describe("Version", () => {
      it("should create version branded type", () => {
        const version: Version = "1.2.3" as Version;
        expect(typeof version).toBe("string");
        expect(version).toBe("1.2.3");
      });
    });

    describe("Timestamp", () => {
      it("should create timestamp branded type", () => {
        const timestamp: Timestamp = "2024-01-01T00:00:00Z" as Timestamp;
        expect(typeof timestamp).toBe("string");
        expect(timestamp).toBe("2024-01-01T00:00:00Z");
      });
    });

    describe("PlatformId", () => {
      it("should create platform ID branded type", () => {
        const platformId: PlatformId = "node" as PlatformId;
        expect(typeof platformId).toBe("string");
        expect(platformId).toBe("node");
      });
    });
  });

  describe("Measurement Branded Types", () => {
    describe("Milliseconds", () => {
      it("should create milliseconds branded type", () => {
        const ms: Milliseconds = 1000 as Milliseconds;
        expect(typeof ms).toBe("number");
        expect(ms).toBe(1000);
      });

      it("should work in arithmetic operations", () => {
        const timeout: Milliseconds = 5000 as Milliseconds;
        const delay: Milliseconds = 1000 as Milliseconds;

        const total = timeout + delay;
        expect(total).toBe(6000);
      });
    });

    describe("Bytes", () => {
      it("should create bytes branded type", () => {
        const bytes: Bytes = 1024 as Bytes;
        expect(typeof bytes).toBe("number");
        expect(bytes).toBe(1024);
      });
    });

    describe("Percentage", () => {
      it("should create percentage branded type", () => {
        const percent: Percentage = 85.5 as Percentage;
        expect(typeof percent).toBe("number");
        expect(percent).toBe(85.5);
      });

      it("should work in calculations", () => {
        const usage: Percentage = 75.0 as Percentage;
        const threshold: Percentage = 80.0 as Percentage;

        expect(usage < threshold).toBe(true);
      });
    });
  });

  describe("Security & Authentication Branded Types", () => {
    describe("HashValue", () => {
      it("should create hash value branded type", () => {
        const hash: HashValue = "sha256:abc123def456" as HashValue;
        expect(typeof hash).toBe("string");
        expect(hash).toBe("sha256:abc123def456");
      });
    });

    describe("Token", () => {
      it("should create token branded type", () => {
        const token: Token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" as Token;
        expect(typeof token).toBe("string");
        expect(token).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      });
    });
  });

  describe("Identity & Organization Branded Types", () => {
    describe("UserId", () => {
      it("should create user ID branded type", () => {
        const userId: UserId = "user-123456" as UserId;
        expect(typeof userId).toBe("string");
        expect(userId).toBe("user-123456");
      });
    });

    describe("TenantId", () => {
      it("should create tenant ID branded type", () => {
        const tenantId: TenantId = "tenant-789" as TenantId;
        expect(typeof tenantId).toBe("string");
        expect(tenantId).toBe("tenant-789");
      });
    });

    describe("OrganizationId", () => {
      it("should create organization ID branded type", () => {
        const orgId: OrganizationId = "org-abc123" as OrganizationId;
        expect(typeof orgId).toBe("string");
        expect(orgId).toBe("org-abc123");
      });
    });

    describe("ResourceId", () => {
      it("should create resource ID branded type", () => {
        const resourceId: ResourceId = "resource-xyz789" as ResourceId;
        expect(typeof resourceId).toBe("string");
        expect(resourceId).toBe("resource-xyz789");
      });
    });
  });
});
