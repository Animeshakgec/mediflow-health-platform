import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../../common/errors/AppError.js';
import { authenticate } from '../../common/middleware/authenticate.js';
import { validateRequest } from '../../common/middleware/validateRequest.js';
import { createAuthService } from './auth.service.js';
import { changePasswordSchema, loginSchema, registerSchema } from './auth.schemas.js';
import { createAuthController } from './auth.controller.js';

export function createAuthRouter({
  sequelize,
  config,
  apiPrefix = '/api/v1',
  corsOrigins = [],
  logger = null,
  authService: providedAuthService = null,
}) {
  const router = Router();
  const authService = providedAuthService ?? createAuthService({ sequelize, config, logger });
  const controller = createAuthController({
    authService,
    cookieName: config.cookieName,
    cookieOptions: {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      path: `${apiPrefix}/auth`,
      maxAge: config.refreshTtlSeconds * 1000,
    },
  });
  const limit = rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Too many authentication requests')),
  });
  const verifyOrigin = (req, _res, next) => {
    const origin = req.get('origin');
    if (origin && !corsOrigins.includes(origin))
      return next(new AppError(403, 'CSRF_ORIGIN_DENIED', 'This origin is not allowed'));
    return next();
  };

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.post(
    '/auth/register',
    limit,
    validateRequest({ body: registerSchema }),
    controller.register,
  );
  router.post('/auth/login', limit, validateRequest({ body: loginSchema }), controller.login);
  router.post('/auth/refresh', limit, verifyOrigin, controller.refresh);
  router.post('/auth/logout', verifyOrigin, controller.logout);
  router.get('/auth/me', authenticate(authService), controller.me);
  router.patch(
    '/auth/change-password',
    limit,
    authenticate(authService),
    validateRequest({ body: changePasswordSchema }),
    controller.changePassword,
  );

  router.authService = authService;
  return router;
}
