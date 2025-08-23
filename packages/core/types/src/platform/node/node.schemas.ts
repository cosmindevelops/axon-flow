/**
 * Zod validation schemas for Node.js-specific platform types
 *
 * Runtime validation schemas for Node.js environment abstractions.
 */

import { z } from "zod";

// Node info schema
export const nodeInfoSchema = z.object({
  version: z.string(),
  platform: z.string(),
  arch: z.string(),
  release: z.object({
    name: z.string(),
    lts: z.union([z.string(), z.boolean()]),
    sourceUrl: z.string(),
    headersUrl: z.string(),
  }),
  features: z.object({
    inspector: z.boolean(),
    debug: z.boolean(),
    uv: z.boolean(),
    ipv6: z.boolean(),
    tls_alpn: z.boolean(),
    tls_sni: z.boolean(),
    tls_ocsp: z.boolean(),
    tls: z.boolean(),
  }),
});

// Process info schema
export const processInfoSchema = z.object({
  pid: z.number(),
  ppid: z.number(),
  platform: z.string(),
  arch: z.string(),
  version: z.string(),
  versions: z.record(z.string(), z.string()),
  title: z.string(),
  argv: z.array(z.string()),
  execPath: z.string(),
  execArgv: z.array(z.string()),
  env: z.record(z.string(), z.string().optional()),
  cwd: z.string(),
  uptime: z.number(),
  memoryUsage: z.object({
    rss: z.number(),
    heapTotal: z.number(),
    heapUsed: z.number(),
    external: z.number(),
    arrayBuffers: z.number(),
  }),
  cpuUsage: z.object({
    user: z.number(),
    system: z.number(),
  }),
});

// File system info schema
export const fileSystemInfoSchema = z.object({
  homedir: z.string(),
  tmpdir: z.string(),
  separator: z.string(),
  delimiter: z.string(),
  devNull: z.string(),
  constants: z.object({
    F_OK: z.number(),
    R_OK: z.number(),
    W_OK: z.number(),
    X_OK: z.number(),
  }),
});

// Network info schema
export const networkInfoSchema = z.object({
  hostname: z.string(),
  networkInterfaces: z.record(
    z.string(),
    z.array(
      z.object({
        address: z.string(),
        netmask: z.string(),
        family: z.union([z.literal("IPv4"), z.literal("IPv6")]),
        mac: z.string(),
        internal: z.boolean(),
        cidr: z.string().nullable(),
      }),
    ),
  ),
  endianness: z.union([z.literal("BE"), z.literal("LE")]),
});

// Operating system info schema
export const operatingSystemInfoSchema = z.object({
  type: z.string(),
  platform: z.string(),
  arch: z.string(),
  release: z.string(),
  version: z.string(),
  hostname: z.string(),
  uptime: z.number(),
  loadavg: z.array(z.number()),
  totalmem: z.number(),
  freemem: z.number(),
  cpus: z.array(
    z.object({
      model: z.string(),
      speed: z.number(),
      times: z.object({
        user: z.number(),
        nice: z.number(),
        sys: z.number(),
        idle: z.number(),
        irq: z.number(),
      }),
    }),
  ),
  constants: z.object({
    signals: z.record(z.string(), z.number()),
    errno: z.record(z.string(), z.number()),
    priority: z.record(z.string(), z.number()),
  }),
});

// Module info schema
export const moduleInfoSchema = z.object({
  id: z.string(),
  filename: z.string(),
  loaded: z.boolean(),
  parent: z.string().nullable(),
  children: z.array(z.string()),
  paths: z.array(z.string()),
  exports: z.record(z.string(), z.unknown()),
});

// Type inference helpers
export type InferredNodeInfo = z.infer<typeof nodeInfoSchema>;
export type InferredProcessInfo = z.infer<typeof processInfoSchema>;
export type InferredFileSystemInfo = z.infer<typeof fileSystemInfoSchema>;
export type InferredNetworkInfo = z.infer<typeof networkInfoSchema>;
export type InferredOperatingSystemInfo = z.infer<typeof operatingSystemInfoSchema>;
export type InferredModuleInfo = z.infer<typeof moduleInfoSchema>;

// Type guard functions for runtime validation
export const isNodeInfo = (value: unknown): value is InferredNodeInfo => nodeInfoSchema.safeParse(value).success;

export const isProcessInfo = (value: unknown): value is InferredProcessInfo =>
  processInfoSchema.safeParse(value).success;

export const isFileSystemInfo = (value: unknown): value is InferredFileSystemInfo =>
  fileSystemInfoSchema.safeParse(value).success;

export const isNetworkInfo = (value: unknown): value is InferredNetworkInfo =>
  networkInfoSchema.safeParse(value).success;

export const isOperatingSystemInfo = (value: unknown): value is InferredOperatingSystemInfo =>
  operatingSystemInfoSchema.safeParse(value).success;

export const isModuleInfo = (value: unknown): value is InferredModuleInfo => moduleInfoSchema.safeParse(value).success;

// Validation result helpers
export const parseNodeInfo = (value: unknown) => nodeInfoSchema.parse(value);
export const safeParseNodeInfo = (value: unknown) => nodeInfoSchema.safeParse(value);
export const parseProcessInfo = (value: unknown) => processInfoSchema.parse(value);
export const safeParseProcessInfo = (value: unknown) => processInfoSchema.safeParse(value);
export const parseFileSystemInfo = (value: unknown) => fileSystemInfoSchema.parse(value);
export const safeParseFileSystemInfo = (value: unknown) => fileSystemInfoSchema.safeParse(value);
export const parseNetworkInfo = (value: unknown) => networkInfoSchema.parse(value);
export const safeParseNetworkInfo = (value: unknown) => networkInfoSchema.safeParse(value);
export const parseOperatingSystemInfo = (value: unknown) => operatingSystemInfoSchema.parse(value);
export const safeParseOperatingSystemInfo = (value: unknown) => operatingSystemInfoSchema.safeParse(value);
export const parseModuleInfo = (value: unknown) => moduleInfoSchema.parse(value);
export const safeParseModuleInfo = (value: unknown) => moduleInfoSchema.safeParse(value);
