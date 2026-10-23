import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/config/logger.js';

describe('GET /api/v1/health', () => {
  const logger = createLogger({ env: 'test' });

  it('returns a healthy response when PostgreSQL is reachable', async () => {
    const sequelize = { authenticate: async () => undefined };
    const response = await request(createApp({ sequelize, logger })).get('/api/v1/health');

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.include({
      success: true,
      message: 'MediFlow API is healthy',
    });
    expect(response.body.data).to.deep.equal({ status: 'UP', database: 'connected' });
    expect(response.body.meta.requestId).to.be.a('string');
    expect(response.headers['x-request-id']).to.equal(response.body.meta.requestId);
  });

  it('returns service unavailable when PostgreSQL cannot be reached', async () => {
    const sequelize = {
      authenticate: async () => {
        throw new Error('private connection details');
      },
    };
    const response = await request(createApp({ sequelize, logger })).get('/api/v1/health');

    expect(response.status).to.equal(503);
    expect(response.body.success).to.equal(false);
    expect(response.body.errors[0].code).to.equal('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.to.include('private connection details');
  });
});
