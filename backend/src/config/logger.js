import pino from 'pino';

const redactedPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.set-cookie',
  'req.headers.x-api-key',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.accessToken',
  'req.body.medicalRecord',
  'req.body.clinicalNotes',
  'req.body.diagnosis',
  'req.body.prescription',
  'DATABASE_URL',
  'DB_PASSWORD',
];

export function createLogger({ env = 'development', level = 'info' } = {}) {
  const options = {
    level: env === 'test' ? 'silent' : level,
    redact: {
      paths: redactedPaths,
      censor: '[REDACTED]',
    },
    messageKey: 'message',
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (env === 'development') {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }

  return pino(options);
}
