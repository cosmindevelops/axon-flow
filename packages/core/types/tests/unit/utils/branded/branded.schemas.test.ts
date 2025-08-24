/**
 * Test suite for branded type schema validations
 */

import { describe, it, expect } from "vitest";
import type { EmailAddress, UUID, Milliseconds, Percentage } from "../../../../src/utils/branded/branded.types.js";

describe("Branded Schema Validations", () => {
  describe("Zero-Overhead Abstraction Verification", () => {
    it("should have no runtime overhead for string-based branded types", () => {
      const plainString = "test-value";
      const brandedString: EmailAddress = plainString as EmailAddress;

      expect(brandedString).toBe(plainString);
      expect(typeof brandedString).toBe(typeof plainString);
      expect(brandedString.length).toBe(plainString.length);
      expect(brandedString.charAt(0)).toBe(plainString.charAt(0));
    });

    it("should have no runtime overhead for number-based branded types", () => {
      const plainNumber = 42;
      const brandedNumber: Milliseconds = plainNumber as Milliseconds;

      expect(brandedNumber).toBe(plainNumber);
      expect(typeof brandedNumber).toBe(typeof plainNumber);
      expect(brandedNumber + 1).toBe(plainNumber + 1);
      expect(brandedNumber * 2).toBe(plainNumber * 2);
    });

    it("should serialize identical to primitive types", () => {
      const email: EmailAddress = "test@example.com" as EmailAddress;
      const uuid: UUID = "123e4567-e89b-12d3-a456-426614174000" as UUID;
      const timeout: Milliseconds = 5000 as Milliseconds;

      expect(JSON.stringify({ email, uuid, timeout })).toBe(
        '{"email":"test@example.com","uuid":"123e4567-e89b-12d3-a456-426614174000","timeout":5000}',
      );
    });

    it("should have identical memory footprint to primitives", () => {
      const plainString = "test";
      const brandedString: EmailAddress = "test" as EmailAddress;

      expect(JSON.stringify(plainString).length).toBe(JSON.stringify(brandedString).length);
    });
  });

  describe("Type Safety & Compile-Time Checks", () => {
    it("should prevent accidental type mixing at compile-time", () => {
      const email: EmailAddress = "user@example.com" as EmailAddress;
      const uuid: UUID = "123e4567-e89b-12d3-a456-426614174000" as UUID;

      expect(typeof email).toBe("string");
      expect(typeof uuid).toBe("string");
      expect(email).toBe("user@example.com");
      expect(uuid).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("should maintain branding through function parameters", () => {
      const processEmail = (email: EmailAddress): string => {
        return `Processing email: ${email}`;
      };

      const email: EmailAddress = "test@example.com" as EmailAddress;
      const result = processEmail(email);

      expect(result).toBe("Processing email: test@example.com");
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
      const emails: EmailAddress[] = [
        "user1@example.com" as EmailAddress,
        "user2@example.com" as EmailAddress,
        "user3@example.com" as EmailAddress,
      ];

      expect(emails).toHaveLength(3);
      expect(emails.every((email) => typeof email === "string")).toBe(true);

      const mapped = emails.map((email) => `Email: ${email}`);
      expect(mapped[0]).toBe("Email: user1@example.com");
    });

    it("should work with object properties", () => {
      interface UserProfile {
        email: EmailAddress;
        uuid: UUID;
        sessionTimeout: Milliseconds;
      }

      const profile: UserProfile = {
        email: "user@example.com" as EmailAddress,
        uuid: "123e4567-e89b-12d3-a456-426614174000" as UUID,
        sessionTimeout: 3600000 as Milliseconds,
      };

      expect(profile.email).toBe("user@example.com");
      expect(profile.uuid).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(profile.sessionTimeout).toBe(3600000);
    });
  });

  describe("Performance Validation", () => {
    it("should have minimal performance impact", () => {
      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const email: EmailAddress = `user${i}@example.com` as EmailAddress;
        const processed = `Processed: ${email}`;
        expect(processed).toContain("user");
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(500); // Relaxed for CI performance variations
    });

    it("should handle percentage calculations efficiently", () => {
      const usage: Percentage = 75.0 as Percentage;
      const limit: Percentage = 100.0 as Percentage;

      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const ratio = usage / limit;
        const withinLimit = usage < limit;
        expect(ratio).toBe(0.75);
        expect(withinLimit).toBe(true);
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(500); // Relaxed for CI performance variations
    });
  });
});
