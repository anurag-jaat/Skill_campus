import { Router } from 'express';
import { z } from 'zod';
import { db, TABLES } from '../../db/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';

/**
 * Express API routes for users module.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const router = Router();

const profileSchema = z.object({
  full_name: z.string().min(2).max(80).optional(),
  bio: z.string().max(500).optional(),
  skills_offered: z.array(z.string().min(1).max(40)).max(20).optional(),
  skills_wanted: z.array(z.string().min(1).max(40)).max(20).optional(),
  upi_id: z.string().max(80).optional(),
});

const avatarSchema = z.object({
  avatar_url: z.string().max(150000, 'Image is too large (max ~100 KB)'),
});

/** Never leak another student's email address. */
const toPublicProfile = (user) => ({
  id: user.id,
  full_name: user.full_name,
  bio: user.bio,
  avatar_url: user.avatar_url ?? '',
  skills_offered: user.skills_offered ?? [],
  skills_wanted: user.skills_wanted ?? [],
  upi_id: user.upi_id ?? '',
  rating_average: user.rating_average ?? 0,
  rating_count: user.rating_count ?? 0,
  created_at: user.created_at,
});

import { fuzzyFilterAndSort } from '../../utils/fuzzySearch.js';

/** GET /api/users/search?q=... - search for public users with typo tolerance. */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = req.query.q || '';
    if (!q.trim()) {
      return res.json({ users: [] });
    }
    
    // Attempt to extract token to filter by college
    let token = null;
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      token = header.substring(7).trim();
      if (token === 'null' || token === 'undefined') token = null;
    }
    let userCollegeId = null;
    if (token) {
      try {
        const payload = (await import('jsonwebtoken')).default.verify(token, (await import('../../config/env.js')).env.jwtSecret);
        userCollegeId = payload.college_id;
      } catch (err) {}
    }

    try {
      const matchingUsers = await db.findMany(
        TABLES.users,
        userCollegeId ? { college_id: userCollegeId } : {},
        { limit: 200 }
      );
      const eligibleUsers = matchingUsers.filter(
        (user) => user.email !== 'kruthin123@gmail.com' && user.status !== 'blocked'
      );
      const userTextExtractor = (u) => [
        u.full_name || '',
        u.bio || '',
        Array.isArray(u.skills_offered) ? u.skills_offered.join(' ') : '',
        Array.isArray(u.skills_wanted) ? u.skills_wanted.join(' ') : '',
      ].join(' ');

      const matched = fuzzyFilterAndSort(eligibleUsers, q, userTextExtractor, 0.55);
      const users = matched.map(toPublicProfile).slice(0, 30);
      res.json({ users });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.error('[User Search Error]', err);
      throw ApiError.serviceUnavailable('User search is temporarily unavailable. Check the database connection and try again.');
    }
  })
);

/** GET /api/users/:id - public profile with the trust score (slide 9). */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await db.findOne(TABLES.users, { id: req.params.id });
    if (!user) throw ApiError.notFound('User not found');
    res.json({ user: toPublicProfile(user) });
  })
);

/** PATCH /api/users/me - edit your own profile. */
router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const patch = profileSchema.parse(req.body);
    let user;
    try {
      user = await db.update(TABLES.users, { id: req.user.id }, patch);
    } catch (err) {
      if (patch.upi_id && err.message && err.message.includes('upi_id')) {
        const fallbackPatch = { ...patch };
        delete fallbackPatch.upi_id;
        user = await db.update(TABLES.users, { id: req.user.id }, fallbackPatch);
      } else {
        throw err;
      }
    }
    if (!user) throw ApiError.notFound('User not found');
    res.json({ user });
  })
);

/** PATCH /api/users/me/avatar - upload a profile picture as base64. */
router.patch(
  '/me/avatar',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { avatar_url } = avatarSchema.parse(req.body);
    const user = await db.update(TABLES.users, { id: req.user.id }, { avatar_url });
    if (!user) throw ApiError.notFound('User not found');
    res.json({ user });
  })
);

export default router;
