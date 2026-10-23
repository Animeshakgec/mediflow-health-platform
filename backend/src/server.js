import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createApp } from './app.js';
import {
  createDatabaseConnection,
  closeDatabaseConnection,
  testDatabaseConnection,
} from './config/database.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './config/logger.js';

export function createShutdownHandler({ server, sequelize, logger, onShutdown = () => {} }) {
  let shutdownPromise;

  return function shutdown(signal = 'shutdown') {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      logger.info({ signal }, 'Graceful shutdown started');
      let shutdownFailed = false;

      try {
        await new Promise((resolvePromise, rejectPromise) => {
          server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
        });
      } catch (error) {
        shutdownFailed = true;
        logger.error({ errorName: error?.name ?? 'Error' }, 'HTTP server shutdown failed');
      }

      try {
        await closeDatabaseConnection(sequelize);
      } catch (error) {
        shutdownFailed = true;
        logger.error({ errorName: error?.name ?? 'Error' }, 'Database shutdown failed');
      }

      if (shutdownFailed) process.exitCode = 1;
      logger.info('Graceful shutdown completed');
      onShutdown();
    })();

    return shutdownPromise;
  };
}

export async function startServer({ env = loadEnv(), sequelize, logger, app } = {}) {
  const runtimeLogger = logger ?? createLogger({ env: env.NODE_ENV, level: env.LOG_LEVEL });
  const database = sequelize ?? createDatabaseConnection(env, runtimeLogger);

  try {
    await testDatabaseConnection(database);
  } catch (error) {
    runtimeLogger.fatal(
      { errorName: error?.name ?? 'Error' },
      'Database connection failed at startup',
    );
    try {
      await closeDatabaseConnection(database);
    } catch {
      // Preserve the original startup failure while attempting to clean up.
    }
    throw new Error(
      'Unable to connect to PostgreSQL. Check database availability and configuration.',
    );
  }

  const expressApp =
    app ??
    createApp({
      sequelize: database,
      logger: runtimeLogger,
      apiPrefix: env.API_PREFIX,
      corsOrigins: env.CORS_ORIGIN,
      jsonBodyLimit: env.JSON_BODY_LIMIT,
    });

  const server = expressApp.listen(env.PORT);
  try {
    await new Promise((resolvePromise, rejectPromise) => {
      server.once('listening', resolvePromise);
      server.once('error', rejectPromise);
    });
  } catch (error) {
    runtimeLogger.fatal({ errorName: error?.name ?? 'Error' }, 'HTTP server failed to start');
    await closeDatabaseConnection(database).catch(() => {});
    throw error;
  }

  runtimeLogger.info({ port: env.PORT, apiPrefix: env.API_PREFIX }, 'MediFlow API started');
  const shutdown = createShutdownHandler({ server, sequelize: database, logger: runtimeLogger });
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  return { app: expressApp, server, sequelize: database, logger: runtimeLogger, shutdown };
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  startServer().catch((error) => {
    const message = error?.message ?? 'Unknown startup error';
    process.stderr.write(`MediFlow startup failed: ${message}\n`);
    process.exitCode = 1;
  });
}
