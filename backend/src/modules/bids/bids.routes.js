import { Router } from 'express';
import { z } from 'zod';
import { db, TABLES } from '../../db/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';

/**
 * Express API routes for bids module.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const router = Router();

const bidSchema = z.object({
  listing_id: z.string().min(1),
  amount: z.number().int().positive().max(100000),
  message: z.string().min(5).max(500),
  is_anonymous: z.boolean().optional().default(false),
});

const editBidSchema = z.object({
  amount: z.number().int().positive().max(100000).optional(),
  message: z.string().min(5).max(500).optional(),
  is_anonymous: z.boolean().optional(),
});

/** Helper to extract anonymity from column or legacy message prefix */
const resolveBidAnon = (bid) => {
  if (typeof bid.is_anonymous === 'boolean') return bid.is_anonymous;
  return typeof bid.message === 'string' && bid.message.startsWith('[ANONYMOUS] ');
};

const cleanBidMessage = (message) => {
  if (typeof message === 'string' && message.startsWith('[ANONYMOUS] ')) {
    return message.replace('[ANONYMOUS] ', '');
  }
  return message || '';
};

/** GET /api/bids?listing_id=... - every bid on one listing. */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const listingId = req.query.listing_id;
    if (!listingId) throw ApiError.badRequest('listing_id query parameter is required');

    const listing = await db.findOne(TABLES.listings, { id: listingId });
    const isOwner = listing && listing.owner_id === req.user.id;

    const bids = await db.findMany(TABLES.bids, { listing_id: listingId }, { limit: 100 });
    
    // Privacy protection: on completed or cancelled tasks, non-owners can only see their own bid
    const visibleBids = (listing && (listing.status === 'completed' || listing.status === 'cancelled') && !isOwner)
      ? bids.filter((b) => b.bidder_id === req.user.id)
      : bids;
    
    // Attach user details for each bid
    for (let i = 0; i < visibleBids.length; i++) {
      const bid = visibleBids[i];
      const isAnon = resolveBidAnon(bid);
      bid.is_anonymous = isAnon;
      bid.message = cleanBidMessage(bid.message);

      const user = await db.findOne(TABLES.users, { id: bid.bidder_id });
      const isMyBid = bid.bidder_id === req.user.id;

      if (user) {
        if (isOwner || isMyBid || !isAnon) {
          // Listing Owner, the Bidder themselves, or public bids see full real profile details
          bid.bidder = {
            id: user.id,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            rating_average: user.rating_average,
            rating_count: user.rating_count,
            upi_id: (isOwner || isMyBid) ? (user.upi_id ?? '') : '',
            is_anonymous: isAnon,
          };
        } else {
          // Other students / competitors see masked anonymous identity
          bid.bidder = {
            id: null,
            full_name: `Student Bidder #${i + 1}`,
            avatar_url: null,
            rating_average: user.rating_average,
            rating_count: user.rating_count,
            is_anonymous: true,
          };
        }
      }
    }

    res.json({ bids: visibleBids });
  })
);

/** POST /api/bids - place a bid on a freelance listing. */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = bidSchema.parse(req.body);

    const listing = await db.findOne(TABLES.listings, { id: payload.listing_id });
    if (!listing) throw ApiError.notFound('Listing not found');
    if (listing.mode !== 'freelance') throw ApiError.badRequest('Only freelance listings take bids');
    if (listing.status !== 'open') throw ApiError.conflict('This listing is no longer open');
    if (listing.owner_id === req.user.id) throw ApiError.forbidden('You cannot bid on your own listing');
    
    if (listing.deadline && new Date(listing.deadline) < new Date()) {
      throw ApiError.conflict('The deadline for this listing has passed');
    }

    const existing = await db.findOne(TABLES.bids, {
      listing_id: listing.id,
      bidder_id: req.user.id,
    });
    if (existing) throw ApiError.conflict('You have already bid on this listing');

    const isAnon = Boolean(payload.is_anonymous);
    let bid;
    try {
      bid = await db.insert(TABLES.bids, {
        listing_id: payload.listing_id,
        amount: payload.amount,
        message: payload.message,
        is_anonymous: isAnon,
        bidder_id: req.user.id,
        status: 'pending',
      });
    } catch (err) {
      // Fallback if is_anonymous column does not exist yet in database
      const fallbackMessage = isAnon ? `[ANONYMOUS] ${payload.message}` : payload.message;
      bid = await db.insert(TABLES.bids, {
        listing_id: payload.listing_id,
        amount: payload.amount,
        message: fallbackMessage,
        bidder_id: req.user.id,
        status: 'pending',
      });
    }

    bid.is_anonymous = isAnon;
    bid.message = cleanBidMessage(bid.message);
    res.status(201).json({ bid });
  })
);

