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
