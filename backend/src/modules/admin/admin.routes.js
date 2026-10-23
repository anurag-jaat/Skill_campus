import { Router } from 'express';
import { db, TABLES } from '../../db/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { getUserLastLogin } from '../../services/loginTracker.js';
import {
  getAllCollegeRequests,
  approveCollegeRequest,
  rejectCollegeRequest,
  deleteCollegeRequest,
} from '../../services/collegeRequestsService.js';

/**
 * Express API routes for admin module.
 * @author = kruthinraj
 * @date = 2026-09-03
 */

const router = Router();

const requireAdmin = (req, res, next) => {
  if (req.user?.email !== 'kruthin123@gmail.com') {
    return next(ApiError.forbidden('Admin access only'));
  }
  next();
};

/** GET /api/admin/users - Get all users with last login and activity status (Admin only) */
router.get(
  '/users',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const users = await db.findMany(
      TABLES.users,
      {},
      { orderBy: 'created_at', ascending: false, limit: 250 }
    );
    // Exclude the admin from the management list
    const filteredUsers = users.filter(u => u.email !== 'kruthin123@gmail.com');

    const enrichedUsers = filteredUsers.map((u) => {
      const lastLogin = getUserLastLogin(u);
      const lastLoginDate = lastLogin ? new Date(lastLogin) : new Date(u.created_at || 0);
      const now = Date.now();
      const diffMs = Math.max(0, now - lastLoginDate.getTime());
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Real-time online & last seen status:
      // Online Now: active within the last 10 minutes
      const isOnline = !u.is_blocked && diffMinutes <= 10;
      // Seen Today: active within the last 24 hours
      const isSeenToday = !u.is_blocked && diffHours < 24;

      return {
        ...u,
        last_seen_at: lastLogin,
        last_login_at: lastLogin,
        is_online: isOnline,
        is_seen_today: isSeenToday,
        is_active: isOnline || isSeenToday,
        diff_minutes: diffMinutes,
        diff_hours: diffHours,
        diff_days: diffDays,
      };
    });

    res.json({ users: enrichedUsers });
  })
);

/** GET /api/admin/reports - Get all reports (Admin only) */
router.get(
  '/reports',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const reports = await db.findMany(
      TABLES.reports,
      {},
      { orderBy: 'created_at', ascending: false, limit: 100 }
    );

    const userIds = [...new Set(reports.flatMap(r => [r.reported_user_id, r.reporter_id]))];
    const listingIds = [...new Set(reports.filter(r => r.listing_id).map(r => r.listing_id))];
    
    const users = await Promise.all(userIds.map(id => db.findOne(TABLES.users, { id })));
    const listings = await Promise.all(listingIds.map(id => db.findOne(TABLES.listings, { id })));
    
    const userMap = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
    const listingMap = listings.reduce((acc, l) => { acc[l.id] = l; return acc; }, {});

    const enrichedReports = reports.map(r => ({
      ...r,
      reported_email: userMap[r.reported_user_id]?.email,
      reported_name: userMap[r.reported_user_id]?.full_name,
      reporter_email: userMap[r.reporter_id]?.email,
      reporter_name: userMap[r.reporter_id]?.full_name,
      listing_title: listingMap[r.listing_id]?.title,
    }));

    res.json({ reports: enrichedReports });
  })
);

/** POST /api/admin/users/:id/warn - Warn a user (Admin only) */
router.post(
  '/users/:id/warn',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { message = '', image_url = '' } = req.body || {};
    
    const user = await db.findOne(TABLES.users, { id: userId });
    
    if (!user) throw ApiError.notFound('User not found');

    const newCount = (user.warnings_count || 0) + 1;
    const updatedUser = await db.update(
      TABLES.users,
      { id: userId },
      { warnings_count: newCount, updated_at: new Date().toISOString() }
    );
    
    await db.insert(TABLES.admin_actions, {
      user_id: userId,
      action: 'warn',
      message,
      image_url,
    });

    res.json({ user: updatedUser });
  })
);

