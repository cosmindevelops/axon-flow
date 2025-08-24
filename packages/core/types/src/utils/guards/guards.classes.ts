/**
 * Type guard utilities
 *
 * Runtime type checking functions for safe type narrowing.
 * All guards follow the pattern: is[Type](value): value is [Type]
 */

import type {
  IAgentCapability,
  IAgentHealth,
  IAgentMetadata,
  IAgentRegistration,
} from "../../core/agent/agent.types.js";

import type { ITaskDefinition, ITaskExecution, IWorkflowDefinition, TaskStatus } from "../../core/task/task.types.js";

import type { ICommand, IErrorMessage, IEvent, IMessage, IQuery, IReply } from "../../core/message/message.types.js";

import type { ILogContext, ILogEntry, LogLevel } from "../../logging/entry/entry.types.js";

import type { ErrorSeverity, IEnhancedError, IErrorContext } from "../../logging/error/error.types.js";

// Primitive type guards

/**
 * Check if value is a string
 */
export const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

/**
 * Check if value is a number
 */
export const isNumber = (value: unknown): value is number => {
  return typeof value === "number" && !isNaN(value);
};

/**
 * Check if value is a boolean
 */
export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === "boolean";
};

/**
 * Check if value is an object (non-null)
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

/**
 * Check if value is an array
 */
export const isArray = <T = unknown>(value: unknown): value is T[] => {
  return Array.isArray(value);
};

/**
 * Check if value is a function
 */
export const isFunction = (value: unknown): value is (...args: never[]) => unknown => {
  return typeof value === "function";
};

/**
 * Check if value is null
 */
export const isNull = (value: unknown): value is null => {
  return value === null;
};

/**
 * Check if value is undefined
 */
export const isUndefined = (value: unknown): value is undefined => {
  return value === undefined;
};

/**
 * Check if value is null or undefined
 */
export const isNullish = (value: unknown): value is null | undefined => {
  return value == null;
};

// Agent type guards

/**
 * Check if value is an IAgentMetadata
 */
export const isAgentMetadata = (value: unknown): value is IAgentMetadata => {
  if (!isObject(value)) return false;

  return (
    "id" in value &&
    "name" in value &&
    "version" in value &&
    "capabilities" in value &&
    isArray(value["capabilities"]) &&
    "status" in value &&
    "registeredAt" in value &&
    "lastHeartbeat" in value &&
    "metadata" in value &&
    isObject(value["metadata"])
  );
};

/**
 * Check if value is an IAgentCapability
 */
export const isAgentCapability = (value: unknown): value is IAgentCapability => {
  if (!isObject(value)) return false;

  return (
    "name" in value &&
    "version" in value &&
    "description" in value &&
    "parameters" in value &&
    isArray(value["parameters"]) &&
    "returns" in value
  );
};

/**
 * Check if value is an IAgentRegistration
 */
export const isAgentRegistration = (value: unknown): value is IAgentRegistration => {
  if (!isObject(value)) return false;

  return "name" in value && "version" in value && "capabilities" in value && isArray(value["capabilities"]);
};

/**
 * Check if value is an IAgentHealth
 */
export const isAgentHealth = (value: unknown): value is IAgentHealth => {
  if (!isObject(value)) return false;

  return "agentId" in value && "status" in value && "lastHeartbeat" in value;
};

// Task type guards

/**
 * Check if value is an ITaskDefinition
 */
export const isTaskDefinition = (value: unknown): value is ITaskDefinition => {
  if (!isObject(value)) return false;

  return (
    "id" in value &&
    "name" in value &&
    "description" in value &&
    "agentId" in value &&
    "capability" in value &&
    "parameters" in value &&
    "dependencies" in value &&
    "timeout" in value &&
    "priority" in value &&
    "retryPolicy" in value
  );
};

/**
 * Check if value is an ITaskExecution
 */
export const isTaskExecution = (value: unknown): value is ITaskExecution => {
  if (!isObject(value)) return false;

  return "task" in value && "status" in value && "correlationId" in value && "retryCount" in value;
};

/**
 * Check if value is an IWorkflowDefinition
 */
export const isWorkflowDefinition = (value: unknown): value is IWorkflowDefinition => {
  if (!isObject(value)) return false;

  return (
    "id" in value &&
    "name" in value &&
    "version" in value &&
    "description" in value &&
    "tasks" in value &&
    isArray(value["tasks"]) &&
    "timeout" in value &&
    "useSaga" in value
  );
};

