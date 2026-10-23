/**
 * Implementation file for ApiError.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

/**
 * Error type that carries an HTTP status code, so controllers can `throw`
 * and the central error handler knows what to send back.
 */
export class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You are not allowed to do that', details) {
    return new ApiError(403, message, details);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many attempts, please try again later') {
    return new ApiError(429, message);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable', details) {
    return new ApiError(503, message, details);
  }
}
