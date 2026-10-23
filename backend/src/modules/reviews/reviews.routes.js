import { Router } from 'express';
import { z } from 'zod';
import { db, TABLES } from '../../db/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';

/**
 * Express API routes for reviews module.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const router = Router();

const reviewSchema = z.object({
  listing_id: z.string().min(1),
  reviewee_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).default(''),
  image_url: z.string().optional().default(''),
});

/**
 * Recomputes the running average on the reviewed student's profile.
 * Kept incremental so we never have to read every review row.
 */
async function applyRating(userId, rating) {
  const user = await db.findOne(TABLES.users, { id: userId });
  if (!user) throw ApiError.notFound('The person you are reviewing does not exist');

  const count = (user.rating_count ?? 0) + 1;
  const total = (user.rating_average ?? 0) * (user.rating_count ?? 0) + rating;

  return db.update(
    TABLES.users,
    { id: userId },
    { rating_count: count, rating_average: Number((total / count).toFixed(2)) }
  );
}

/** GET /api/reviews?user_id=... - reviews left for one student. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.query.user_id;
    if (!userId) throw ApiError.badRequest('user_id query parameter is required');

    const reviews = await db.findMany(TABLES.reviews, { reviewee_id: userId }, { limit: 100 });
    res.json({ reviews });
  })
);

/** POST /api/reviews - rate the other side once the work is done. */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = reviewSchema.parse(req.body);

    if (payload.reviewee_id === req.user.id) {
      throw ApiError.forbidden('You cannot review yourself');
    }

    const listing = await db.findOne(TABLES.listings, { id: payload.listing_id });
    if (!listing) throw ApiError.notFound('Listing not found');
    if (listing.status !== 'completed') {
      throw ApiError.conflict('You can only review a listing that is marked completed');
    }

    const existing = await db.findOne(TABLES.reviews, {
      listing_id: payload.listing_id,
      reviewer_id: req.user.id,
    });
    if (existing) throw ApiError.conflict('You have already reviewed this listing');

    const review = await db.insert(TABLES.reviews, { ...payload, reviewer_id: req.user.id });
    const reviewee = await applyRating(payload.reviewee_id, payload.rating);

    res.status(201).json({ review, reviewee });
  })
);

export default router;
