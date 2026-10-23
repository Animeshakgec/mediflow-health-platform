export function successResponse({
  message = 'Request completed successfully',
  data = null,
  meta = null,
}) {
  return {
    success: true,
    message,
    data,
    meta,
  };
}

export function failureResponse({ message = 'Request failed', errors = [], meta = null }) {
  return {
    success: false,
    message,
    errors,
    meta,
  };
}

export function sendSuccess(res, options) {
  const statusCode = options.statusCode ?? 200;
  const payload = { ...options };
  delete payload.statusCode;
  return res.status(statusCode).json(successResponse(payload));
}
