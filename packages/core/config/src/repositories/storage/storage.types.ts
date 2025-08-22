/**
 * Storage Configuration Repository Types
 * Type definitions for file and storage-based configuration management
 */

export interface IFileConfigRepository {
  readonly filePath: string;
  readonly watchForChanges?: boolean;
  readonly encoding?: BufferEncoding;
  readonly debounceMs?: number;
}

export interface ILocalStorageConfigRepository {
  readonly storageKey: string;
  readonly namespace?: string;
  readonly serializeFunction?: (data: unknown) => string;
  readonly deserializeFunction?: (data: string) => unknown;
}

export interface IFileOptions {
  readonly filePath: string;
  readonly watchForChanges?: boolean;
  readonly encoding?: BufferEncoding;
  readonly debounceMs?: number;
  readonly createIfNotExists?: boolean;
}

export interface IStorageOptions {
  readonly storageKey: string;
  readonly namespace?: string;
  readonly serializeFunction?: (data: unknown) => string;
  readonly deserializeFunction?: (data: string) => unknown;
  readonly fallbackData?: Record<string, unknown>;
}
