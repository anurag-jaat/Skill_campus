import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, TABLES } from '../db/index.js';
import { sendMail } from './mailer.js';
import { env } from '../config/env.js';

/**
 * Service for managing student college access requests and automated email approvals.
 * @author = kruthinraj
 * @date = 2026-10-17
 */

const CACHE_FILE = path.resolve(process.cwd(), 'data', 'college_requests.json');
let localRequests = [];

// Load persisted requests cache on startup if exists
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    localRequests = JSON.parse(raw);
  }
} catch (e) {
  localRequests = [];
}

function persistCache() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(localRequests, null, 2), 'utf8');
  } catch (err) {
    // Non-fatal if filesystem is readonly in production/serverless
  }
}

const cleanDomain = (domain) =>
  String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '');

/**
 * Submit a new college access request.
 */
export async function createCollegeRequest({ college_name, college_domain, example_email, notes }) {
  const domain = cleanDomain(college_domain);
  const name = String(college_name || '').trim();
  const email = String(example_email || '').trim().toLowerCase();
  const cleanNotes = String(notes || '').trim();

  // 1. Check if the domain is already approved in colleges table
  const existingCollege = await db.findOne(TABLES.colleges, { domain });
  if (existingCollege) {
    return {
      alreadyApproved: true,
      college: existingCollege,
      message: `The college domain (@${domain}) is already approved! You can sign up right away.`,
    };
  }

  // 2. Check if a request for this domain is already pending in DB
  try {
    const pendingInDb = await db.findOne('college_requests', { college_domain: domain, status: 'pending' });
    if (pendingInDb) {
      return {
        alreadyPending: true,
        request: pendingInDb,
        message: `A request for @${domain} (${pendingInDb.college_name}) has already been submitted and is currently pending admin review.`,
      };
    }
  } catch (_) {
    // Fallback to local check
    const pendingLocal = localRequests.find((r) => r.college_domain === domain && r.status === 'pending');
    if (pendingLocal) {
      return {
        alreadyPending: true,
        request: pendingLocal,
        message: `A request for @${domain} (${pendingLocal.college_name}) has already been submitted and is currently pending admin review.`,
      };
    }
  }

  const newRecord = {
    id: crypto.randomUUID(),
    college_name: name,
    college_domain: domain,
    example_email: email,
    notes: cleanNotes,
    status: 'pending',
    admin_reply: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Try saving to DB first
  try {
    const inserted = await db.insert('college_requests', newRecord);
    if (inserted) {
      localRequests = [newRecord, ...localRequests.filter((r) => r.id !== newRecord.id)];
      persistCache();
      return { request: inserted, created: true };
    }
  } catch (err) {
    console.warn('[CollegeRequests] Supabase table college_requests not ready, using local persistence fallback:', err.message);
  }

  // Fallback to local JSON storage
  localRequests = [newRecord, ...localRequests.filter((r) => r.id !== newRecord.id)];
  persistCache();
  return { request: newRecord, created: true };
}

/**
 * Retrieve all college requests for admin review.
 */
export async function getAllCollegeRequests() {
  try {
    const dbRequests = await db.findMany('college_requests', {}, { orderBy: 'created_at', ascending: false, limit: 200 });
    if (Array.isArray(dbRequests) && dbRequests.length > 0) {
      // Merge with any local cache
      const map = new Map();
      localRequests.forEach((r) => map.set(r.id, r));
      dbRequests.forEach((r) => map.set(r.id, r));
      return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  } catch (_) {}

  return [...localRequests].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Approve a college access request:
 * 1. Inserts domain into public.colleges table
 * 2. Updates request status to 'approved'
 * 3. Dispatches automated congratulations email to the student
 */
export async function approveCollegeRequest(requestId, adminEmail = 'kruthin123@gmail.com') {
  const requests = await getAllCollegeRequests();
  const reqItem = requests.find((r) => r.id === requestId);
  if (!reqItem) {
    throw new Error('College request not found.');
  }

  const domain = cleanDomain(reqItem.college_domain);
  const name = reqItem.college_name;
  const studentEmail = reqItem.example_email;
  const now = new Date().toISOString();

  // 1. Add or update college in public.colleges
  let college = await db.findOne(TABLES.colleges, { domain });
  if (!college) {
    college = await db.insert(TABLES.colleges, { domain, name });
  }

  // 2. Update request status in DB / local
  reqItem.status = 'approved';
  reqItem.admin_reply = 'Approved by administrator.';
  reqItem.updated_at = now;

  try {
    await db.update('college_requests', { id: requestId }, { status: 'approved', admin_reply: 'Approved by administrator.', updated_at: now });
  } catch (_) {}

  localRequests = localRequests.map((r) => (r.id === requestId ? reqItem : r));
  persistCache();

  // 3. Send automated notification email to the student
  const frontendUrl = 'http://localhost:5173';
  const subject = `🎉 Approved: ${name} is now on SkillBridge!`;
  const text = `Hello,\n\nGreat news! Your request to add ${name} (@${domain}) to SkillBridge has been reviewed and officially APPROVED!\n\nYou and all fellow students from ${name} can now sign up, post freelance gigs, and exchange skills using your college email addresses.\n\nSign up here: ${frontendUrl}/register\n\nWelcome to SkillBridge!\n\nBest regards,\nSkillBridge Campus Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 10px 16px; margin-bottom: 12px;">
          <span style="font-size: 24px;">🎓</span>
        </div>
        <h1 style="color: #047857; margin: 0; font-size: 22px; font-weight: 800;">College Access Approved!</h1>
        <p style="color: #64748b; font-size: 13px; margin-top: 6px;">SkillBridge Campus Network</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
        Hello,
      </p>

      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
        Great news! We have approved your request to add <strong>${name}</strong> (<code>@${domain}</code>) to SkillBridge.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 6px;">Approved Academic Domain</div>
        <div style="font-size: 16px; font-weight: 700; color: #0f172a;">@${domain}</div>
        <div style="font-size: 13px; color: #334155; margin-top: 2px;">${name}</div>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
        You and all your campus peers can now create an account, post freelance tasks, find tutors, and earn trust badges on campus.
      </p>

      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${frontendUrl}/register" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
          Create Your Account Now →
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; text-align: center; margin: 0;">
        SkillBridge Peer Freelancing &amp; Skill Exchange &bull; Verified Campus Network
      </p>
    </div>
  `;

  sendMail({ to: studentEmail, subject, text, html }).catch((err) => {
    console.warn('[CollegeRequests] Failed to send approval email:', err.message);
  });

  return { success: true, college, request: reqItem };
}

/**
 * Reject a college access request:
 * 1. Updates request status to 'rejected'
 * 2. Sends automated explanation email to the student
 */
export async function rejectCollegeRequest(requestId, reason = '') {
  const requests = await getAllCollegeRequests();
  const reqItem = requests.find((r) => r.id === requestId);
  if (!reqItem) {
    throw new Error('College request not found.');
  }

  const name = reqItem.college_name;
  const domain = reqItem.college_domain;
  const studentEmail = reqItem.example_email;
  const cleanReason = String(reason || '').trim() || 'This domain could not be verified as an accredited academic institution at this time.';
  const now = new Date().toISOString();

  reqItem.status = 'rejected';
  reqItem.admin_reply = cleanReason;
  reqItem.updated_at = now;

  try {
    await db.update('college_requests', { id: requestId }, { status: 'rejected', admin_reply: cleanReason, updated_at: now });
  } catch (_) {}

  localRequests = localRequests.map((r) => (r.id === requestId ? reqItem : r));
  persistCache();

  // Send automated email to student
  const subject = `Update regarding your SkillBridge College Request (${name})`;
  const text = `Hello,\n\nThank you for requesting to add ${name} (@${domain}) to SkillBridge.\n\nAfter review by our administration team, we were unable to approve this domain at this time.\n\nReason: ${cleanReason}\n\nIf you believe this was an error or can provide further institutional verification, please reach out to our campus support team.\n\nBest regards,\nSkillBridge Campus Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 9999px; padding: 10px 16px; margin-bottom: 12px;">
          <span style="font-size: 24px;">ℹ️</span>
        </div>
        <h1 style="color: #be123c; margin: 0; font-size: 20px; font-weight: 800;">College Request Update</h1>
        <p style="color: #64748b; font-size: 13px; margin-top: 6px;">SkillBridge Campus Network</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
        Hello,
      </p>

      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
        Thank you for submitting a request to add <strong>${name}</strong> (<code>@${domain}</code>) to SkillBridge.
      </p>

      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
        After review by our administration team, we were unable to approve this domain at this time:
      </p>

      <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #9f1239; margin-bottom: 4px;">Admin Feedback</div>
        <div style="font-size: 14px; color: #881337;">${cleanReason}</div>
      </div>

      <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 24px;">
        If you have an official college website, student handbook, or accredited domain documentation you would like us to review, please contact our support desk.
      </p>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; text-align: center; margin: 0;">
        SkillBridge Peer Freelancing &amp; Skill Exchange &bull; Verified Campus Network
      </p>
    </div>
  `;

  sendMail({ to: studentEmail, subject, text, html }).catch((err) => {
    console.warn('[CollegeRequests] Failed to send rejection email:', err.message);
  });

  return { success: true, request: reqItem };
}

/**
 * Delete a college access request.
 */
export async function deleteCollegeRequest(requestId) {
  try {
    await db.remove('college_requests', { id: requestId });
  } catch (_) {}

  localRequests = localRequests.filter((r) => r.id !== requestId);
  persistCache();
  return { success: true };
}