/**
 * Check if value is a valid TaskStatus
 */
export const isTaskStatus = (value: unknown): value is TaskStatus => {
  return (
    isString(value) &&
    ["pending", "queued", "executing", "completed", "failed", "cancelled", "retrying", "compensating"].includes(value)
  );
};

// Message type guards

/**
 * Check if value is an IMessage
 */
export const isMessage = (value: unknown): value is IMessage => {
  if (!isObject(value)) return false;

  return (
    "id" in value &&
    "correlationId" in value &&
    "type" in value &&
    "payload" in value &&
    "metadata" in value &&
    "timestamp" in value
  );
};

/**
 * Check if value is an ICommand
 */
export const isCommand = (value: unknown): value is ICommand => {
  if (!isMessage(value)) return false;

  return value.type === "command" && "commandName" in value && "expectsReply" in value;
};

/**
 * Check if value is an IQuery
 */
export const isQuery = (value: unknown): value is IQuery => {
  if (!isMessage(value)) return false;

  return value.type === "query" && "queryName" in value && "resultType" in value;
};

/**
 * Check if value is an IEvent
 */
export const isEvent = (value: unknown): value is IEvent => {
  if (!isMessage(value)) return false;

  return value.type === "event" && "eventName" in value;
};

/**
 * Check if value is an IReply
 */
export const isReply = (value: unknown): value is IReply => {
  if (!isMessage(value)) return false;

  return value.type === "reply" && "requestId" in value && "success" in value;
};

/**
 * Check if value is an IErrorMessage
 */
export const isErrorMessage = (value: unknown): value is IErrorMessage => {
  if (!isMessage(value)) return false;

  return value.type === "error" && "severity" in value;
};

// Logging type guards

/**
 * Check if value is an ILogEntry
 */
export const isLogEntry = (value: unknown): value is ILogEntry => {
  if (!isObject(value)) return false;

  return (
    "timestamp" in value && "level" in value && "message" in value && "context" in value && isObject(value["context"])
  );
};

/**
 * Check if value is an ILogContext
 */
export const isLogContext = (value: unknown): value is ILogContext => {
  if (!isObject(value)) return false;

  return "service" in value && isString(value["service"]);
};

/**
 * Check if value is a valid LogLevel
 */
export const isLogLevel = (value: unknown): value is LogLevel => {
  return isString(value) && ["trace", "debug", "info", "warn", "error", "fatal"].includes(value);
};

// Error type guards

/**
 * Check if value is an IEnhancedError
 */
export const isEnhancedError = (value: unknown): value is IEnhancedError => {
  if (!isObject(value)) return false;

  return (
    "name" in value &&
    "message" in value &&
    "code" in value &&
    "context" in value &&
    "severity" in value &&
    "category" in value &&
    "recoverable" in value &&
    "retryable" in value
  );
};

/**
 * Check if value is an IErrorContext
 */
export const isErrorContext = (value: unknown): value is IErrorContext => {
  if (!isObject(value)) return false;

  return "timestamp" in value && "component" in value;
};

/**
 * Check if value is a valid ErrorSeverity
 */
export const isErrorSeverity = (value: unknown): value is ErrorSeverity => {
  return isString(value) && ["low", "medium", "high", "critical"].includes(value);
};

// Utility type guards

/**
 * Check if value has a property
 */
export const hasProperty = <K extends string>(obj: unknown, key: K): obj is Record<K, unknown> => {
  return isObject(obj) && key in obj;
};

/**
 * Check if value is a valid UUID (basic check)
 */
export const isUUID = (value: unknown): value is string => {
  if (!isString(value)) return false;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Check if value is a valid email (basic check)
 */
export const isEmail = (value: unknown): value is string => {
  if (!isString(value)) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

/**
 * Check if value is a valid URL
 */
export const isURL = (value: unknown): value is string => {
  if (!isString(value)) return false;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if value is a valid ISO timestamp
 */
export const isISOTimestamp = (value: unknown): value is string => {
  if (!isString(value)) return false;

  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString() === value;
};

/**
 * Check if value is a valid semantic version
 */
export const isSemVer = (value: unknown): value is string => {
  if (!isString(value)) return false;

  const semverRegex =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  return semverRegex.test(value);
};