/** PATCH /api/bids/:id - edit an existing bid. */
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = editBidSchema.parse(req.body);
    
    if (Object.keys(payload).length === 0) {
      throw ApiError.badRequest('Nothing to update');
    }

    const bid = await db.findOne(TABLES.bids, { id: req.params.id });
    if (!bid) throw ApiError.notFound('Bid not found');
    
    if (bid.bidder_id !== req.user.id) {
      throw ApiError.forbidden('You can only edit your own bids');
    }
    
    const listing = await db.findOne(TABLES.listings, { id: bid.listing_id });
    if (!listing || listing.status !== 'open') {
      throw ApiError.conflict('Cannot edit bid on a listing that is closed or in progress');
    }

    const patch = { ...payload };
    const hasAnon = typeof patch.is_anonymous === 'boolean';
    const isAnon = patch.is_anonymous;

    let updated;
    try {
      updated = await db.update(TABLES.bids, { id: bid.id }, patch);
    } catch (err) {
      // Fallback if is_anonymous column doesn't exist
      delete patch.is_anonymous;
      if (hasAnon) {
        let msg = patch.message || bid.message || '';
        msg = msg.replace('[ANONYMOUS] ', '');
        patch.message = isAnon ? `[ANONYMOUS] ${msg}` : msg;
      }
      updated = await db.update(TABLES.bids, { id: bid.id }, patch);
    }

    updated.is_anonymous = typeof isAnon === 'boolean' ? isAnon : resolveBidAnon(updated);
    updated.message = cleanBidMessage(updated.message);
    res.json({ bid: updated });
  })
);

/** DELETE /api/bids/:id - withdraw/delete a bid. */
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bid = await db.findOne(TABLES.bids, { id: req.params.id });
    if (!bid) throw ApiError.notFound('Bid not found');

    if (bid.bidder_id !== req.user.id) {
      throw ApiError.forbidden('You can only delete your own bids');
    }

    if (bid.status === 'accepted') {
      throw ApiError.conflict('Cannot delete an accepted bid that is already in progress');
    }

    await db.remove(TABLES.bids, { id: bid.id });
    res.json({ success: true, message: 'Bid withdrawn successfully' });
  })
);

/** POST /api/bids/:id/accept - owner picks a bid; the gig starts. */
router.post(
  '/:id/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bid = await db.findOne(TABLES.bids, { id: req.params.id });
    if (!bid) throw ApiError.notFound('Bid not found');

    const listing = await db.findOne(TABLES.listings, { id: bid.listing_id });
    if (!listing) throw ApiError.notFound('Listing not found');
    if (listing.owner_id !== req.user.id) {
      throw ApiError.forbidden('Only the person who posted this listing can accept a bid');
    }
    if (listing.status !== 'open') throw ApiError.conflict('This listing is no longer open');

    const accepted = await db.update(TABLES.bids, { id: bid.id }, { status: 'accepted' });
    await db.update(
      TABLES.listings,
      { id: listing.id },
      { status: 'in_progress', accepted_bid_id: bid.id }
    );

    // Reject all other pending bids on this listing.
    const allBids = await db.findMany(TABLES.bids, { listing_id: listing.id }, { limit: 1000 });
    const losers = allBids.filter((b) => b.id !== bid.id && b.status === 'pending');
    await Promise.all(
      losers.map((b) => db.update(TABLES.bids, { id: b.id }, { status: 'rejected' }))
    );

    res.json({ bid: accepted });
  })
);

export default router;
