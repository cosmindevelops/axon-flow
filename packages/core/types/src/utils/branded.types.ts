/**
 * Branded type utilities
 *
 * These utilities provide type-safe branding for primitive types,
 * ensuring compile-time type safety for domain-specific values.
 */

/**
 * Brand utility type
 *
 * Creates a branded type by intersecting a base type with a unique brand.
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Flavor utility type (weaker than Brand)
 *
 * Creates a flavored type that's assignable to the base type.
 */
export type Flavor<T, F> = T & { readonly __flavor?: F };

/**
 * Create a branded value
 *
 * Factory function to create branded types at runtime.
 */
export const brand = <T, B extends string>(value: T): Brand<T, B> => {
  return value as Brand<T, B>;
};

/**
 * Create a flavored value
 */
export const flavor = <T, F extends string>(value: T): Flavor<T, F> => {
  return value as Flavor<T, F>;
};

// Common branded types for the platform

/**
 * UUID branded type
 */
export type UUID = Brand<string, "UUID">;

/**
 * Email address branded type
 */
export type Email = Brand<string, "Email">;

/**
 * URL branded type
 */
export type URL = Brand<string, "URL">;

/**
 * JWT token branded type
 */
export type JWT = Brand<string, "JWT">;

/**
 * Unix timestamp branded type
 */
export type UnixTimestamp = Brand<number, "UnixTimestamp">;

/**
 * Port number branded type
 */
export type Port = Brand<number, "Port">;

/**
 * IP address branded type
 */
export type IPAddress = Brand<string, "IPAddress">;

/**
 * File path branded type
 */
export type FilePath = Brand<string, "FilePath">;

/**
 * Directory path branded type
 */
export type DirectoryPath = Brand<string, "DirectoryPath">;

/**
 * Semantic version branded type
 */
export type SemVer = Brand<string, "SemVer">;

/**
 * Currency code branded type (ISO 4217)
 */
export type CurrencyCode = Brand<string, "CurrencyCode">;

/**
 * Country code branded type (ISO 3166)
 */
export type CountryCode = Brand<string, "CountryCode">;

/**
 * Language code branded type (ISO 639)
 */
export type LanguageCode = Brand<string, "LanguageCode">;

/**
 * Hex color branded type
 */
export type HexColor = Brand<string, "HexColor">;

/**
 * Base64 string branded type
 */
export type Base64 = Brand<string, "Base64">;

/**
 * JSON string branded type
 */
export type JSONString = Brand<string, "JSONString">;

/**
 * Regular expression pattern branded type
 */
export type RegexPattern = Brand<string, "RegexPattern">;

/**
 * SQL query branded type
 */
export type SQLQuery = Brand<string, "SQLQuery">;

/**
 * GraphQL query branded type
 */
export type GraphQLQuery = Brand<string, "GraphQLQuery">;

/**
 * Cron expression branded type
 */
export type CronExpression = Brand<string, "CronExpression">;

/**
 * Duration in milliseconds branded type
 */
export type DurationMs = Brand<number, "DurationMs">;

/**
 * Byte size branded type
 */
export type ByteSize = Brand<number, "ByteSize">;

/**
 * Percentage branded type (0-100)
 */
export type Percentage = Brand<number, "Percentage">;

// Factory functions for common branded types

/**
 * Create a UUID branded value
 */
export const createUUID = (value: string): UUID => brand<string, "UUID">(value);

/**
 * Create an Email branded value
 */
export const createEmail = (value: string): Email => brand<string, "Email">(value);

/**
 * Create a URL branded value
 */
export const createURL = (value: string): URL => brand<string, "URL">(value);

/**
 * Create a JWT branded value
 */
export const createJWT = (value: string): JWT => brand<string, "JWT">(value);

/**
 * Create a Unix timestamp branded value
 */
export const createUnixTimestamp = (value: number): UnixTimestamp => brand<number, "UnixTimestamp">(value);

/**
 * Create a Port branded value
 */
export const createPort = (value: number): Port => brand<number, "Port">(value);

/**
 * Create an IP address branded value
 */
export const createIPAddress = (value: string): IPAddress => brand<string, "IPAddress">(value);

/**
 * Create a file path branded value
 */
export const createFilePath = (value: string): FilePath => brand<string, "FilePath">(value);

/**
 * Create a directory path branded value
 */
export const createDirectoryPath = (value: string): DirectoryPath => brand<string, "DirectoryPath">(value);

/**
 * Create a semantic version branded value
 */
export const createSemVer = (value: string): SemVer => brand<string, "SemVer">(value);

// Type assertion utilities

/**
 * Assert that a value is of a branded type
 */
export const assertBrand = <T, B extends string>(value: T): asserts value is Brand<T, B> => {
  // Runtime assertion would go here if needed
  // This is primarily for compile-time type narrowing
};

/**
 * Check if a value could be a branded type (compile-time only)
 */
export const isBranded = <T, B extends string>(value: T | Brand<T, B>): value is Brand<T, B> => {
  return true; // This is compile-time only
};

/**
 * Remove brand from a type
 */
export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;

/**
 * Get the brand of a branded type
 */
export type GetBrand<T> = T extends Brand<unknown, infer B> ? B : never;

/**
 * Check if a type is branded
 */
export type IsBranded<T> = T extends Brand<unknown, string> ? true : false;
