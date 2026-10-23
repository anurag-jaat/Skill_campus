import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import {
  getUserById,
  requestOtp,
  loginWithPassword,
  registerWithOtp,
  resetPassword,
  setPassword,
} from './auth.service.js';
import { recordUserActivity } from '../../services/loginTracker.js';

/**
 * Express API routes for auth module.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const router = Router();

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  code: z.string().regex(/^\d{6}$/, 'The code is 6 digits'),
  roll_number: z.string().min(1, 'Roll number is required').max(50),
});

const resetSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  code: z.string().regex(/^\d{6}$/, 'The code is 6 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

const setPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

/** POST /api/auth/request-otp - send a code for registration or password reset. */
router.post(
  '/request-otp',
  asyncHandler(async (req, res) => {
    const { email } = emailSchema.parse(req.body);
    const result = await requestOtp(email);

    res.json({
      message: `A verification code was sent to ${email}.`,
      expiresInMinutes: result.expiresInMinutes,
      deliveredByEmail: result.delivered,
    });
  })
);

/** POST /api/auth/login - sign in with email + password. */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { token, user } = await loginWithPassword(email, password);
    res.json({ token, user });
  })
);

/** POST /api/auth/register - create account with email + password + OTP. */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, code, roll_number } = registerSchema.parse(req.body);
    const { token, user } = await registerWithOtp(email, password, code, roll_number);
    res.json({ token, user });
  })
);

/** POST /api/auth/reset-password - verify OTP and set a new password. */
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { email, code, password } = resetSchema.parse(req.body);
    const { token, user } = await resetPassword(email, code, password);
    res.json({ token, user });
  })
);

/** POST /api/auth/set-password - change password while signed in. */
router.post(
  '/set-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { password } = setPasswordSchema.parse(req.body);
    await setPassword(req.user.id, password);
    res.json({ message: 'Password updated.' });
  })
);

/** GET /api/auth/me - the currently signed-in student. */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Record throttled user activity
    recordUserActivity(req.user.id).catch(() => {});
    const user = await getUserById(req.user.id);
    res.json({ user, hasPassword: Boolean(user.password_hash) });
  })
);

export default router;
