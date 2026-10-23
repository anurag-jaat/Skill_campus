import { Router } from 'express';
import { z } from 'zod';
import { db, TABLES } from '../../db/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createCollegeRequest } from '../../services/collegeRequestsService.js';

/**
 * Express API routes for public college domain discovery and student college access requests.
 * @author = kruthinraj
 * @date = 2026-10-17
 */

const router = Router();

const requestSchema = z.object({
  college_name: z.string().trim().min(2, 'College name must be at least 2 characters').max(150),
  college_domain: z
    .string()
    .trim()
    .min(3, 'Domain must be at least 3 characters')
    .max(100)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid domain format (e.g. vit.ac.in or srm.edu.in)'),
  example_email: z.string().trim().email('Please enter a valid student or contact email address'),
  notes: z.string().trim().max(1000).optional().default(''),
});

/** GET /api/colleges - Public list of approved colleges and domains */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const colleges = await db.findMany(
      TABLES.colleges,
      {},
      { orderBy: 'name', ascending: true, limit: 200 }
    );
    res.json({ colleges });
  })
);

/** POST /api/colleges/request - Student submits a new college access request */
router.post(
  '/request',
  asyncHandler(async (req, res) => {
    const payload = requestSchema.parse(req.body);
    const result = await createCollegeRequest(payload);

    if (result.alreadyApproved) {
      return res.status(200).json({
        alreadyApproved: true,
        message: result.message,
        college: result.college,
      });
    }

    if (result.alreadyPending) {
      return res.status(200).json({
        alreadyPending: true,
        message: result.message,
        request: result.request,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Your college request has been submitted to the admin team! We will review it and notify you via email once approved.',
      request: result.request,
    });
  })
);

export default router;
