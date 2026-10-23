import { Router } from 'express';
import { db, TABLES } from '../../db/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';

/**
 * Express API routes for dashboard module.
 * @author = kruthinraj
 * @date = 2026-08-27
 */

const router = Router();

/**
 * GET /api/dashboard
 *
 * Returns everything the signed-in student needs:
 *  - active_work:       listings where they are the accepted worker/bidder (to-do work)
 *  - posted:            their own listings (enriched with bid counts and accepted bids)
 *  - bid_history:       every bid placed by user
 *  - payment_pending:   tasks in progress awaiting settlement
 *  - all_involved:      all active tasks user is part of (as owner, worker, or member)
 *  - completed:         listings they participated in that are completed
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // 1. Listings posted by this user
    const posted = await db.findMany(TABLES.listings, { owner_id: userId }, { limit: 100 });

    // 2. Bids this user has placed
    const myBids = await db.findMany(TABLES.bids, { bidder_id: userId }, { limit: 200 });

    // 3. Team applications placed by this user
    let myTeamApps = [];
    try {
      myTeamApps = await db.findMany('team_applications', { applicant_id: userId }, { limit: 100 });
    } catch (_) {}

    // 4. Exchanges this user is involved in
    const [proposedExchanges, receivedExchanges] = await Promise.all([
      db.findMany(TABLES.exchanges, { proposer_id: userId }, { limit: 100 }),
      db.findMany(TABLES.exchanges, { owner_id: userId }, { limit: 100 }),
    ]);
    const allExchanges = [...proposedExchanges, ...receivedExchanges];

    // 5. Enrich posted listings with bid counts and accepted bid info
    const enrichedPosted = [];
    for (const l of posted) {
      let bidsCount = 0;
      let acceptedBid = null;
      if (l.mode === 'freelance') {
        const bidsOnListing = await db.findMany(TABLES.bids, { listing_id: l.id }, { limit: 50 });
        bidsCount = bidsOnListing.length;
        acceptedBid = bidsOnListing.find((b) => b.status === 'accepted') || null;
      }
      enrichedPosted.push({
        ...l,
        bids_count: bidsCount,
        accepted_bid: acceptedBid,
      });
    }

    // 6. Enrich bids with listing details and find active work
    let activeWork = [];
    const completed = [];
    const bidHistory = [];

    for (const bid of myBids) {
      const listing = await db.findOne(TABLES.listings, { id: bid.listing_id });
      const entry = { ...bid, listing: listing || null };
      bidHistory.push(entry);

      if (bid.status === 'accepted' && listing) {
        if (listing.status === 'in_progress') activeWork.push(listing);
        if (listing.status === 'completed') completed.push(listing);
      }
    }

    // 7. Check team apps for active work
    for (const app of myTeamApps) {
      if (app.status === 'accepted') {
        const listing = await db.findOne(TABLES.listings, { id: app.listing_id });
        if (listing) {
          if (listing.status === 'in_progress') activeWork.push(listing);
          if (listing.status === 'completed') completed.push(listing);
        }
      }
    }

    // 8. Check exchanges for active work
    for (const exchange of allExchanges) {
      if (exchange.status === 'accepted') {
        const listing = await db.findOne(TABLES.listings, { id: exchange.listing_id });
        if (listing) {
          if (listing.status === 'in_progress') activeWork.push(listing);
          if (listing.status === 'completed') completed.push(listing);
        }
      }
    }

    // De-duplicate activeWork
    activeWork = activeWork.reduce((acc, listing) => {
      if (!acc.find((l) => l.id === listing.id)) acc.push(listing);
      return acc;
    }, []);

    // Sort activeWork by deadline (earliest first)
    activeWork.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });

    // 9. Payment Pending tasks:
    // Listings in progress where user is owner with an accepted bid OR user is accepted freelancer
    const paymentPending = [];
    for (const l of enrichedPosted) {
      if (l.mode === 'freelance' && l.status === 'in_progress' && l.accepted_bid) {
        paymentPending.push({
          ...l,
          role_in_task: 'owner',
          amount: l.accepted_bid.amount,
        });
      }
    }
    for (const l of activeWork) {
      if (l.mode === 'freelance' && l.status === 'in_progress') {
        const myAccepted = myBids.find((b) => b.listing_id === l.id && b.status === 'accepted');
        if (myAccepted && !paymentPending.find((p) => p.id === l.id)) {
          paymentPending.push({
            ...l,
            role_in_task: 'freelancer',
            amount: myAccepted.amount,
          });
        }
      }
    }

    // 10. All Involved: Active work + User's in_progress posted listings
    const activePosted = enrichedPosted.filter((l) => l.status === 'in_progress');
    const allInvolved = [...activePosted, ...activeWork].reduce((acc, listing) => {
      if (!acc.find((l) => l.id === listing.id)) acc.push(listing);
      return acc;
    }, []);

    // 11. Completed listings posted by this user
    const ownCompleted = enrichedPosted.filter((l) => l.status === 'completed');
    const allCompleted = [...completed, ...ownCompleted].reduce((acc, listing) => {
      if (!acc.find((l) => l.id === listing.id)) acc.push(listing);
      return acc;
    }, []);

    res.json({
      active_work: activeWork,
      posted: enrichedPosted,
      bid_history: bidHistory,
      payment_pending: paymentPending,
      all_involved: allInvolved,
      completed: allCompleted,
    });
  })
);

export default router;
