import { AppError } from '../errors/AppError.js';

const requestParts = ['body', 'params', 'query'];

export function validateRequest(schemas) {
  return function requestValidationMiddleware(req, _res, next) {
    const validated = {};

    for (const part of requestParts) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          code: 'INVALID_FIELD',
          field: [part, ...issue.path].join('.'),
          message: issue.message,
        }));
        return next(new AppError(422, 'VALIDATION_FAILED', 'Request validation failed', errors));
      }

      validated[part] = result.data;
    }

    req.validated = { ...req.validated, ...validated };
    return next();
  };
}
