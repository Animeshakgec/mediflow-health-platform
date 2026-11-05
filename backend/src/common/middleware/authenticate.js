import { AppError } from '../errors/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function authenticate(authService) {
  return asyncHandler(async (req, _res, next) => {
    const authorization = req.get('authorization') ?? '';
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
    req.auth = await authService.verifyAccessToken(match[1]);
    req.user = req.auth.user;
    return next();
  });
}

export function requireRoles(authService, ...roleCodes) {
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
    const allowed = await authService.hasRole(req.user.id, roleCodes, req.tenantId ?? null);
    if (!allowed)
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action');
    return next();
  });
}

export function requirePermission(authService, permissionCode) {
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
    const allowed = await authService.hasPermission(
      req.user.id,
      permissionCode,
      req.tenantId ?? null,
    );
    if (!allowed)
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action');
    return next();
  });
}

export function requireTenantMembership(
  sequelize,
  { tenantParam = 'tenantId', tenantHeader = 'x-tenant-id' } = {},
) {
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
    const tenantId = req.params[tenantParam] ?? req.get(tenantHeader);
    if (!tenantId)
      throw new AppError(400, 'TENANT_CONTEXT_REQUIRED', 'A hospital context is required');
    const membership = await sequelize.models.Membership.findOne({
      where: { userId: req.user.id, tenantId, status: 'ACTIVE' },
    });
    if (!membership)
      throw new AppError(404, 'TENANT_NOT_FOUND', 'The requested hospital context is unavailable');
    req.tenantId = membership.tenantId;
    req.membership = membership;
    return next();
  });
}
