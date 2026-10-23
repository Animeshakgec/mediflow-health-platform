import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { createOpenApiSpec } from './config/swagger.js';
import { errorHandler } from './common/middleware/errorHandler.js';
import { notFound } from './common/middleware/notFound.js';
import { createRequestLogger } from './common/middleware/requestLogger.js';
import { AppError } from './common/errors/AppError.js';
import { createLogger } from './config/logger.js';
import { createHealthRouter } from './modules/health/health.routes.js';

export function createApp({
  sequelize = null,
  logger = createLogger(),
  apiPrefix = '/api/v1',
  corsOrigins = ['http://localhost:5173', 'http://localhost:5174'],
  jsonBodyLimit = '1mb',
  apiRouters = [],
} = {}) {
  const app = express();
  const openApiSpec = createOpenApiSpec(apiPrefix);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) return callback(null, true);
        return callback(new AppError(403, 'CORS_ORIGIN_DENIED', 'This origin is not allowed'));
      },
      credentials: true,
    }),
  );
  app.use(createRequestLogger(logger));
  app.use(express.json({ limit: jsonBodyLimit }));

  app.get('/api-docs.json', (_req, res) => res.json(openApiSpec));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use(apiPrefix, createHealthRouter(sequelize));
  for (const router of apiRouters) app.use(apiPrefix, router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
