/**
 * Configuration types and interfaces
 */

import type { z } from "zod";
import type { BASE_CONFIG_SCHEMA } from "../schemas/index.js";

// Base configuration types
export type BaseConfig = z.infer<typeof BASE_CONFIG_SCHEMA>;

/**
 * Platform types for cross-environment support
 */
export type ConfigPlatform = "node" | "browser" | "react-native";

/**
 * Configuration source types
 */
export type ConfigSourceType = "file" | "environment" | "memory" | "localStorage" | "composite" | "cached";

/**
 * File format types for file-based repositories
 */
export type FileFormat = "json" | "yaml" | "yml" | "toml" | "env" | "ini";

/**
 * Configuration change event data
 */
export interface IConfigChangeEvent {
  readonly source: string;
  readonly timestamp: number;
  readonly changeType: "update" | "reload" | "error";
  readonly affectedKeys?: string[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Configuration change listener function
 */
export type IConfigChangeListener = (event: IConfigChangeEvent) => void | Promise<void>;

/**
 * Configuration version metadata
 */
export interface IConfigVersion {
  readonly version: number;
  readonly timestamp: number;
  readonly checksum: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Repository metadata information
 */
export interface IRepositoryMetadata {
  readonly source: string;
  readonly type: ConfigSourceType;
  readonly platform: ConfigPlatform;
  readonly lastModified: number;
  readonly isWatchable: boolean;
  readonly isWritable: boolean;
  readonly version?: IConfigVersion;
}

/**
 * Configuration repository interface with advanced features
 */
export interface IConfigRepository {
  // Core configuration methods
  load<T extends z.ZodType>(schema: T): z.infer<T>;
  get(key: string): unknown;
  validate<T extends z.ZodType>(data: unknown, schema: T): z.infer<T>;

  // Hot-reloading and change management
  watch(listener: IConfigChangeListener): () => void;
  reload(): Promise<void>;

  // Repository lifecycle management
  dispose(): Promise<void>;

  // Metadata and inspection
  getMetadata(): IRepositoryMetadata;
}

/**
 * Platform-specific configuration repository interface
 */
export interface IPlatformConfigRepository extends IConfigRepository {
  readonly platform: ConfigPlatform;
  readonly isSupported: boolean;
}

/**
 * Writable configuration repository interface
 */
export interface IWritableConfigRepository extends IConfigRepository {
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Versioned configuration repository interface
 */
export interface IVersionedConfigRepository extends IConfigRepository {
  getVersion(): IConfigVersion;
  getVersionHistory(): IConfigVersion[];
  rollback(version?: number): Promise<void>;
  compareVersions(version1: number, version2: number): Promise<Record<string, { old: unknown; new: unknown }>>;
}

/**
 * Composite configuration repository source definition
 */
export interface ICompositeSource {
  readonly repository: IConfigRepository;
  readonly priority: number;
  readonly prefix?: string;
  readonly enabled: boolean;
}

// Types are exported directly from schema files via main index.ts
// No need to re-export here to avoid conflicts
