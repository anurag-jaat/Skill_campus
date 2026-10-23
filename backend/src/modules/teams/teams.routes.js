import { Router } from 'express';
import { z } from 'zod';
import { db, TABLES } from '../../db/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';

/**
 * Express API routes for teams module.
 * @author = kruthinraj
 * @date = 2026-09-17
 */

const router = Router();

const applySchema = z.object({
  listing_id: z.string().min(1),
  message: z.string().max(500).default(''),
});

/** GET /api/teams?listing_id=... - every application on one team listing. */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const listingId = req.query.listing_id;
    if (!listingId) throw ApiError.badRequest('listing_id query parameter is required');

    const listing = await db.findOne(TABLES.listings, { id: listingId });
    if (!listing) throw ApiError.notFound('Listing not found');
    
    // Only the owner can see the full list of pending applications
    // Wait, applicants should be able to see their own application. 
    // We will return all applications for the owner, and only the user's application for non-owners.
    let where = { listing_id: listingId };
    if (listing.owner_id !== req.user.id) {
      where.applicant_id = req.user.id;
    }

    const applications = await db.findMany('team_applications', where, { limit: 100 });
    
    // Attach user details
    for (const app of applications) {
      const user = await db.findOne(TABLES.users, { id: app.applicant_id });
      if (user) {
        app.applicant = {
          id: user.id,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          email: user.email,
          skills_offered: user.skills_offered,
        };
      }
    }

    res.json({ applications });
  })
);

/** POST /api/teams - apply for a team listing. */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = applySchema.parse(req.body);

    const listing = await db.findOne(TABLES.listings, { id: payload.listing_id });
    if (!listing) throw ApiError.notFound('Listing not found');
    if (listing.mode !== 'team') throw ApiError.badRequest('Only team listings take team applications');
    if (listing.status !== 'open') throw ApiError.conflict('This listing is closed and not accepting new applicants');
    if (listing.owner_id === req.user.id) throw ApiError.forbidden('You cannot apply to your own team');

    const existing = await db.findOne('team_applications', {
      listing_id: listing.id,
      applicant_id: req.user.id,
    });
    if (existing) throw ApiError.conflict('You have already applied to this team');

    const application = await db.insert('team_applications', {
      ...payload,
      applicant_id: req.user.id,
      status: 'pending',
    });
    res.status(201).json({ application });
  })
);

/** POST /api/teams/:id/accept - owner selects a teammate. */
router.post(
  '/:id/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const application = await db.findOne('team_applications', { id: req.params.id });
    if (!application) throw ApiError.notFound('Application not found');

    const listing = await db.findOne(TABLES.listings, { id: application.listing_id });
    if (!listing) throw ApiError.notFound('Listing not found');
    if (listing.owner_id !== req.user.id) {
      throw ApiError.forbidden('Only the post owner can accept applicants');
    }
    
    if (application.status === 'accepted') {
       throw ApiError.conflict('This applicant is already accepted');
    }

    // Check if team is full
    const acceptedCount = (await db.findMany('team_applications', { 
      listing_id: listing.id, 
      status: 'accepted' 
    })).length;
    
    if (acceptedCount >= listing.people_required) {
      throw ApiError.conflict(`The team is already full (${listing.people_required}/${listing.people_required} people).`);
    }

    const accepted = await db.update('team_applications', { id: application.id }, { status: 'accepted' });
    res.json({ application: accepted });
  })
);

/** POST /api/teams/:id/remove - owner removes a selected teammate. */
router.post(
  '/:id/remove',
  requireAuth,
  asyncHandler(async (req, res) => {
    const application = await db.findOne('team_applications', { id: req.params.id });
    if (!application) throw ApiError.notFound('Application not found');

    const listing = await db.findOne(TABLES.listings, { id: application.listing_id });
    if (!listing) throw ApiError.notFound('Listing not found');
    if (listing.owner_id !== req.user.id) {
      throw ApiError.forbidden('Only the post owner can remove applicants');
    }

    const removed = await db.update('team_applications', { id: application.id }, { status: 'removed' });
    res.json({ application: removed });
  })
);

export default router;
