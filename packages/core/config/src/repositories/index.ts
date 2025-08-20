/**
 * Configuration repository implementations
 * @module @axon/config/repositories
 */

export { CachedConfigRepository } from "./cached-config.repository.js";
export {
  EnvironmentConfigRepository,
  envToCamelCase,
  parseBoolean,
  parseNumber,
  parseJSON,
  parseArray,
} from "./environment-config.repository.js";

// New repository implementations
export { FileConfigRepository } from "./file-config.repository.js";
export type { IFileConfigOptions } from "./file-config.repository.js";

export { MemoryConfigRepository } from "./memory-config.repository.js";

export { LocalStorageConfigRepository } from "./localstorage-config.repository.js";
export type { ILocalStorageConfigOptions } from "./localstorage-config.repository.js";

export { CompositeConfigRepository } from "./composite-config.repository.js";
export type { ICompositeConfigOptions } from "./composite-config.repository.js";
