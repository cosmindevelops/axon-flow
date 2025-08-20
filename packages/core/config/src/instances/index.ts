/**
 * Configuration instances - Singleton instances for configuration repositories
 */

import { EnvironmentConfigRepository, CachedConfigRepository } from "../repositories/index.js";

/**
 * Default environment configuration repository instance
 */
export const defaultConfigRepository = new EnvironmentConfigRepository();

/**
 * Cached configuration repository instance with performance optimizations
 */
export const cachedConfigRepository = new CachedConfigRepository(defaultConfigRepository);

/**
 * Export the cached repository as the primary config instance
 */
export const config = cachedConfigRepository;
