/**
 * Implementation file for asyncHandler.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

/**
 * Wraps an async route handler so a rejected promise reaches Express'
 * error middleware instead of hanging the request.
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
