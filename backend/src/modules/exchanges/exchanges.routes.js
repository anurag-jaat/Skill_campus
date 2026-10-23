import { Router } from 'express';
import { z } from 'zod';
import { db, TABLES } from '../../db/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';

/**
 * Express API routes for exchanges module.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const router = Router();

const proposeSchema = z.object({
  listing_id: z.string().min(1),
  message: z.string().min(5).max(500),
});

const normalise = (skill) => String(skill).trim().toLowerCase();

/**
 * Matching engine (slide 7, week 6).
 *
 * A listing is a match when the swap works both ways: what they offer is what
 * you want, and what you offer is what they want. This is the naive version -
 * exact skill-name matching. Week 6 can widen it to synonyms or partial matches.
 */
router.get(
  '/matches',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = await db.findOne(TABLES.users, { id: req.user.id });
    if (!me) throw ApiError.unauthorized('User not found (please sign in again)');

    const iOffer = (me.skills_offered ?? []).map(normalise);
    const iWant = (me.skills_wanted ?? []).map(normalise);

    if (!iOffer.length || !iWant.length) {
      return res.json({
        matches: [],
        hint: 'Add at least one skill you can teach and one you want to learn to get matches.',
      });
    }

    const open = await db.findMany(
      TABLES.listings,
      { mode: 'exchange', status: 'open' },
      { limit: 200 }
    );

    const matches = open
      .filter((listing) => listing.owner_id !== req.user.id)
      .map((listing) => {
        const theyOffer = normalise(listing.skill_offered);
        const theyWant = normalise(listing.skill_wanted);
        const theyTeachWhatIWant = iWant.includes(theyOffer);
        const iTeachWhatTheyWant = iOffer.includes(theyWant);

        return {
          listing,
          theyTeachWhatIWant,
          iTeachWhatTheyWant,
          // 2 = a clean two-way swap, 1 = only one direction lines up.
          score: Number(theyTeachWhatIWant) + Number(iTeachWhatTheyWant),
        };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);

    res.json({ matches });
  })
);

/** GET /api/exchanges - swaps you are part of, either side. */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [proposed, received] = await Promise.all([
      db.findMany(TABLES.exchanges, { proposer_id: req.user.id }, { limit: 100 }),
      db.findMany(TABLES.exchanges, { owner_id: req.user.id }, { limit: 100 }),
    ]);
    res.json({ exchanges: [...proposed, ...received] });
  })
);

/** POST /api/exchanges - propose a swap against an exchange listing. */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { listing_id, message } = proposeSchema.parse(req.body);

    const listing = await db.findOne(TABLES.listings, { id: listing_id });
    if (!listing) throw ApiError.notFound('Listing not found');
    if (listing.mode !== 'exchange') throw ApiError.badRequest('That listing is not a skill exchange');
    if (listing.status !== 'open') throw ApiError.conflict('This listing is no longer open');
    if (listing.owner_id === req.user.id) {
      throw ApiError.forbidden('You cannot propose a swap on your own listing');
    }

    const exchange = await db.insert(TABLES.exchanges, {
      listing_id,
      owner_id: listing.owner_id,
      proposer_id: req.user.id,
      message,
      status: 'pending',
    });
    res.status(201).json({ exchange });
  })
);

/** POST /api/exchanges/:id/accept - the listing owner agrees to the swap. */
router.post(
  '/:id/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const exchange = await db.findOne(TABLES.exchanges, { id: req.params.id });
    if (!exchange) throw ApiError.notFound('Exchange not found');
    if (exchange.owner_id !== req.user.id) {
      throw ApiError.forbidden('Only the listing owner can accept this swap');
    }

    const updated = await db.update(TABLES.exchanges, { id: exchange.id }, { status: 'accepted' });
    await db.update(TABLES.listings, { id: exchange.listing_id }, { status: 'in_progress' });
    res.json({ exchange: updated });
  })
);

export default router;
