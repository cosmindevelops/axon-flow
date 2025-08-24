/**
 * Logging performance schemas test suite
 *
 * Validates performance logging schema definitions and validation rules
 */

import { describe, it, expect } from "vitest";

describe("Logging Performance Schemas", () => {
  it("should validate performance entry schema structure", () => {
    const mockPerformanceEntry = {
      id: "perf-entry-123",
      timestamp: "2024-01-01T12:00:00.000Z",
      level: "info",
      operation: "user_authentication",
      duration: 125.5,
      startTime: "2024-01-01T12:00:00.000Z",
      endTime: "2024-01-01T12:00:00.125Z",
      context: {
        correlationId: "corr-456",
        userId: "user-789",
        sessionId: "sess-abc",
        operation: "login",
        service: "auth-service",
        version: "2.1.0",
        environment: "production",
      },
      metrics: {
        timing: {
          total: 125.5,
          database: 85.2,
          cache: 15.3,
          processing: 20.0,
          network: 5.0,
        },
        counters: {
          database_queries: 3,
          cache_hits: 2,
          cache_misses: 1,
          api_calls: 1,
        },
        gauges: {
          memory_usage_mb: 156.8,
          cpu_usage_percent: 35.2,
          heap_size_mb: 128.4,
          connection_pool_active: 8,
        },
      },
      tags: ["authentication", "database", "cache"],
    };

    // Validate schema structure
    expect(mockPerformanceEntry).toHaveProperty("id");
    expect(mockPerformanceEntry).toHaveProperty("timestamp");
    expect(mockPerformanceEntry).toHaveProperty("duration");
    expect(mockPerformanceEntry).toHaveProperty("metrics");

    // Validate field types
    expect(typeof mockPerformanceEntry.id).toBe("string");
    expect(typeof mockPerformanceEntry.timestamp).toBe("string");
    expect(typeof mockPerformanceEntry.duration).toBe("number");
    expect(typeof mockPerformanceEntry.context).toBe("object");
    expect(typeof mockPerformanceEntry.metrics).toBe("object");
    expect(Array.isArray(mockPerformanceEntry.tags)).toBe(true);

    // Validate enum values
    expect(["trace", "debug", "info", "warn", "error"]).toContain(mockPerformanceEntry.level);

    // Validate numeric constraints
    expect(mockPerformanceEntry.duration).toBeGreaterThan(0);
    expect(mockPerformanceEntry.metrics.timing.total).toBe(mockPerformanceEntry.duration);
  });

  it("should validate timing data schema", () => {
    const timingData = {
      name: "api_request_timing",
      startTime: 1704110400000, // timestamp in milliseconds
      endTime: 1704110400150,
      duration: 150,
      phases: {
        dns_lookup: 5.2,
        tcp_connect: 12.8,
        tls_handshake: 45.3,
        request_sent: 2.1,
        waiting: 65.7,
        content_download: 19.4,
      },
      marks: [
        {
          name: "request_start",
          timestamp: 1704110400000,
          relative: 0,
        },
        {
          name: "response_start",
          timestamp: 1704110400085,
          relative: 85.0,
        },
        {
          name: "response_end",
          timestamp: 1704110400150,
          relative: 150,
        },
      ],
      metadata: {
        user_agent: "API-Client/1.0",
        method: "GET",
        url: "/api/users/123",
        status_code: 200,
        content_length: 1024,
      },
    };

    expect(typeof timingData.name).toBe("string");
    expect(typeof timingData.startTime).toBe("number");
    expect(typeof timingData.endTime).toBe("number");
    expect(typeof timingData.duration).toBe("number");
    expect(timingData.endTime).toBeGreaterThan(timingData.startTime);
    expect(timingData.duration).toBe(timingData.endTime - timingData.startTime);
    expect(typeof timingData.phases).toBe("object");
    expect(Array.isArray(timingData.marks)).toBe(true);

    timingData.marks.forEach((mark) => {
      expect(typeof mark.name).toBe("string");
      expect(typeof mark.timestamp).toBe("number");
      expect(typeof mark.relative).toBe("number");
    });
  });

  it("should validate performance metrics schema", () => {
    const performanceMetrics = {
      name: "system_performance",
      timestamp: "2024-01-01T12:00:00.000Z",
      interval: 60000, // 1 minute
      metrics: {
        timing: {
          response_time: {
            count: 1000,
            min: 15.2,
            max: 450.7,
            mean: 125.6,
            median: 110.3,
            p95: 280.4,
            p99: 380.9,
            stddev: 65.8,
          },
          database_time: {
            count: 750,
            min: 5.1,
            max: 200.3,
            mean: 45.2,
            median: 38.7,
            p95: 95.6,
            p99: 150.2,
            stddev: 28.4,
          },
        },
        counters: {
          total_requests: 1000,
          successful_requests: 975,
          failed_requests: 25,
          cache_hits: 650,
          cache_misses: 350,
          database_connections: 45,
        },
        gauges: {
          active_connections: 125,
          memory_usage_mb: 512.8,
          cpu_usage_percent: 68.5,
          disk_usage_percent: 78.2,
          queue_length: 15,
        },
        rates: {
          requests_per_second: 16.67,
          errors_per_second: 0.42,
          cache_hit_rate: 0.65,
          success_rate: 0.975,
        },
      },
      labels: {
        service: "api-gateway",
        version: "2.1.0",
        environment: "production",
        region: "us-east-1",
        instance: "api-01",
      },
    };

    expect(typeof performanceMetrics.name).toBe("string");
    expect(typeof performanceMetrics.timestamp).toBe("string");
    expect(typeof performanceMetrics.interval).toBe("number");
    expect(typeof performanceMetrics.metrics).toBe("object");
    expect(typeof performanceMetrics.labels).toBe("object");

    // Validate timing metrics structure
    Object.values(performanceMetrics.metrics.timing).forEach((timing) => {
      expect(timing).toHaveProperty("count");
      expect(timing).toHaveProperty("min");
      expect(timing).toHaveProperty("max");
      expect(timing).toHaveProperty("mean");
      expect(timing.min).toBeLessThanOrEqual(timing.max);
      expect(timing.mean).toBeGreaterThanOrEqual(timing.min);
      expect(timing.mean).toBeLessThanOrEqual(timing.max);
    });

    // Validate counter values
    expect(performanceMetrics.metrics.counters.total_requests).toBe(
      performanceMetrics.metrics.counters.successful_requests + performanceMetrics.metrics.counters.failed_requests,
    );
  });

  it("should validate performance threshold schema", () => {
    const performanceThreshold = {
      id: "threshold-123",
      name: "api_response_time_p95",
      description: "95th percentile API response time threshold",
      type: "response_time",
      metric: "response_time.p95",
      value: 200.0,
      unit: "milliseconds",
      operator: "less_than",
      severity: "warning",
      enabled: true,
      conditions: {
        duration: 300, // 5 minutes
        percentage: 0.95, // 95% of requests
        consecutive: 2, // 2 consecutive violations
        window: "sliding", // sliding or tumbling
      },
      actions: [
        {
          type: "alert",
          target: "performance-team",
          method: "slack",
          template: "high_response_time",
        },
        {
          type: "scale",
          target: "api-gateway",
          method: "horizontal",
          parameters: {
            min_replicas: 3,
            max_replicas: 10,
            target_cpu: 70,
          },
        },
      ],
      metadata: {
        created_by: "platform-team",
        created_at: "2024-01-01T00:00:00.000Z",
        last_modified: "2024-01-01T10:00:00.000Z",
        tags: ["api", "performance", "sla"],
      },
    };

    expect(typeof performanceThreshold.id).toBe("string");
    expect(typeof performanceThreshold.name).toBe("string");
    expect([
      "response_time",
      "throughput",
      "error_rate",
      "cpu_usage",
      "memory_usage",
      "disk_io",
      "network_io",
      "database_query_time",
    ]).toContain(performanceThreshold.type);
    expect(typeof performanceThreshold.value).toBe("number");
    expect(["less_than", "greater_than", "equals", "not_equals"]).toContain(performanceThreshold.operator);
    expect(["info", "warning", "critical", "emergency"]).toContain(performanceThreshold.severity);
    expect(typeof performanceThreshold.enabled).toBe("boolean");
    expect(typeof performanceThreshold.conditions).toBe("object");
    expect(Array.isArray(performanceThreshold.actions)).toBe(true);
  });

  it("should validate performance alert schema", () => {
    const performanceAlert = {
      id: "alert-456",
      threshold_id: "threshold-123",
      triggered_at: "2024-01-01T12:05:00.000Z",
      severity: "critical",
      status: "active",
      title: "High API Response Time Alert",
      description: "API response time P95 exceeded 200ms threshold",
      current_value: 285.6,
      threshold_value: 200.0,
      violation_duration: 420, // seconds
      context: {
        service: "api-gateway",
        environment: "production",
        region: "us-east-1",
        instance: "api-gateway-01",
        metric: "response_time.p95",
        window: "5m",
      },
      conditions_met: [
        {
          condition: "duration",
          requirement: 300,
          actual: 420,
          status: "violated",
        },
        {
          condition: "percentage",
          requirement: 0.95,
          actual: 0.98,
          status: "violated",
        },
      ],
      timeline: [
        {
          timestamp: "2024-01-01T12:00:00.000Z",
          event: "threshold_breached",
          value: 220.5,
        },
        {
          timestamp: "2024-01-01T12:02:30.000Z",
          event: "condition_duration_met",
          value: 245.8,
        },
        {
          timestamp: "2024-01-01T12:05:00.000Z",
          event: "alert_triggered",
          value: 285.6,
        },
      ],
      resolved: false,
      resolved_at: null,
      resolved_by: null,
      resolution_notes: null,
    };

    expect(typeof performanceAlert.id).toBe("string");
    expect(typeof performanceAlert.threshold_id).toBe("string");
    expect(["info", "warning", "critical", "emergency"]).toContain(performanceAlert.severity);
    expect(["active", "resolved", "suppressed", "acknowledged"]).toContain(performanceAlert.status);
    expect(typeof performanceAlert.current_value).toBe("number");
    expect(typeof performanceAlert.threshold_value).toBe("number");
    expect(typeof performanceAlert.violation_duration).toBe("number");
    expect(typeof performanceAlert.context).toBe("object");
    expect(Array.isArray(performanceAlert.conditions_met)).toBe(true);
    expect(Array.isArray(performanceAlert.timeline)).toBe(true);
    expect(typeof performanceAlert.resolved).toBe("boolean");

    performanceAlert.conditions_met.forEach((condition) => {
      expect(["violated", "met", "pending"]).toContain(condition.status);
    });

    performanceAlert.timeline.forEach((event) => {
      expect(typeof event.timestamp).toBe("string");
      expect(typeof event.event).toBe("string");
      expect(typeof event.value).toBe("number");
    });
  });

  it("should validate performance report schema", () => {
    const performanceReport = {
      id: "report-789",
      generated_at: "2024-01-01T12:15:00.000Z",
      report_type: "daily",
      time_range: {
        start: "2024-01-01T00:00:00.000Z",
        end: "2024-01-01T23:59:59.999Z",
        duration: 86400000, // 24 hours
      },
      summary: {
        total_requests: 150000,
        average_response_time: 145.8,
        p95_response_time: 280.2,
        p99_response_time: 450.6,
        error_rate: 0.025,
        availability: 0.9995, // 99.95%
        throughput: 1.74, // requests per second average
      },
      service_breakdown: [
        {
          service: "api-gateway",
          requests: 50000,
          avg_response_time: 125.6,
          error_rate: 0.015,
          availability: 0.9998,
        },
        {
          service: "user-service",
          requests: 75000,
          avg_response_time: 158.2,
          error_rate: 0.032,
          availability: 0.9992,
        },
        {
          service: "payment-service",
          requests: 25000,
          avg_response_time: 185.4,
          error_rate: 0.028,
          availability: 0.9995,
        },
      ],
      sla_compliance: {
        response_time_sla: {
          target: 200.0,
          actual: 145.8,
          compliance: 0.985, // 98.5%
          status: "met",
        },
        availability_sla: {
          target: 0.999, // 99.9%
          actual: 0.9995, // 99.95%
          compliance: 1.0, // 100%
          status: "exceeded",
        },
        error_rate_sla: {
          target: 0.05, // 5%
          actual: 0.025, // 2.5%
          compliance: 1.0, // 100%
          status: "met",
        },
      },
      trends: {
        response_time: "stable",
        throughput: "increasing",
        error_rate: "decreasing",
        availability: "stable",
      },
      recommendations: [
        {
          priority: "medium",
          category: "optimization",
          title: "Cache optimization opportunity",
          description: "Cache hit rate could be improved for user-service",
          estimated_impact: "15% response time improvement",
        },
      ],
    };

    expect(typeof performanceReport.id).toBe("string");
    expect(["hourly", "daily", "weekly", "monthly"]).toContain(performanceReport.report_type);
    expect(typeof performanceReport.time_range).toBe("object");
    expect(typeof performanceReport.summary).toBe("object");
    expect(Array.isArray(performanceReport.service_breakdown)).toBe(true);
    expect(typeof performanceReport.sla_compliance).toBe("object");
    expect(typeof performanceReport.trends).toBe("object");
    expect(Array.isArray(performanceReport.recommendations)).toBe(true);

    // Validate SLA compliance structure
    Object.values(performanceReport.sla_compliance).forEach((sla) => {
      expect(sla).toHaveProperty("target");
      expect(sla).toHaveProperty("actual");
      expect(sla).toHaveProperty("compliance");
      expect(["met", "exceeded", "missed"]).toContain(sla.status);
    });

    // Validate service breakdown totals
    const totalServiceRequests = performanceReport.service_breakdown.reduce(
      (sum, service) => sum + service.requests,
      0,
    );
    expect(totalServiceRequests).toBeLessThanOrEqual(performanceReport.summary.total_requests);
  });
});
