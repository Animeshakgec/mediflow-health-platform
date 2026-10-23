import { Router } from 'express';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { sendSuccess } from '../../common/utils/apiResponse.js';

export function createHealthRouter(sequelize) {
  const router = Router();

  router.get(
    '/health',
    asyncHandler(async (_req, res) => {
      if (!sequelize) {
        throw new AppError(503, 'SERVICE_UNAVAILABLE', 'The database is temporarily unavailable');
      }

      try {
        await sequelize.authenticate();
      } catch {
        throw new AppError(503, 'SERVICE_UNAVAILABLE', 'The database is temporarily unavailable');
      }

      return sendSuccess(res, {
        message: 'MediFlow API is healthy',
        data: {
          status: 'UP',
          database: 'connected',
        },
        meta: res.getHeader('X-Request-Id') ? { requestId: res.getHeader('X-Request-Id') } : null,
      });
    }),
  );

  return router;
}
