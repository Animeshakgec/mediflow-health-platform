import {
  ConnectionError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError as SequelizeValidationError,
} from 'sequelize';
import { AppError } from '../errors/AppError.js';
import { failureResponse } from '../utils/apiResponse.js';

function normalizeError(error) {
  if (error instanceof AppError) return error;

  if (error instanceof UniqueConstraintError) {
    return new AppError(
      409,
      'RESOURCE_CONFLICT',
      'The requested resource conflicts with existing data',
    );
  }

  if (error instanceof ForeignKeyConstraintError) {
    return new AppError(
      409,
      'RELATED_RESOURCE_CONFLICT',
      'A related resource prevents this operation',
    );
  }

  if (error instanceof SequelizeValidationError) {
    const errors = error.errors.map((item) => ({
      code: 'INVALID_FIELD',
      field: item.path,
      message: 'Invalid value',
    }));
    return new AppError(
      422,
      'PERSISTENCE_VALIDATION_FAILED',
      'The submitted data is invalid',
      errors,
    );
  }

  if (error instanceof ConnectionError) {
    return new AppError(
      503,
      'DEPENDENCY_UNAVAILABLE',
      'A required service is temporarily unavailable',
    );
  }

  if (error?.type === 'entity.parse.failed') {
    return new AppError(400, 'MALFORMED_JSON', 'The request body contains invalid JSON');
  }

  if (error?.type === 'entity.too.large') {
    return new AppError(413, 'REQUEST_TOO_LARGE', 'The request body exceeds the allowed size');
  }

  if (error?.status === 400 && error instanceof SyntaxError) {
    return new AppError(400, 'MALFORMED_REQUEST', 'The request could not be parsed');
  }

  return new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const normalized = normalizeError(error);
  const requestId = req.id ?? req.requestId ?? null;
  const logContext = {
    errorName: error?.name ?? 'Error',
    errorCode: normalized.code,
    requestId,
    statusCode: normalized.statusCode,
  };

  if (normalized.statusCode >= 500) req.log?.error(logContext, 'Request failed');
  else req.log?.warn(logContext, 'Request rejected');

  const errors = normalized.errors.length
    ? normalized.errors
    : [{ code: normalized.code, message: normalized.message }];

  return res.status(normalized.statusCode).json(
    failureResponse({
      message: normalized.message,
      errors,
      meta: requestId ? { requestId } : null,
    }),
  );
}
