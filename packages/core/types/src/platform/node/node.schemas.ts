/**
 * Zod validation schemas for Node.js-specific platform types
 *
 * Runtime validation schemas for Node.js environment abstractions.
 */

import { z } from "zod";
import type {
  IFileSystemInfo,
  IModuleInfo,
  INetworkInfo,
  INodeInfo,
  IOperatingSystemInfo,
  IProcessInfo,
} from "./node.types.js";

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
}) satisfies z.ZodType<INodeInfo>;

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
}) satisfies z.ZodType<IProcessInfo>;

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
}) satisfies z.ZodType<IFileSystemInfo>;

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
}) satisfies z.ZodType<INetworkInfo>;

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
}) satisfies z.ZodType<IOperatingSystemInfo>;

// Module info schema
export const moduleInfoSchema = z.object({
  id: z.string(),
  filename: z.string(),
  loaded: z.boolean(),
  parent: z.string().nullable(),
  children: z.array(z.string()),
  paths: z.array(z.string()),
  exports: z.record(z.string(), z.unknown()),
}) satisfies z.ZodType<IModuleInfo>;

// Type inference helpers
export type InferredNodeInfo = z.infer<typeof nodeInfoSchema>;
export type InferredProcessInfo = z.infer<typeof processInfoSchema>;
export type InferredFileSystemInfo = z.infer<typeof fileSystemInfoSchema>;
export type InferredNetworkInfo = z.infer<typeof networkInfoSchema>;
export type InferredOperatingSystemInfo = z.infer<typeof operatingSystemInfoSchema>;
export type InferredModuleInfo = z.infer<typeof moduleInfoSchema>;
