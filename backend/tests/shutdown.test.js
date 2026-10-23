import { expect } from 'chai';
import { createShutdownHandler } from '../src/server.js';

describe('Graceful shutdown', () => {
  it('closes the HTTP server and database once when a signal is handled', async () => {
    const calls = [];
    const server = {
      close(callback) {
        calls.push('server');
        callback();
      },
    };
    const sequelize = {
      async close() {
        calls.push('database');
      },
    };
    const logger = { info() {}, error() {} };
    const shutdown = createShutdownHandler({ server, sequelize, logger });

    await Promise.all([shutdown('SIGINT'), shutdown('SIGTERM')]);

    expect(calls).to.deep.equal(['server', 'database']);
  });
});
