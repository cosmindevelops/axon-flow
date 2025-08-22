/**
 * Application Schema Types
 * Type definitions for application-level configuration schemas
 */

import type { z } from "zod";
import type { SERVICE_CONFIG_SCHEMA, AUTH_CONFIG_SCHEMA, APPLICATION_CONFIG_SCHEMA } from "./application.schemas.js";

// Extract types from schemas
export type ServiceConfig = z.infer<typeof SERVICE_CONFIG_SCHEMA>;
export type AuthConfig = z.infer<typeof AUTH_CONFIG_SCHEMA>;
export type ApplicationConfig = z.infer<typeof APPLICATION_CONFIG_SCHEMA>;

/**
 * Complete application configuration combining all application schemas
 */
export interface IApplicationConfig {
  readonly service: ServiceConfig;
  readonly auth: AuthConfig;
  readonly app: ApplicationConfig;
}

/**
 * Application configuration validation options
 */
export interface IApplicationValidationOptions {
  readonly strict?: boolean;
  readonly allowUnknown?: boolean;
  readonly stripUnknown?: boolean;
  readonly requiredModules?: string[];
}

/**
 * Application module configuration
 */
export interface IApplicationModule {
  readonly name: string;
  readonly enabled: boolean;
  readonly version?: string;
  readonly config?: Record<string, unknown>;
}
