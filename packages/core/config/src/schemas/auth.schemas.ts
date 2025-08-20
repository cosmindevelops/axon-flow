/**
 * Authentication and JWT configuration schema
 */

import { z } from "zod";

/**
 * JWT token configuration
 */
const JWT_CONFIG_SCHEMA = z.object({
  secret: z.string().min(32).describe("JWT secret key (min 32 chars)"),
  algorithm: z
    .enum(["HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "ES256", "ES384", "ES512"])
    .default("HS256")
    .describe("JWT signing algorithm"),
  issuer: z.string().default("axon-flow").describe("JWT issuer"),
  audience: z.string().or(z.array(z.string())).optional().describe("JWT audience"),
  publicKey: z.string().optional().describe("Public key for asymmetric algorithms"),
  privateKey: z.string().optional().describe("Private key for asymmetric algorithms"),
  passphrase: z.string().optional().describe("Passphrase for encrypted private key"),
});

/**
 * Access token configuration
 */
const ACCESS_TOKEN_SCHEMA = z.object({
  expiresIn: z.string().default("15m").describe("Access token expiration (e.g., '15m', '1h', '7d')"),
  expiresInSeconds: z.coerce.number().min(1).default(900).describe("Access token expiration in seconds"),
  includeRefreshToken: z.boolean().default(true).describe("Include refresh token in response"),
  maxAge: z.coerce.number().min(0).optional().describe("Maximum token age in seconds"),
});

/**
 * Refresh token configuration
 */
const REFRESH_TOKEN_SCHEMA = z.object({
  enabled: z.boolean().default(true).describe("Enable refresh tokens"),
  expiresIn: z.string().default("7d").describe("Refresh token expiration (e.g., '7d', '30d')"),
  expiresInSeconds: z.coerce.number().min(1).default(604800).describe("Refresh token expiration in seconds"),
  rotateOnUse: z.boolean().default(true).describe("Rotate refresh token on use"),
  revokeOnRotation: z.boolean().default(true).describe("Revoke old token on rotation"),
  maxTokensPerUser: z.coerce.number().int().min(1).default(5).describe("Max refresh tokens per user"),
});

/**
 * CORS configuration
 */
const CORS_CONFIG_SCHEMA = z.object({
  enabled: z.boolean().default(true).describe("Enable CORS"),
  origins: z.array(z.string()).or(z.literal("*")).default(["http://localhost:3000"]).describe("Allowed origins"),
  methods: z
    .array(z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]))
    .default(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
    .describe("Allowed HTTP methods"),
  headers: z
    .array(z.string())
    .default(["Content-Type", "Authorization", "X-Correlation-Id"])
    .describe("Allowed headers"),
  exposedHeaders: z.array(z.string()).default(["X-Total-Count"]).describe("Exposed headers"),
  credentials: z.boolean().default(true).describe("Allow credentials"),
  maxAge: z.coerce.number().min(0).default(86400).describe("Preflight cache duration in seconds"),
  optionsSuccessStatus: z.coerce.number().int().min(100).max(599).default(204).describe("OPTIONS success status"),
});

/**
 * Session configuration
 */
const SESSION_CONFIG_SCHEMA = z.object({
  enabled: z.boolean().default(true).describe("Enable session management"),
  secret: z.string().min(32).describe("Session secret key"),
  name: z.string().default("axon-session").describe("Session cookie name"),
  resave: z.boolean().default(false).describe("Force session save"),
  saveUninitialized: z.boolean().default(false).describe("Save uninitialized sessions"),
  rolling: z.boolean().default(true).describe("Reset expiration on activity"),
  cookie: z.object({
    secure: z.boolean().default(false).describe("HTTPS only cookies"),
    httpOnly: z.boolean().default(true).describe("HTTP only cookies"),
    sameSite: z.enum(["strict", "lax", "none"]).or(z.boolean()).default("lax").describe("SameSite attribute"),
    maxAge: z.coerce.number().min(0).default(86400000).describe("Cookie max age in milliseconds"),
    domain: z.string().optional().describe("Cookie domain"),
    path: z.string().default("/").describe("Cookie path"),
  }),
  ttl: z.coerce.number().min(0).default(86400).describe("Session TTL in seconds"),
  touchAfter: z.coerce.number().min(0).default(300).describe("Touch session after seconds"),
});

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_SCHEMA = z.object({
  enabled: z.boolean().default(true).describe("Enable rate limiting"),
  windowMs: z.coerce.number().min(1).default(900000).describe("Rate limit window in milliseconds (15 min)"),
  max: z.coerce.number().int().min(1).default(100).describe("Max requests per window"),
  message: z.string().default("Too many requests").describe("Rate limit error message"),
  statusCode: z.coerce.number().int().min(100).max(599).default(429).describe("Rate limit status code"),
  headers: z.boolean().default(true).describe("Include rate limit headers"),
  skipSuccessfulRequests: z.boolean().default(false).describe("Skip successful requests"),
  skipFailedRequests: z.boolean().default(false).describe("Skip failed requests"),
  keyGenerator: z
    .function(z.tuple([z.unknown()]), z.string())
    .optional()
    .describe("Custom key generator"),
  skip: z.function().args(z.unknown()).returns(z.boolean()).optional().describe("Skip function"),
});

/**
 * Password policy configuration
 */
const PASSWORD_POLICY_SCHEMA = z.object({
  minLength: z.coerce.number().int().min(1).default(8).describe("Minimum password length"),
  maxLength: z.coerce.number().int().min(1).default(128).describe("Maximum password length"),
  requireUppercase: z.boolean().default(true).describe("Require uppercase letters"),
  requireLowercase: z.boolean().default(true).describe("Require lowercase letters"),
  requireNumbers: z.boolean().default(true).describe("Require numbers"),
  requireSpecialChars: z.boolean().default(true).describe("Require special characters"),
  specialChars: z.string().default("!@#$%^&*()_+-=[]{}|;:,.<>?").describe("Allowed special characters"),
  preventCommon: z.boolean().default(true).describe("Prevent common passwords"),
  preventReuse: z.coerce.number().int().min(0).default(5).describe("Prevent reuse of last N passwords"),
  expirationDays: z.coerce.number().int().min(0).default(90).describe("Password expiration in days (0 = no expiry)"),
});

/**
 * Main authentication configuration schema
 */
export const AUTH_CONFIG_SCHEMA = z.object({
  jwt: JWT_CONFIG_SCHEMA,
  accessToken: ACCESS_TOKEN_SCHEMA.default({}),
  refreshToken: REFRESH_TOKEN_SCHEMA.default({}),
  cors: CORS_CONFIG_SCHEMA.default({}),
  session: SESSION_CONFIG_SCHEMA.optional(),
  rateLimit: RATE_LIMIT_SCHEMA.default({}),
  passwordPolicy: PASSWORD_POLICY_SCHEMA.default({}),
  bcryptRounds: z.coerce.number().int().min(4).max(31).default(10).describe("Bcrypt hashing rounds"),
  maxLoginAttempts: z.coerce.number().int().min(1).default(5).describe("Max login attempts before lockout"),
  lockoutDuration: z.coerce.number().min(0).default(900000).describe("Lockout duration in milliseconds (15 min)"),
  trustProxy: z.boolean().or(z.string()).or(z.number()).default(false).describe("Trust proxy settings"),
  secure: z.boolean().default(false).describe("Force HTTPS in production"),
});

/**
 * Environment-specific auth configurations
 */
export const ENVIRONMENT_AUTH_SCHEMA = z.discriminatedUnion("environment", [
  z.object({
    environment: z.literal("development"),
    auth: AUTH_CONFIG_SCHEMA.extend({
      cors: CORS_CONFIG_SCHEMA.extend({
        origins: z.array(z.string()).or(z.literal("*")).default(["*"]),
      }).default({}),
      secure: z.boolean().default(false),
      rateLimit: RATE_LIMIT_SCHEMA.extend({
        enabled: z.boolean().default(false),
      }).default({}),
    }),
  }),
  z.object({
    environment: z.literal("staging"),
    auth: AUTH_CONFIG_SCHEMA.extend({
      cors: CORS_CONFIG_SCHEMA.extend({
        origins: z.array(z.string()).default(["https://staging.axon-flow.com"]),
      }).default({}),
      secure: z.boolean().default(true),
      rateLimit: RATE_LIMIT_SCHEMA.extend({
        max: z.coerce.number().default(50),
      }).default({}),
    }),
  }),
  z.object({
    environment: z.literal("production"),
    auth: AUTH_CONFIG_SCHEMA.extend({
      cors: CORS_CONFIG_SCHEMA.extend({
        origins: z.array(z.string()).default(["https://axon-flow.com", "https://www.axon-flow.com"]),
        credentials: z.boolean().default(true),
      }).default({}),
      secure: z.boolean().default(true),
      session: SESSION_CONFIG_SCHEMA.extend({
        cookie: z.object({
          secure: z.boolean().default(true),
          httpOnly: z.boolean().default(true),
          sameSite: z.enum(["strict", "lax", "none"]).or(z.boolean()).default("strict"),
          maxAge: z.coerce.number().default(86400000),
          domain: z.string().optional(),
          path: z.string().default("/"),
        }),
      }).optional(),
      rateLimit: RATE_LIMIT_SCHEMA.extend({
        max: z.coerce.number().default(30),
        windowMs: z.coerce.number().default(600000), // 10 minutes
      }).default({}),
      bcryptRounds: z.coerce.number().default(12),
      maxLoginAttempts: z.coerce.number().default(3),
      lockoutDuration: z.coerce.number().default(1800000), // 30 minutes
    }),
  }),
]);

/**
 * Type exports for auth configuration
 */
export type AuthConfig = z.infer<typeof AUTH_CONFIG_SCHEMA>;
export type JWTConfig = z.infer<typeof JWT_CONFIG_SCHEMA>;
export type AccessTokenConfig = z.infer<typeof ACCESS_TOKEN_SCHEMA>;
export type RefreshTokenConfig = z.infer<typeof REFRESH_TOKEN_SCHEMA>;
export type CORSConfig = z.infer<typeof CORS_CONFIG_SCHEMA>;
export type SessionConfig = z.infer<typeof SESSION_CONFIG_SCHEMA>;
export type RateLimitConfig = z.infer<typeof RATE_LIMIT_SCHEMA>;
export type PasswordPolicyConfig = z.infer<typeof PASSWORD_POLICY_SCHEMA>;
