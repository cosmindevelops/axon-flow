/**
 * @axon/logger/performance - Enhanced performance tracking module
 *
 * Comprehensive performance monitoring with:
 * - Memory usage tracking and GC monitoring
 * - Object pooling for measurements
 * - Statistical metrics aggregation
 * - Automatic timing decorators
 * - Cross-environment compatibility
 */

// Export core subdomain - core tracking functionality
export type * from "./core/core.types.js";
export * from "./core/core.schemas.js";
export * from "./core/core.classes.js";

// Export decorators for automatic timing - specific exports to avoid conflicts
export {
  // Decorator functions
  Timed,
  Profile,
  Benchmark,
  TrackInstantiation,
  withTiming,
  DatabaseTimed,
  NetworkTimed,
  ComputationTimed,
  CacheTimed,
  IOTimed,
  ConditionalTiming,
  ComposeDecorators,
  SampledTiming,
  // Decorator configuration and management
  setGlobalPerformanceTracker,
  configureGlobalDecorators,
  setPerformanceBudget,
  registerPerformanceExporter,
  getDecoratorMetrics,
  resetDecoratorMetrics,
  getCategoryMetrics,
  getPerformanceBudgets,
  getActiveExporters,
  createJSONExporter,
  createPrometheusExporter,
  // Decorator-specific schemas with aliases
  decoratorPerformanceCategorySchema,
  decoratorActivationConditionsSchema,
  decoratorPerformanceBudgetSchema,
  decoratorPerformanceExporterSchema,
  parameterOptionsSchema,
  decoratorPerformanceDecoratorOptionsSchema,
  decoratorCompositionSchema,
  parameterInspectionSchema,
  decoratorGlobalConfigSchema,
  // Decorator-specific types with aliases
  type IDecoratorActivationConditionsDecorator,
  type IPerformanceExporterDecorator,
  type IPerformanceDecoratorOptionsDecorator,
  type IDecoratorCompositionDecorator,
  type IParameterInspectionDecorator,
  type IDecoratorGlobalConfig,
} from "./decorators/index.js";
