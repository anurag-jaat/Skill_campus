import { Router } from 'express';
import { z } from 'zod';
import { db, TABLES } from '../../db/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';

/**
 * Express API routes for messages module.
 * @author = kruthinraj
 * @date = 2026-08-29
 */

const router = Router();

const sendSchema = z.object({
  content: z.string().min(1).max(1000),
});

/**
 * Ensures the user has permission to read/write messages for a listing.
 * To communicate, the listing must be 'in_progress', and the user must be
 * either the owner, the accepted bidder (for freelance), or the exchange partner.
 */
async function assertParticipant(listingId, userId) {
  const listing = await db.findOne(TABLES.listings, { id: listingId });
  if (!listing) throw ApiError.notFound('Listing not found');

  if (listing.owner_id === userId) return listing; // Owner is always allowed

  // For freelance tasks, check if user is the accepted bidder
  if (listing.mode === 'freelance') {
    const acceptedBid = await db.findOne(TABLES.bids, {
      listing_id: listingId,
      bidder_id: userId,
      status: 'accepted',
    });
    if (!acceptedBid) {
      throw ApiError.forbidden('You are not a participant in this task');
    }
    return listing;
  }

  // For exchanges, check if user is the accepted partner
  if (listing.mode === 'exchange') {
    const exchange = await db.findOne(TABLES.exchanges, {
      listing_id: listingId,
      proposer_id: userId,
      status: 'accepted',
    });
    if (!exchange) {
      throw ApiError.forbidden('You are not a participant in this exchange');
    }
    return listing;
  }

  // For teams, check if user is an accepted team member
  if (listing.mode === 'team') {
    const acceptedTeam = await db.findOne('team_applications', {
      listing_id: listingId,
      applicant_id: userId,
      status: 'accepted',
    });
    if (!acceptedTeam) {
      throw ApiError.forbidden('You are not a participant in this team');
    }
    return listing;
  }

  throw ApiError.forbidden('You are not a participant in this listing');
}

/** GET /api/messages/:listing_id - retrieve chat history */
router.get(
  '/:listing_id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { listing_id } = req.params;
    await assertParticipant(listing_id, req.user.id);

    // Using a large limit since we don't have pagination yet
    const messages = await db.findMany(
      TABLES.messages,
      { listing_id },
      { orderBy: 'created_at', ascending: true, limit: 500 }
    );

    // Enrich messages with sender info
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await db.findOne(TABLES.users, { id: msg.sender_id });
        return {
          ...msg,
          sender: {
            id: sender?.id,
            full_name: sender?.full_name,
            avatar_url: sender?.avatar_url,
          },
        };
      })
    );

    res.json({ messages: enriched });
  })
);

/** POST /api/messages/:listing_id - send a new message */
router.post(
  '/:listing_id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { listing_id } = req.params;
    const { content } = sendSchema.parse(req.body);

    await assertParticipant(listing_id, req.user.id);

    const message = await db.insert(TABLES.messages, {
      listing_id,
      sender_id: req.user.id,
      content,
    });

    const sender = await db.findOne(TABLES.users, { id: req.user.id });
    
    res.status(201).json({
      message: {
        ...message,
        sender: {
          id: sender.id,
          full_name: sender.full_name,
          avatar_url: sender.avatar_url,
        },
      },
    });
  })
);

export default router;
