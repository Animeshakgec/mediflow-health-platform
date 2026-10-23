import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';

const requestIdPattern = /^[A-Za-z0-9._-]{1,128}$/;

export function createRequestLogger(logger) {
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const suppliedId = req.headers['x-request-id'];
      const requestId =
        typeof suppliedId === 'string' && requestIdPattern.test(suppliedId)
          ? suppliedId
          : randomUUID();
      res.setHeader('X-Request-Id', requestId);
      return requestId;
    },
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage(req, res) {
      return `${req.method} ${req.url.split('?')[0]} completed with ${res.statusCode}`;
    },
    customErrorMessage(req, res, err) {
      const errorType = err?.name ?? 'request error';
      return `${req.method} ${req.url.split('?')[0]} failed with ${res.statusCode} (${errorType})`;
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url.split('?')[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers.set-cookie',
        'req.headers.x-api-key',
        'req.body.password',
        'req.body.token',
      ],
      censor: '[REDACTED]',
    },
  });
}
