import { Router } from 'express';
import { db, TABLES } from '../../db/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';

/**
 * Express API routes for notifications module.
 * @author = kruthinraj
 * @date = 2026-08-27
 */

const router = Router();

/**
 * Build notification objects by scanning recent activity relevant to the user.
 * This is a computed view — no dedicated notifications table needed.
 */
async function buildNotifications(userId) {
  const notifications = [];
  const user = await db.findOne(TABLES.users, { id: userId });
  const lastRead = user?.last_read_at ? new Date(user.last_read_at) : new Date(0);

  // 1. New bids on user's listings
  const myListings = await db.findMany(TABLES.listings, { owner_id: userId }, { limit: 100 });
  for (const listing of myListings) {
    const bids = await db.findMany(TABLES.bids, { listing_id: listing.id }, { limit: 50 });
    for (const bid of bids) {
      notifications.push({
        id: `bid-${bid.id}`,
        type: 'new_bid',
        message: `New bid of ₹${bid.amount} on "${listing.title}"`,
        listing_id: listing.id,
        created_at: bid.created_at,
        read: new Date(bid.created_at) <= lastRead,
      });
    }
  }

  // 2. Bid accepted/rejected on listings user bid on
  const myBids = await db.findMany(TABLES.bids, { bidder_id: userId }, { limit: 100 });
  for (const bid of myBids) {
    if (bid.status === 'accepted') {
      const listing = await db.findOne(TABLES.listings, { id: bid.listing_id });
      notifications.push({
        id: `bid-accepted-${bid.id}`,
        type: 'bid_accepted',
        message: `Your bid was accepted on "${listing?.title || 'a listing'}"`,
        listing_id: bid.listing_id,
        created_at: bid.updated_at || bid.created_at,
        read: new Date(bid.updated_at || bid.created_at) <= lastRead,
      });
    }
    if (bid.status === 'rejected') {
      const listing = await db.findOne(TABLES.listings, { id: bid.listing_id });
      notifications.push({
        id: `bid-rejected-${bid.id}`,
        type: 'bid_rejected',
        message: `Your bid was not selected on "${listing?.title || 'a listing'}"`,
        listing_id: bid.listing_id,
        created_at: bid.updated_at || bid.created_at,
        read: new Date(bid.updated_at || bid.created_at) <= lastRead,
      });
    }
  }

  // 3. Exchange proposals on user's listings
  const exchanges = await db.findMany(TABLES.exchanges, { owner_id: userId }, { limit: 100 });
  for (const ex of exchanges) {
    const listing = await db.findOne(TABLES.listings, { id: ex.listing_id });
    notifications.push({
      id: `exchange-${ex.id}`,
      type: 'exchange_proposal',
      message: `New swap proposal on "${listing?.title || 'a listing'}"`,
      listing_id: ex.listing_id,
      created_at: ex.created_at,
      read: new Date(ex.created_at) <= lastRead,
    });
  }

  // 3.5 Team applications on user's listings
  for (const listing of myListings) {
    if (listing.mode === 'team') {
      const apps = await db.findMany('team_applications', { listing_id: listing.id }, { limit: 50 });
      for (const app of apps) {
        notifications.push({
          id: `team-app-${app.id}`,
          type: 'team_application',
          message: `New application for your team on "${listing.title}"`,
          listing_id: listing.id,
          created_at: app.created_at,
          read: new Date(app.created_at) <= lastRead,
        });
      }
    }
  }

  // 3.6 Team application status updates for the user
  const myTeamApps = await db.findMany('team_applications', { applicant_id: userId }, { limit: 100 });
  for (const app of myTeamApps) {
    if (app.status === 'accepted') {
      const listing = await db.findOne(TABLES.listings, { id: app.listing_id });
      notifications.push({
        id: `team-accepted-${app.id}`,
        type: 'team_accepted',
        message: `You have been selected for the team "${listing?.title || 'a listing'}"!`,
        listing_id: app.listing_id,
        created_at: app.updated_at || app.created_at,
        read: new Date(app.updated_at || app.created_at) <= lastRead,
      });
    }
    if (app.status === 'removed') {
      const listing = await db.findOne(TABLES.listings, { id: app.listing_id });
      notifications.push({
        id: `team-removed-${app.id}`,
        type: 'team_removed',
        message: `You have been removed from the team "${listing?.title || 'a listing'}"`,
        listing_id: app.listing_id,
        created_at: app.updated_at || app.created_at,
        read: new Date(app.updated_at || app.created_at) <= lastRead,
      });
    }
  }

  // 4. Listings completed (that user posted or worked on)
  for (const listing of myListings) {
    if (listing.status === 'completed') {
      notifications.push({
        id: `completed-${listing.id}`,
        type: 'listing_completed',
        message: `"${listing.title}" has been marked as completed`,
        listing_id: listing.id,
        created_at: listing.updated_at || listing.created_at,
        read: new Date(listing.updated_at || listing.created_at) <= lastRead,
      });
    }
  }

  // 5. Admin Warnings and Unblocks
  try {
    const adminActions = await db.findMany(TABLES.admin_actions, { user_id: userId }, { limit: 50 });
    for (const action of adminActions) {
      if (action.action === 'warn') {
        notifications.push({
          id: `warn-${action.id}`,
          type: 'admin_warning',
          message: `Admin Warning: ${action.message || 'Please review community guidelines.'}`,
          image_url: action.image_url || undefined,
          created_at: action.created_at,
          read: new Date(action.created_at) <= lastRead,
        });
      } else if (action.action === 'unblock') {
        notifications.push({
          id: `unblock-${action.id}`,
          type: 'admin_unblock',
          message: `Account Unblocked: ${action.message || 'You have been unblocked by the administration.'}`,
          image_url: action.image_url || undefined,
          created_at: action.created_at,
          read: new Date(action.created_at) <= lastRead,
        });
      }
    }
  } catch (e) {
    // Ignore if table doesn't exist yet
  }

  // Sort newest first
  notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return notifications;
}

/** GET /api/notifications — all events relevant to the signed-in user. */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const notifications = await buildNotifications(req.user.id);
    const unread_count = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unread_count });
  })
);

/** PATCH /api/notifications/read — mark everything as read. */
router.patch(
  '/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    await db.update(TABLES.users, { id: req.user.id }, { last_read_at: new Date().toISOString() });
    res.json({ success: true });
  })
);

/** GET /api/notifications/stream — SSE for live unread count. */
router.get(
  '/stream',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send an immediate update
    const notifications = await buildNotifications(req.user.id);
    let lastCount = notifications.filter((n) => !n.read).length;
    res.write(`data: ${JSON.stringify({ unread_count: lastCount })}\n\n`);

    // Poll internally every 3 seconds to push if there's a change
    const intervalId = setInterval(async () => {
      try {
        const notifs = await buildNotifications(req.user.id);
        const count = notifs.filter((n) => !n.read).length;
        if (count !== lastCount) {
          lastCount = count;
          res.write(`data: ${JSON.stringify({ unread_count: count })}\n\n`);
        }
      } catch (err) {
        console.error('SSE Poll error:', err);
      }
    }, 3000);

    req.on('close', () => {
      clearInterval(intervalId);
    });
  })
);

export default router;
