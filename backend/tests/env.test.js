import { expect } from 'chai';
import { ConfigurationError, loadEnv } from '../src/config/env.js';

describe('Environment configuration', () => {
  it('accepts an individual PostgreSQL configuration', () => {
    const env = loadEnv(
      {
        NODE_ENV: 'test',
        DB_HOST: 'localhost',
        DB_NAME: 'mediflow_test',
        DB_USER: 'test_user',
        DB_PASSWORD: '',
      },
      { loadDotEnv: false },
    );

    expect(env.DB_PORT).to.equal(5432);
    expect(env.API_PREFIX).to.equal('/api/v1');
    expect(env.CORS_ORIGIN).to.include('http://localhost:5173');
  });

  it('accepts a PostgreSQL DATABASE_URL', () => {
    const env = loadEnv(
      { DATABASE_URL: 'postgres://test:test@localhost:5432/mediflow_test' },
      {
        loadDotEnv: false,
      },
    );

    expect(env.DATABASE_URL).to.equal('postgres://test:test@localhost:5432/mediflow_test');
  });

  it('fails fast when database configuration is missing or ambiguous', () => {
    expect(() => loadEnv({}, { loadDotEnv: false })).to.throw(ConfigurationError);
    expect(() =>
      loadEnv(
        {
          DATABASE_URL: 'postgres://test:test@localhost:5432/mediflow_test',
          DB_HOST: 'localhost',
          DB_NAME: 'mediflow_test',
          DB_USER: 'test',
        },
        { loadDotEnv: false },
      ),
    ).to.throw(ConfigurationError);
  });

  it('rejects malformed boolean configuration and SQL logging in production', () => {
    expect(() =>
      loadEnv(
        {
          DB_HOST: 'localhost',
          DB_NAME: 'mediflow_test',
          DB_USER: 'test_user',
          DB_LOGGING: 'sometimes',
        },
        { loadDotEnv: false },
      ),
    ).to.throw(ConfigurationError);
    expect(() =>
      loadEnv(
        {
          NODE_ENV: 'production',
          DB_HOST: 'db.internal',
          DB_NAME: 'mediflow',
          DB_USER: 'app',
          DB_LOGGING: 'true',
        },
        { loadDotEnv: false },
      ),
    ).to.throw(ConfigurationError);
  });
});
