/**
 * Test setup file for @axon/config package
 * Ensures test isolation by cleaning up global state between tests
 * @module @axon/config/tests/test-setup
 */

import { clearAllRepositoryPools, setTestEnvironment } from "../src/builders/utils/object-pool.js";
import { afterEach, beforeAll } from "vitest";

/**
 * Enable test environment mode to ensure unique pool keys
 */
beforeAll(() => {
  setTestEnvironment(true);
});

/**
 * Clean up global repository pools after each test to ensure test isolation
 * This prevents the "Source already exists" errors caused by shared pool state
 */
afterEach(() => {
  clearAllRepositoryPools();
});
