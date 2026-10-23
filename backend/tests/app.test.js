import { expect } from 'chai';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { AppError } from '../src/common/errors/AppError.js';
import { asyncHandler } from '../src/common/utils/asyncHandler.js';
import { validateRequest } from '../src/common/middleware/validateRequest.js';
import { createLogger } from '../src/config/logger.js';

describe('Express API foundation', () => {
  const logger = createLogger({ env: 'test' });

  it('returns a standardized 404 response for unknown API routes', async () => {
    const response = await request(createApp({ logger })).get('/api/v1/not-a-route');

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.include({
      success: false,
      message: 'The requested route was not found',
    });
    expect(response.body.errors[0].code).to.equal('ROUTE_NOT_FOUND');
    expect(response.body.meta.requestId).to.be.a('string');
  });

  it('returns a safe standardized error response for application errors', async () => {
    const errorRoutes = express.Router();
    errorRoutes.get(
      '/test-error',
      asyncHandler(async () => {
        throw new AppError(
          409,
          'TEST_CONFLICT',
          'The requested change conflicts with current state',
        );
      }),
    );
    const response = await request(createApp({ logger, apiRouters: [errorRoutes] })).get(
      '/api/v1/test-error',
    );

    expect(response.status).to.equal(409);
    expect(response.body.success).to.equal(false);
    expect(response.body.errors[0].code).to.equal('TEST_CONFLICT');
    expect(response.body).not.to.have.property('stack');
  });

  it('validates body, route parameters, and query through shared middleware', async () => {
    const validationRoutes = express.Router();
    validationRoutes.post(
      '/validated/:id',
      validateRequest({
        params: z.object({ id: z.string().uuid() }),
        query: z.object({ page: z.coerce.number().int().positive() }),
        body: z.object({ displayName: z.string().min(1) }),
      }),
      (req, res) => res.json({ data: req.validated }),
    );
    const response = await request(createApp({ logger, apiRouters: [validationRoutes] }))
      .post('/api/v1/validated/9c47022d-8c49-47db-b574-c0064b8c325d?page=2')
      .send({ displayName: 'Test Patient' });

    expect(response.status).to.equal(200);
    expect(response.body.data.params.id).to.equal('9c47022d-8c49-47db-b574-c0064b8c325d');
    expect(response.body.data.query.page).to.equal(2);
    expect(response.body.data.body.displayName).to.equal('Test Patient');
  });

  it('serves the reusable OpenAPI description and Swagger UI', async () => {
    const app = createApp({ logger });
    const spec = await request(app).get('/api-docs.json');
    const ui = await request(app).get('/api-docs/');

    expect(spec.status).to.equal(200);
    expect(spec.body.openapi).to.match(/^3\./);
    expect(spec.body.paths).to.have.property('/api/v1/health');
    expect(ui.status).to.equal(200);
    expect(ui.text).to.include('swagger-ui');
  });
});
