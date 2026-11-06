import { sendSuccess } from '../../common/utils/apiResponse.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';

export function createAuthController({ authService, cookieOptions, cookieName }) {
  const setRefreshCookie = (res, token, expiresAt) =>
    res.cookie(cookieName, token, {
      ...cookieOptions,
      maxAge: expiresAt
        ? Math.max(0, new Date(expiresAt).getTime() - Date.now())
        : cookieOptions.maxAge,
    });
  const clearRefreshCookie = (res) =>
    res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });

  return {
    register: asyncHandler(async (req, res) => {
      const result = await authService.register(req.validated.body);
      setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
      res.set('Cache-Control', 'no-store');
      return sendSuccess(res, {
        statusCode: 201,
        message: 'Account created',
        data: { user: result.user, accessToken: result.accessToken },
      });
    }),
    login: asyncHandler(async (req, res) => {
      const result = await authService.login(req.validated.body);
      setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
      res.set('Cache-Control', 'no-store');
      return sendSuccess(res, {
        message: 'Signed in',
        data: { user: result.user, accessToken: result.accessToken },
      });
    }),
    refresh: asyncHandler(async (req, res) => {
      const result = await authService.refresh(req.cookies?.[cookieName]);
      setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
      res.set('Cache-Control', 'no-store');
      return sendSuccess(res, {
        message: 'Session refreshed',
        data: { accessToken: result.accessToken },
      });
    }),
    logout: asyncHandler(async (req, res) => {
      await authService.revokeRefreshToken(req.cookies?.[cookieName]);
      clearRefreshCookie(res);
      res.set('Cache-Control', 'no-store');
      return sendSuccess(res, { message: 'Signed out', data: null });
    }),
    me: asyncHandler(async (req, res) => {
      const user = await authService.publicUser(req.user);
      res.set('Cache-Control', 'no-store');
      return sendSuccess(res, { data: { user } });
    }),
    changePassword: asyncHandler(async (req, res) => {
      await authService.changePassword(
        req.user,
        req.validated.body.currentPassword,
        req.validated.body.newPassword,
      );
      clearRefreshCookie(res);
      res.set('Cache-Control', 'no-store');
      return sendSuccess(res, {
        message: 'Password changed. Sign in again to continue.',
        data: null,
      });
    }),
  };
}