/** POST /api/admin/users/:id/block - Block a user (Admin only) */
router.post(
  '/users/:id/block',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { message = '', image_url = '' } = req.body || {};
    
    if (userId === req.user.id) {
      throw ApiError.badRequest('You cannot block yourself');
    }

    const user = await db.findOne(TABLES.users, { id: userId });
    if (!user) throw ApiError.notFound('User not found');

    const updatedUser = await db.update(TABLES.users, { id: userId }, { is_blocked: true, updated_at: new Date().toISOString() });

    await db.insert(TABLES.admin_actions, {
      user_id: userId,
      action: 'block',
      message,
      image_url,
    });

    res.json({ success: true, user: updatedUser });
  })
);

/** POST /api/admin/users/:id/unblock - Unblock a user (Admin only) */
router.post(
  '/users/:id/unblock',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { message = '', image_url = '' } = req.body || {};
    
    const user = await db.findOne(TABLES.users, { id: userId });
    if (!user) throw ApiError.notFound('User not found');

    const updatedUser = await db.update(TABLES.users, { id: userId }, { is_blocked: false, updated_at: new Date().toISOString() });

    await db.insert(TABLES.admin_actions, {
      user_id: userId,
      action: 'unblock',
      message,
      image_url,
    });

    res.json({ success: true, user: updatedUser });
  })
);

/** DELETE /api/admin/reports/:id - Delete a report (Admin only) */
router.delete(
  '/reports/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const reportId = req.params.id;
    
    const report = await db.findOne(TABLES.reports, { id: reportId });
    if (!report) throw ApiError.notFound('Report not found');

    await db.remove(TABLES.reports, { id: reportId });

    res.json({ success: true });
  })
);

/** DELETE /api/admin/listings/:id - Delete a listing (Admin only) */
router.delete(
  '/listings/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const listingId = req.params.id;
    
    const listing = await db.findOne(TABLES.listings, { id: listingId });
    if (!listing) throw ApiError.notFound('Listing not found');

    await db.remove(TABLES.listings, { id: listingId });

    res.json({ success: true });
  })
);

/** GET /api/admin/colleges - Get all colleges */
router.get(
  '/colleges',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const colleges = await db.findMany(
      TABLES.colleges,
      {},
      { orderBy: 'created_at', ascending: false, limit: 100 }
    );
    res.json({ colleges });
  })
);

/** POST /api/admin/colleges - Create a new college */
router.post(
  '/colleges',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { domain, name } = req.body;
    if (!domain || !name) throw ApiError.badRequest('Domain and Name are required');
    
    // Check if domain exists
    const existing = await db.findOne(TABLES.colleges, { domain });
    if (existing) throw ApiError.conflict('College domain already exists');

    const college = await db.insert(TABLES.colleges, { domain, name });
    res.status(201).json({ college });
  })
);

/** DELETE /api/admin/colleges/:domain - Delete a college */
router.delete(
  '/colleges/:domain',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { domain } = req.params;
    const college = await db.findOne(TABLES.colleges, { domain });
    if (!college) throw ApiError.notFound('College not found');

    // Manually cascade delete all users that belong to this college
    // (Listings, bids, exchanges, etc. will cascade automatically because 
    // their foreign keys point to users with ON DELETE CASCADE)
    await db.remove(TABLES.users, { college_id: college.id });

    // Now delete the college itself
    await db.remove(TABLES.colleges, { domain });
    res.json({ success: true });
  })
);

/** GET /api/admin/college-requests - Get all student college access requests */
router.get(
  '/college-requests',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const requests = await getAllCollegeRequests();
    res.json({ requests });
  })
);

/** POST /api/admin/college-requests/:id/approve - Approve college request & send email notification */
router.post(
  '/college-requests/:id/approve',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await approveCollegeRequest(req.params.id, req.user?.email);
    res.json(result);
  })
);

/** POST /api/admin/college-requests/:id/reject - Reject college request & send explanation email */
router.post(
  '/college-requests/:id/reject',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const result = await rejectCollegeRequest(req.params.id, reason);
    res.json(result);
  })
);

/** DELETE /api/admin/college-requests/:id - Delete a college request */
router.delete(
  '/college-requests/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    await deleteCollegeRequest(req.params.id);
    res.json({ success: true });
  })
);

export default router;
