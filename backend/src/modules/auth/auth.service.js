import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { db, TABLES } from '../../db/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { signToken } from '../../middleware/requireAuth.js';
import { issueOtp, verifyOtp } from '../../services/otpService.js';
import { recordUserActivity } from '../../services/loginTracker.js';

/**
 * Business logic service for auth module.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const normaliseEmail = (email) => String(email).trim().toLowerCase();

const getCollegeForEmail = async (email, { create = false } = {}) => {
  if (email.includes('kruthin123')) return null; // Admin bypass

  const domain = email.split('@')[1];
  if (!domain) {
    throw ApiError.badRequest('Invalid email format.');
  }

  const existingCollege = await db.findOne(TABLES.colleges, { domain });
  if (existingCollege || !create) {
    return existingCollege;
  }

  try {
    return await db.insert(TABLES.colleges, { domain, name: domain });
  } catch (error) {
    // Another registration may have added this email domain concurrently.
    const college = await db.findOne(TABLES.colleges, { domain });
    if (college) return college;
    throw error;
  }
};

/** Send an OTP code (used by both registration and forgot-password). */
export async function requestOtp(rawEmail) {
  const email = normaliseEmail(rawEmail);
  await getCollegeForEmail(email);
  return issueOtp(email);
}

/** Sign in with email + password. */
export async function loginWithPassword(rawEmail, password) {
  const email = normaliseEmail(rawEmail);
  await getCollegeForEmail(email);

  const user = await db.findOne(TABLES.users, { email });
  if (!user) {
    throw ApiError.unauthorized('No account found. Please register first.');
  }
  
  if (user.is_blocked) {
    const actions = await db.findMany(
      TABLES.admin_actions,
      { user_id: user.id, action: 'block' },
      { orderBy: 'created_at', ascending: false, limit: 1 }
    );
    const blockReason = actions?.[0]?.message || 'No reason provided.';
    const blockImage = actions?.[0]?.image_url || null;
    throw ApiError.forbidden(`Your account has been blocked. Reason: ${blockReason}`, { image_url: blockImage });
  }

  if (!user.password_hash) {
    throw ApiError.badRequest(
      'No password set on this account. Use "Forgot password" to set one.'
    );
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw ApiError.unauthorized('Incorrect password.');
  }

  // Record user last login timestamp
  await recordUserActivity(user.id);

  return { token: signToken(user), user };
}

/** Register a new user — requires email, password, and a valid OTP. */
export async function registerWithOtp(rawEmail, password, code, rollNumber) {
  const email = normaliseEmail(rawEmail);
  await verifyOtp(email, code); // throws if invalid
  const college = await getCollegeForEmail(email, { create: true });

  const existing = await db.findOne(TABLES.users, { email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists. Please sign in.');
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await db.insert(TABLES.users, {
    email,
    full_name: '',
    bio: '',
    password_hash: hash,
    roll_number: rollNumber,
    is_blocked: false,
    skills_offered: [],
    skills_wanted: [],
    rating_average: 0,
    rating_count: 0,
    college_id: college ? college.id : null,
  });

  // Record initial activity
  await recordUserActivity(user.id);

  return { token: signToken(user), user };
}

/** Forgot-password flow: verify OTP, then set new password. */
export async function resetPassword(rawEmail, code, password) {
  const email = normaliseEmail(rawEmail);
  await getCollegeForEmail(email);
  await verifyOtp(email, code);

  const user = await db.findOne(TABLES.users, { email });
  if (!user) {
    throw ApiError.notFound('No account found with this email.');
  }

  const hash = await bcrypt.hash(password, 12);
  const updated = await db.update(TABLES.users, { id: user.id }, { password_hash: hash });

  return { token: signToken(updated), user: updated };
}

/** Change password while already signed in. */
export async function setPassword(userId, password) {
  const hash = await bcrypt.hash(password, 12);
  const user = await db.update(TABLES.users, { id: userId }, { password_hash: hash });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function getUserById(id) {
  const user = await db.findOne(TABLES.users, { id });
  if (!user) throw ApiError.unauthorized('User not found (please sign in again)');
  return user;
}
