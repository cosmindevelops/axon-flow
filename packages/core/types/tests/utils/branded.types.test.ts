/**
 * Tests for branded type utilities
 */

import { describe, expect, it } from "vitest";
import {
  assertBrand,
  brand,
  createDirectoryPath,
  createEmail,
  createFilePath,
  createIPAddress,
  createJWT,
  createPort,
  createSemVer,
  createURL,
  createUUID,
  createUnixTimestamp,
  flavor,
  isBranded,
  type Brand,
  type DirectoryPath,
  type Email,
  type FilePath,
  type Flavor,
  type GetBrand,
  type IPAddress,
  type IsBranded,
  type JWT,
  type Port,
  type SemVer,
  type URL,
  type UUID,
  type Unbrand,
  type UnixTimestamp,
} from "../../src/utils/branded.types.js";

describe("Branded Types", () => {
  describe("Brand utility", () => {
    it("should create branded values", () => {
      const brandedString = brand<string, "TestBrand">("test");
      expect(brandedString).toBe("test");

      const brandedNumber = brand<number, "TestNumber">(42);
      expect(brandedNumber).toBe(42);
    });

    it("should maintain type safety at compile time", () => {
      type UserId = Brand<string, "UserId">;
      type ProductId = Brand<string, "ProductId">;

      const userId = brand<string, "UserId">("user-123");
      const productId = brand<string, "ProductId">("product-456");

      // Type assertions for compile-time checking
      const _userCheck: UserId = userId;
      const _productCheck: ProductId = productId;

      expect(userId).toBe("user-123");
      expect(productId).toBe("product-456");
    });
  });

  describe("Flavor utility", () => {
    it("should create flavored values", () => {
      const flavoredString = flavor<string, "TestFlavor">("test");
      expect(flavoredString).toBe("test");

      const flavoredNumber = flavor<number, "TestNumber">(42);
      expect(flavoredNumber).toBe(42);
    });

    it("should be assignable to base type", () => {
      type FlavoredString = Flavor<string, "Special">;
      const flavored = flavor<string, "Special">("test");

      // Flavored values are assignable to base type
      const plain: string = flavored;
      expect(plain).toBe("test");
    });
  });

  describe("Common branded type factories", () => {
    it("should create UUID branded values", () => {
      const uuid = createUUID("550e8400-e29b-41d4-a716-446655440000");
      expect(uuid).toBe("550e8400-e29b-41d4-a716-446655440000");

      // Type assertion
      const _check: UUID = uuid;
    });

    it("should create Email branded values", () => {
      const email = createEmail("test@example.com");
      expect(email).toBe("test@example.com");

      // Type assertion
      const _check: Email = email;
    });

    it("should create URL branded values", () => {
      const url = createURL("https://example.com");
      expect(url).toBe("https://example.com");

      // Type assertion
      const _check: URL = url;
    });

    it("should create JWT branded values", () => {
      const jwt = createJWT("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
      expect(jwt).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");

      // Type assertion
      const _check: JWT = jwt;
    });

    it("should create UnixTimestamp branded values", () => {
      const timestamp = createUnixTimestamp(1234567890);
      expect(timestamp).toBe(1234567890);

      // Type assertion
      const _check: UnixTimestamp = timestamp;
    });

    it("should create Port branded values", () => {
      const port = createPort(3000);
      expect(port).toBe(3000);

      // Type assertion
      const _check: Port = port;
    });

    it("should create IPAddress branded values", () => {
      const ip = createIPAddress("192.168.1.1");
      expect(ip).toBe("192.168.1.1");

      // Type assertion
      const _check: IPAddress = ip;
    });

    it("should create FilePath branded values", () => {
      const path = createFilePath("/usr/local/bin/app");
      expect(path).toBe("/usr/local/bin/app");

      // Type assertion
      const _check: FilePath = path;
    });

    it("should create DirectoryPath branded values", () => {
      const dir = createDirectoryPath("/usr/local/bin");
      expect(dir).toBe("/usr/local/bin");

      // Type assertion
      const _check: DirectoryPath = dir;
    });

    it("should create SemVer branded values", () => {
      const version = createSemVer("1.2.3");
      expect(version).toBe("1.2.3");

      // Type assertion
      const _check: SemVer = version;
    });
  });

  describe("Type assertion utilities", () => {
    it("should assert brand type", () => {
      const value = "test";

      // assertBrand doesn't throw in our implementation
      // It's primarily for type narrowing
      expect((): void => {
        assertBrand<string, "TestBrand">(value);
      }).not.toThrow();
    });

    it("should check if value is branded", () => {
      const branded = brand<string, "TestBrand">("test");
      const plain = "test";

      // isBranded always returns true in our implementation
      // It's primarily for compile-time type checking
      expect(isBranded<string, "TestBrand">(branded)).toBe(true);
      expect(isBranded<string, "TestBrand">(plain)).toBe(true);
    });
  });

  describe("Type utility types", () => {
    it("should unbrand branded types", () => {
      type BrandedString = Brand<string, "TestBrand">;
      type UnbrandedString = Unbrand<BrandedString>;

      // Type assertion - UnbrandedString should be string
      const plain: UnbrandedString = "test";
      expect(plain).toBe("test");
    });

    it("should get brand from branded type", () => {
      type BrandedString = Brand<string, "TestBrand">;
      type ExtractedBrand = GetBrand<BrandedString>;

      // Type assertion - ExtractedBrand should be "TestBrand"
      const brand: ExtractedBrand = "TestBrand";
      expect(brand).toBe("TestBrand");
    });

    it("should check if type is branded", () => {
      type BrandedString = Brand<string, "TestBrand">;
      type PlainString = string;

      type IsBrandedString = IsBranded<BrandedString>;
      type IsPlainBranded = IsBranded<PlainString>;

      // Type assertions
      const brandedCheck: IsBrandedString = true;
      const plainCheck: IsPlainBranded = false;

      expect(brandedCheck).toBe(true);
      expect(plainCheck).toBe(false);
    });
  });

  describe("Brand type safety", () => {
    it("should prevent mixing different branded types at compile time", () => {
      type UserId = Brand<string, "UserId">;
      type ProductId = Brand<string, "ProductId">;

      const userId = createUUID("550e8400-e29b-41d4-a716-446655440000") as unknown as UserId;
      const productId = createUUID("660e8400-e29b-41d4-a716-446655440001") as unknown as ProductId;

      // These are different branded types and shouldn't be assignable to each other
      // This test validates runtime behavior, compile-time safety is enforced by TypeScript
      expect(userId).not.toBe(productId);
      expect(typeof userId).toBe("string");
      expect(typeof productId).toBe("string");
    });

    it("should allow operations on underlying type", () => {
      const port = createPort(3000);

      // Branded numbers can still be used in arithmetic
      const nextPort = (port as number) + 1;
      expect(nextPort).toBe(3001);

      const email = createEmail("test@example.com");

      // Branded strings can still use string methods
      const [, domain] = (email as string).split("@");
      expect(domain).toBe("example.com");
    });
  });
});
