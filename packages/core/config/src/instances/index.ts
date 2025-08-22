/**
 * Configuration Instances Domain
 *
 * ⚠️ SPECIAL PURPOSE FOLDER ⚠️
 * This domain provides pre-configured, ready-to-use configuration instances
 * for common scenarios and environments. These are singleton instances that
 * can be imported directly without manual setup.
 *
 * Purpose:
 * - Pre-configured repository instances for immediate use
 * - Environment-specific configuration setups
 * - Common configuration patterns as reusable instances
 * - Default configurations for quick prototyping
 *
 * Usage: Import instances when you need immediate configuration access
 * without manual repository setup and configuration.
 */

import { EnvironmentConfigRepository } from "../repositories/environment/index.js";
import { CachedConfigRepository } from "../repositories/memory/index.js";

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
