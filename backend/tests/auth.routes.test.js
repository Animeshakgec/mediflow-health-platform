import { expect } from 'chai';
import express, { Router } from 'express';
import request from 'supertest';
import { AppError } from '../src/common/errors/AppError.js';
import { requireRoles, requireTenantMembership } from '../src/common/middleware/authenticate.js';
import { createLogger } from '../src/config/logger.js';
import { createApp } from '../src/app.js';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';

const config = {
  jwtAccessSecret: 'test-only-secret-with-at-least-32-characters',
  jwtIssuer: 'mediflow-test',
  jwtAudience: 'mediflow-test-clients',
  accessTtlSeconds: 900,
  refreshTtlSeconds: 3600,
  cookieName: 'mediflow_refresh',
  cookieSameSite: 'lax',
  cookieSecure: false,
  rateLimitWindowMs: 60_000,
  rateLimitMax: 100,
};

describe('authentication API routes', function () {
  let app;
  let service;

  beforeEach(() => {
    service = {
      register: async () => ({
        user: {
          id: 'user-1',
          name: 'Example Patient',
          email: 'patient@example.test',
          roles: ['PATIENT'],
        },
        accessToken: 'access-token',
        refreshToken: 'opaque-refresh-secret',
        refreshExpiresAt: new Date(Date.now() + 3600_000),
      }),
      login: async () => {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
      },
      refresh: async (token) => {
        if (token !== 'opaque-refresh-secret')
          throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'A valid refresh session is required');
        return {
          accessToken: 'rotated-access-token',
          refreshToken: 'rotated-refresh-secret',
          refreshExpiresAt: new Date(Date.now() + 1800_000),
        };
      },
      revokeRefreshToken: async () => {},
      verifyAccessToken: async (token) => {
        if (token !== 'access-token')
          throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Authentication is required');
        return {
          user: { id: 'user-1', name: 'Example Patient', email: 'patient@example.test' },
          session: {},
        };
      },
      publicUser: async (user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        roles: ['PATIENT'],
      }),
      changePassword: async () => {},
      hasRole: async () => false,
    };
    const authRouter = createAuthRouter({
      sequelize: {},
      config,
      corsOrigins: ['http://localhost:5173'],
      authService: service,
    });
    app = createApp({ logger: createLogger({ env: 'test' }), apiRouters: [authRouter] });
  });

  it('registers with a refresh cookie and never returns the refresh token or password hash', async function () {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Example Patient',
        email: 'Patient@Example.test',
        password: 'a-long-example-password',
      })
      .expect(201);
    expect(response.body.data.user.roles).to.deep.equal(['PATIENT']);
    expect(response.body.data).not.to.have.property('refreshToken');
    expect(response.body.data.user).not.to.have.property('passwordHash');
    expect(response.headers['set-cookie'][0]).to.include('HttpOnly');
    expect(response.headers['set-cookie'][0]).to.include('SameSite=Lax');
    expect(response.headers['cache-control']).to.equal('no-store');
  });

  it('rejects unknown registration properties and returns a non-enumerating login error', async function () {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Example Patient',
        email: 'patient@example.test',
        password: 'a-long-example-password',
        role: 'SUPER_ADMIN',
      })
      .expect(422);
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'missing@example.test', password: 'wrong-password' })
      .expect(401);
    expect(response.body.errors[0].code).to.equal('INVALID_CREDENTIALS');
    expect(response.body.message).not.to.include('missing@example.test');
  });

  it('returns a conflict when registration detects a duplicate email', async function () {
    service.register = async () => {
      throw new AppError(
        409,
        'RESOURCE_CONFLICT',
        'The requested resource conflicts with existing data',
      );
    };
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Example Patient',
        email: 'patient@example.test',
        password: 'a-long-example-password',
      })
      .expect(409);
    expect(response.body.errors[0].code).to.equal('RESOURCE_CONFLICT');
  });

  it('requires a valid bearer access token for the current-user endpoint', async function () {
    await request(app).get('/api/v1/auth/me').expect(401);
    await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer bad-token').expect(401);
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer access-token')
      .expect(200);
    expect(response.body.data.user.id).to.equal('user-1');
    expect(response.body.data.user).not.to.have.property('passwordHash');
  });

  it('rotates and clears the refresh cookie without returning its value in JSON', async function () {
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'mediflow_refresh=opaque-refresh-secret')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(response.body.data.accessToken).to.equal('rotated-access-token');
    expect(JSON.stringify(response.body)).not.to.include('rotated-refresh-secret');
    expect(response.headers['set-cookie'][0]).to.include('rotated-refresh-secret');
    await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', 'mediflow_refresh=opaque-refresh-secret')
      .expect(200);
  });

  it('denies roles not assigned to the authenticated user', async function () {
    const router = Router();
    router.get(
      '/role-check',
      (_req, _res, next) => {
        next();
      },
      (req, _res, next) => {
        req.user = { id: 'user-1' };
        next();
      },
      requireRoles(service, 'SUPER_ADMIN'),
      (_req, res) => res.sendStatus(204),
    );
    const roleApp = express();
    roleApp.use(router);
    roleApp.use((error, _req, res, _next) =>
      res.status(error.statusCode ?? 500).json({ code: error.code }),
    );
    await request(roleApp).get('/role-check').expect(403);
  });

  it('rejects tenant context without an active membership', async function () {
    const router = Router();
    router.use((req, _res, next) => {
      req.user = { id: 'user-1' };
      next();
    });
    router.get(
      '/tenant-check',
      requireTenantMembership({ models: { Membership: { findOne: async () => null } } }),
      (_req, res) => res.sendStatus(204),
    );
    const tenantApp = express();
    tenantApp.use(router);
    tenantApp.use((error, _req, res, _next) =>
      res.status(error.statusCode ?? 500).json({ code: error.code }),
    );
    await request(tenantApp)
      .get('/tenant-check')
      .set('x-tenant-id', 'untrusted-tenant')
      .expect(404);
  });
});
