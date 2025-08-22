/**
 * Composite Configuration Repository Types
 * Type definitions for composite repository patterns and multi-source configuration management
 */

export interface ICompositeConfigRepository {
  readonly sources: ReadonlyArray<ICompositeSource>;
  readonly mergeStrategy: CompositeMergeStrategy;
}

export interface ICompositeSource {
  readonly repository: unknown;
  readonly priority: number;
  readonly enabled: boolean;
  readonly prefix?: string;
}

export type CompositeMergeStrategy = "merge" | "override" | "append";

export interface ICompositeOptions {
  readonly sources: ReadonlyArray<ICompositeSource>;
  readonly mergeStrategy?: CompositeMergeStrategy;
  readonly validateSources?: boolean;
}
