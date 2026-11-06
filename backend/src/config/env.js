import dotenv from 'dotenv';
import { z } from 'zod';

const booleanFromString = z.preprocess((value) => {
  if (value === undefined || value === '') return false;
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z
    .string()
    .trim()
    .regex(
      /^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+$/,
      'must be an absolute path without a trailing slash',
    )
    .default('/api/v1'),
  DATABASE_URL: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  DB_HOST: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  DB_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  DB_NAME: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  DB_USER: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  DB_PASSWORD: z.string().optional().default(''),
  DB_LOGGING: booleanFromString,
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173,http://localhost:5174')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  JSON_BODY_LIMIT: z.string().trim().min(1).default('1mb'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'must contain at least 32 characters')
    .default('development-only-change-this-secret-before-use'),
  JWT_ISSUER: z.string().trim().min(1).default('mediflow-api'),
  JWT_AUDIENCE: z.string().trim().min(1).default('mediflow-clients'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  AUTH_REFRESH_TTL_SECONDS: z.coerce.number().int().min(3600).max(2_592_000).default(2_592_000),
  AUTH_COOKIE_NAME: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,64}$/)
    .default('mediflow_refresh'),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict']).default('lax'),
  AUTH_COOKIE_SECURE: booleanFromString,
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(10),
});

export class ConfigurationError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'ConfigurationError';
  }
}

export function loadEnv(source = process.env, { loadDotEnv = source === process.env } = {}) {
  if (loadDotEnv) dotenv.config();

  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new ConfigurationError(`Invalid environment configuration: ${issues.join('; ')}`);
  }

  const env = parsed.data;
  if (env.NODE_ENV === 'production' && !env.AUTH_COOKIE_SECURE) {
    throw new ConfigurationError('AUTH_COOKIE_SECURE must be enabled in production.');
  }
  if (
    env.NODE_ENV === 'production' &&
    env.JWT_ACCESS_SECRET === 'development-only-change-this-secret-before-use'
  ) {
    throw new ConfigurationError('JWT_ACCESS_SECRET must be set to a unique production secret.');
  }
  if (env.NODE_ENV === 'production' && env.DB_LOGGING) {
    throw new ConfigurationError('DB_LOGGING must be disabled in production.');
  }
  const hasIndividualDatabaseConfig = Boolean(env.DB_HOST || env.DB_NAME || env.DB_USER);
  if (env.DATABASE_URL && hasIndividualDatabaseConfig) {
    throw new ConfigurationError('Set DATABASE_URL or individual DB_* values, not both.');
  }

  if (env.DATABASE_URL) {
    try {
      const databaseUrl = new URL(env.DATABASE_URL);
      if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
        throw new Error('Unsupported database protocol.');
      }
    } catch {
      throw new ConfigurationError('DATABASE_URL must be a valid PostgreSQL connection URL.');
    }
  } else if (!env.DB_HOST || !env.DB_NAME || !env.DB_USER) {
    throw new ConfigurationError(
      'Configure DATABASE_URL or provide DB_HOST, DB_NAME, and DB_USER.',
    );
  }

  return {
    ...env,
    DB_PORT: env.DB_PORT ?? 5432,
  };
}
