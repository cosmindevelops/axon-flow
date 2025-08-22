/**
 * Zod validation schemas for common platform types
 *
 * Runtime validation schemas for cross-platform abstractions.
 */

import { z } from "zod";
import type {
  CipherAlgorithm,
  HashAlgorithm,
  HttpMethod,
  PlatformType,
  RequestCache,
  RequestCredentials,
  RequestMode,
  RequestRedirect,
  RuntimeName,
  StorageType,
  WebSocketReadyState,
} from "./common.types.js";

// Enum schemas
export const platformTypeSchema = z.enum([
  "node",
  "browser",
  "webworker",
  "electron-main",
  "electron-renderer",
  "react-native",
]) satisfies z.ZodType<PlatformType>;

export const runtimeNameSchema = z.enum([
  "node",
  "deno",
  "bun",
  "browser",
  "webworker",
  "react-native",
]) satisfies z.ZodType<RuntimeName>;

export const httpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
]) satisfies z.ZodType<HttpMethod>;

export const requestModeSchema = z.enum(["cors", "no-cors", "same-origin"]) satisfies z.ZodType<RequestMode>;

export const requestCredentialsSchema = z.enum([
  "omit",
  "same-origin",
  "include",
]) satisfies z.ZodType<RequestCredentials>;

export const requestCacheSchema = z.enum([
  "default",
  "no-store",
  "reload",
  "no-cache",
  "force-cache",
  "only-if-cached",
]) satisfies z.ZodType<RequestCache>;

export const requestRedirectSchema = z.enum(["follow", "manual", "error"]) satisfies z.ZodType<RequestRedirect>;

export const webSocketReadyStateSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]) satisfies z.ZodType<WebSocketReadyState>;

export const storageTypeSchema = z.enum([
  "memory",
  "local",
  "session",
  "indexed",
  "file",
]) satisfies z.ZodType<StorageType>;

export const hashAlgorithmSchema = z.enum([
  "sha1",
  "sha256",
  "sha384",
  "sha512",
  "md5",
]) satisfies z.ZodType<HashAlgorithm>;

export const cipherAlgorithmSchema = z.enum([
  "aes-128-cbc",
  "aes-192-cbc",
  "aes-256-cbc",
  "aes-128-gcm",
  "aes-256-gcm",
]) satisfies z.ZodType<CipherAlgorithm>;

// Platform info schema
export const platformInfoSchema = z.object({
  type: platformTypeSchema,
  version: z.string(),
  isDevelopment: z.boolean(),
  isProduction: z.boolean(),
  isTest: z.boolean(),
  environment: z.string(),
});

// Platform environment variables schema
export const platformEnvironmentVariablesSchema = z.record(z.string(), z.string().optional());

// Environment capabilities schema
export const environmentCapabilitiesSchema = z.object({
  fileSystem: z.boolean(),
  network: z.boolean(),
  process: z.boolean(),
  workers: z.boolean(),
  crypto: z.boolean(),
  storage: z.boolean(),
  notifications: z.boolean(),
  clipboard: z.boolean(),
});

// Memory info schema
export const memoryInfoSchema = z.object({
  total: z.number(),
  used: z.number(),
  free: z.number(),
  limit: z.number().optional(),
});

// CPU info schema
export const cpuInfoSchema = z.object({
  model: z.string(),
  cores: z.number(),
  speed: z.number().optional(),
  usage: z.number().optional(),
});

// Runtime info schema
export const runtimeInfoSchema = z.object({
  name: runtimeNameSchema,
  version: z.string(),
  arch: z.string(),
  platform: z.string(),
  memory: memoryInfoSchema,
  cpu: cpuInfoSchema,
});

// Platform environment schema
export const platformEnvironmentSchema = z.object({
  platform: platformInfoSchema,
  variables: platformEnvironmentVariablesSchema,
  capabilities: environmentCapabilitiesSchema,
  runtime: runtimeInfoSchema,
});

// Type inference helpers
export type InferredPlatformInfo = z.infer<typeof platformInfoSchema>;
export type InferredPlatformEnvironment = z.infer<typeof platformEnvironmentSchema>;
export type InferredRuntimeInfo = z.infer<typeof runtimeInfoSchema>;
export type InferredPlatformEnvironmentVariables = z.infer<typeof platformEnvironmentVariablesSchema>;
