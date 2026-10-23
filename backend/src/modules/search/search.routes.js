import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db, TABLES } from '../../db/index.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { fuzzyFilterAndSort } from '../../utils/fuzzySearch.js';

/**
 * Express API routes for unified search with typo-tolerance.
 * @author = kruthinraj
 * @date = 2026-10-15
 */

const router = Router();

/** Never leak another student's sensitive info. */
const toPublicProfile = (user) => ({
  id: user.id,
  full_name: user.full_name,
  bio: user.bio,
  avatar_url: user.avatar_url ?? '',
  skills_offered: user.skills_offered ?? [],
  skills_wanted: user.skills_wanted ?? [],
  rating_average: user.rating_average ?? 0,
  rating_count: user.rating_count ?? 0,
  created_at: user.created_at,
});

/**
 * GET /api/search?q=...&type=all|users|posts
 * Returns typo-tolerant matches for users and posts accessible to the requester.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    const type = req.query.type || 'all'; // 'all' | 'users' | 'posts'

    if (!q) {
      return res.json({ query: '', users: [], listings: [], total: 0 });
    }

    // Attempt to extract token to filter by college scoping
    let token = null;
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      token = header.substring(7).trim();
      if (token === 'null' || token === 'undefined') token = null;
    }

    let userCollegeId = null;
    if (token) {
      try {
        const payload = jwt.verify(token, env.jwtSecret);
        userCollegeId = payload.college_id;
      } catch (err) {
        // Continue unauthenticated if token invalid/expired
      }
    }

    try {
      let matchedUsers = [];
      let matchedListings = [];

      // 1. Search Users if requested
      if (type === 'all' || type === 'users') {
        const users = await db.findMany(
          TABLES.users,
          userCollegeId ? { college_id: userCollegeId } : {},
          { limit: 200 }
        );
        const eligibleUsers = users.filter((user) => user.email !== 'kruthin123@gmail.com');
        const userTextExtractor = (user) => [
          user.full_name || '',
          user.bio || '',
          Array.isArray(user.skills_offered) ? user.skills_offered.join(' ') : '',
          Array.isArray(user.skills_wanted) ? user.skills_wanted.join(' ') : '',
        ].join(' ');

        matchedUsers = fuzzyFilterAndSort(eligibleUsers, q, userTextExtractor, 0.55)
          .map(toPublicProfile)
          .slice(0, 30);
      }

      // 2. Search Listings/Posts if requested (Only active, open tasks; completed tasks are visible via user profile only)
      if (type === 'all' || type === 'posts') {
        const listings = await db.findMany(
          TABLES.listings,
          { status: 'open', ...(userCollegeId ? { college_id: userCollegeId } : {}) },
          { limit: 200 }
        );

        // Filter out expired freelance listings so public search only displays live opportunities.
        const activeListings = listings.filter((listing) => (
          listing.mode !== 'freelance' ||
          !listing.deadline ||
          new Date(listing.deadline) > new Date()
        ));

        const ownerIds = [...new Set(activeListings.map((listing) => listing.owner_id).filter(Boolean))];
        const owners = await Promise.all(
          ownerIds.map(async (id) => {
            const owner = await db.findOne(TABLES.users, { id });
            return owner
              ? [id, { id: owner.id, full_name: owner.full_name, avatar_url: owner.avatar_url }]
              : null;
          })
        );
        const ownerMap = new Map(owners.filter(Boolean));
        const listingsWithOwner = activeListings.map((listing) => ({
          ...listing,
          owner: ownerMap.get(listing.owner_id) || null,
        }));

        const listingTextExtractor = (listing) => [
          listing.title || '',
          listing.description || '',
          Array.isArray(listing.tags) ? listing.tags.join(' ') : '',
          listing.skill_offered || '',
          listing.skill_wanted || '',
          listing.mode || '',
          listing.owner?.full_name || '',
        ].join(' ');

        matchedListings = fuzzyFilterAndSort(listingsWithOwner, q, listingTextExtractor, 0.55)
          .slice(0, 30);
      }

      res.json({
        query: q,
        users: matchedUsers,
        listings: matchedListings,
        total: matchedUsers.length + matchedListings.length,
      });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.error('[Unified Search Error]', err);
      throw ApiError.serviceUnavailable('Search is temporarily unavailable. Check the database connection and try again.');
    }
  })
);

export default router;
