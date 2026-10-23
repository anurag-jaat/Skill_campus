import { ZodError } from 'zod';
import { isDev } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Express middleware for errorHandler.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

export function notFound(req, _res, next) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

const sanitizeErrorMessage = (text) => {
  if (!text || typeof text !== 'string') return text;
  if (
    /<[a-z][\s\S]*>/i.test(text) ||
    text.includes('<!DOCTYPE') ||
    text.includes('<html') ||
    text.includes('<body') ||
    /521|502|503|504|cloudflare|web server is down/i.test(text)
  ) {
    return 'The API service is unavailable. Check that the backend is running and try again.';
  }
  return text;
};

/* eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (err instanceof ApiError) {
    const cleanMessage = sanitizeErrorMessage(err.message);
    const cleanDetails = typeof err.details === 'string' ? sanitizeErrorMessage(err.details) : err.details;
    return res.status(err.status).json({ error: cleanMessage, details: cleanDetails });
  }

  // Anything reaching here is unexpected - always surface it in the log.
  console.error('[unhandled]', err);
  const cleanDetails = isDev ? sanitizeErrorMessage(err?.message) : undefined;
  return res.status(500).json({
    error: 'Internal server error',
    details: cleanDetails,
  });
}
