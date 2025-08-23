/**
 * Zod validation schemas for browser-specific platform types
 *
 * Runtime validation schemas for browser environment abstractions.
 */

import { z } from "zod";

// Browser info schema
export const browserInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  engine: z.string(),
  engineVersion: z.string(),
  userAgent: z.string(),
  vendor: z.string().optional(),
  platform: z.string(),
});

// Navigator info schema
export const navigatorInfoSchema = z.object({
  userAgent: z.string(),
  language: z.string(),
  languages: z.array(z.string()),
  platform: z.string(),
  cookieEnabled: z.boolean(),
  onLine: z.boolean(),
  hardwareConcurrency: z.number().optional(),
  maxTouchPoints: z.number().optional(),
  deviceMemory: z.number().optional(),
});

// Location info schema
export const locationInfoSchema = z.object({
  href: z.string(),
  origin: z.string(),
  protocol: z.string(),
  host: z.string(),
  hostname: z.string(),
  port: z.string(),
  pathname: z.string(),
  search: z.string(),
  hash: z.string(),
});

// Screen info schema
export const screenInfoSchema = z.object({
  width: z.number(),
  height: z.number(),
  availWidth: z.number(),
  availHeight: z.number(),
  colorDepth: z.number(),
  pixelDepth: z.number(),
  devicePixelRatio: z.number(),
  orientation: z
    .object({
      angle: z.number(),
      type: z.string(),
    })
    .optional(),
});

// Document info schema
export const documentInfoSchema = z.object({
  title: z.string(),
  url: z.string(),
  referrer: z.string(),
  domain: z.string(),
  readyState: z.enum(["loading", "interactive", "complete"]),
  visibilityState: z.enum(["visible", "hidden", "prerender"]),
  characterSet: z.string(),
});

// Window info schema
export const windowInfoSchema = z.object({
  innerWidth: z.number(),
  innerHeight: z.number(),
  outerWidth: z.number(),
  outerHeight: z.number(),
  screenX: z.number(),
  screenY: z.number(),
  devicePixelRatio: z.number(),
  isSecureContext: z.boolean(),
  crossOriginIsolated: z.boolean(),
});

// Type inference helpers
export type InferredBrowserInfo = z.infer<typeof browserInfoSchema>;
export type InferredNavigatorInfo = z.infer<typeof navigatorInfoSchema>;
export type InferredLocationInfo = z.infer<typeof locationInfoSchema>;
export type InferredScreenInfo = z.infer<typeof screenInfoSchema>;
export type InferredDocumentInfo = z.infer<typeof documentInfoSchema>;
export type InferredWindowInfo = z.infer<typeof windowInfoSchema>;

// Type guard functions for runtime validation
export const isBrowserInfo = (value: unknown): value is InferredBrowserInfo =>
  browserInfoSchema.safeParse(value).success;

export const isNavigatorInfo = (value: unknown): value is InferredNavigatorInfo =>
  navigatorInfoSchema.safeParse(value).success;

export const isLocationInfo = (value: unknown): value is InferredLocationInfo =>
  locationInfoSchema.safeParse(value).success;

export const isScreenInfo = (value: unknown): value is InferredScreenInfo => screenInfoSchema.safeParse(value).success;

export const isDocumentInfo = (value: unknown): value is InferredDocumentInfo =>
  documentInfoSchema.safeParse(value).success;

export const isWindowInfo = (value: unknown): value is InferredWindowInfo => windowInfoSchema.safeParse(value).success;

// Validation result helpers
export const parseBrowserInfo = (value: unknown) => browserInfoSchema.parse(value);
export const safeParseBrowserInfo = (value: unknown) => browserInfoSchema.safeParse(value);
export const parseNavigatorInfo = (value: unknown) => navigatorInfoSchema.parse(value);
export const safeParseNavigatorInfo = (value: unknown) => navigatorInfoSchema.safeParse(value);
export const parseLocationInfo = (value: unknown) => locationInfoSchema.parse(value);
export const safeParseLocationInfo = (value: unknown) => locationInfoSchema.safeParse(value);
export const parseScreenInfo = (value: unknown) => screenInfoSchema.parse(value);
export const safeParseScreenInfo = (value: unknown) => screenInfoSchema.safeParse(value);
export const parseDocumentInfo = (value: unknown) => documentInfoSchema.parse(value);
export const safeParseDocumentInfo = (value: unknown) => documentInfoSchema.safeParse(value);
export const parseWindowInfo = (value: unknown) => windowInfoSchema.parse(value);
export const safeParseWindowInfo = (value: unknown) => windowInfoSchema.safeParse(value);
