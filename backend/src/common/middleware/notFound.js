import { AppError } from '../errors/AppError.js';

export function notFound(_req, _res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'The requested route was not found'));
}
