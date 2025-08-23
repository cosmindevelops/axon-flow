/**
 * Container module exports
 *
 * Complete dependency injection container implementation
 */

// Types and interfaces
export type * from "./container.types.js";

// Core container implementation
export {
  DIContainer,
  createContainer,
  getDefaultContainer,
  setDefaultContainer,
  resetDefaultContainer,
} from "./container.classes.js";

// Validation schemas and utilities
export {
  CONTAINER_LIFECYCLE_SCHEMA,
  DI_TOKEN_SCHEMA,
  CONTAINER_REGISTRATION_OPTIONS_SCHEMA,
  CONTAINER_CONFIG_SCHEMA,
  RESOLUTION_CONTEXT_SCHEMA,
  CONTAINER_METRICS_SCHEMA,
  DEFAULT_CONTAINER_CONFIG,
  validateContainerConfig,
  validateRegistrationOptions,
  validateDIToken,
  createDefaultRegistrationOptions,
} from "./container.schemas.js";
