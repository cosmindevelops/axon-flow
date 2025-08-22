/**
 * Environment Configuration Repository Types
 * Type definitions for environment variable configuration management
 */

export interface IEnvironmentConfigRepository {
  readonly prefix?: string;
  readonly transform?: IEnvironmentTransform;
  readonly validation?: IEnvironmentValidation;
}

export interface IEnvironmentTransform {
  readonly camelCase?: boolean;
  readonly parseNumbers?: boolean;
  readonly parseArrays?: boolean;
  readonly parseJSON?: boolean;
}

export interface IEnvironmentValidation {
  readonly required?: ReadonlyArray<string>;
  readonly optional?: ReadonlyArray<string>;
  readonly whitelist?: ReadonlyArray<string>;
}

export interface IEnvironmentOptions {
  readonly prefix?: string;
  readonly transform?: IEnvironmentTransform;
  readonly validation?: IEnvironmentValidation;
  readonly throwOnMissing?: boolean;
}
