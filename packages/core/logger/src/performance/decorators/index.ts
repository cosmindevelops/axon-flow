/**
 * @axon/logger/performance/decorators - Performance decorator module
 *
 * Comprehensive performance tracking decorators with:
 * - Method timing with @Timed decorator
 * - Class profiling with @Profile decorator
 * - Benchmarking with @Benchmark decorator
 * - Category-specific decorators (Database, Network, etc.)
 * - Conditional activation and sampling strategies
 * - Performance budgets and metric exports
 */

// Export implementation classes and functions
export {
  setGlobalPerformanceTracker,
  configureGlobalDecorators,
  setPerformanceBudget,
  registerPerformanceExporter,
  Timed,
  Profile,
  Benchmark,
  TrackInstantiation,
  withTiming,
  getDecoratorMetrics,
  resetDecoratorMetrics,
  DatabaseTimed,
  NetworkTimed,
  ComputationTimed,
  CacheTimed,
  IOTimed,
  ConditionalTiming,
  ComposeDecorators,
  SampledTiming,
  getCategoryMetrics,
  getPerformanceBudgets,
  getActiveExporters,
  createJSONExporter,
  createPrometheusExporter,
} from "./decorators.classes.js";

// Export schemas for validation - exclude conflicting exports
export {
  performanceCategorySchema as decoratorPerformanceCategorySchema,
  decoratorActivationConditionsSchema,
  performanceBudgetSchema as decoratorPerformanceBudgetSchema,
  performanceExporterSchema as decoratorPerformanceExporterSchema,
  parameterOptionsSchema,
  performanceDecoratorOptionsSchema as decoratorPerformanceDecoratorOptionsSchema,
  decoratorCompositionSchema,
  parameterInspectionSchema,
  decoratorGlobalConfigSchema,
} from "./decorators.schemas.js";

// Export types - exclude conflicting exports
export type {
  IDecoratorActivationConditions as IDecoratorActivationConditionsDecorator,
  IPerformanceExporter as IPerformanceExporterDecorator,
  IPerformanceDecoratorOptions as IPerformanceDecoratorOptionsDecorator,
  IDecoratorComposition as IDecoratorCompositionDecorator,
  IParameterInspection as IParameterInspectionDecorator,
  IDecoratorGlobalConfig,
} from "./decorators.types.js";
