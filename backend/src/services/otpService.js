import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { db, TABLES } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { sendMail } from './mailer.js';

/**
 * Implementation file for otpService.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

/**
 * One-time password hashes, stored through the configured database adapter.
 *
 * Persisting OTP state lets serverless instances verify codes even when the
 * request and registration are handled by different instances.
 */
const hash = (code) => createHash('sha256').update(code).digest('hex');

const generateCode = () => {
  const max = 10 ** env.otp.length;
  return String(randomInt(0, max)).padStart(env.otp.length, '0');
};

const buildMessage = (code) => ({
  subject: `Your SkillBridge verification code: ${code}`,
  text: [
    'SkillBridge',
    '',
    `Your verification code is: ${code}`,
    '',
    `It expires in ${env.otp.ttlMinutes} minutes and can be used once.`,
    'If you did not request this, you can ignore this email.',
  ].join('\n'),
});

/** Creates a code, stores its hash and hands it to the mailer. */
export async function issueOtp(email) {
  const code = generateCode();
  const existing = await db.findOne(TABLES.otp_codes, { email });
  const otp = {
    email,
    code_hash: hash(code),
    expires_at: Date.now() + env.otp.ttlMinutes * 60_000,
    attempts: 0,
  };

  if (existing) {
    await db.update(TABLES.otp_codes, { id: existing.id }, otp);
  } else {
    await db.insert(TABLES.otp_codes, otp);
  }

  const { subject, text } = buildMessage(code);
  const result = await sendMail({ to: email, subject, text });

  return { expiresInMinutes: env.otp.ttlMinutes, ...result };
}

/** Consumes a code. Throws if it is missing, expired, exhausted or wrong. */
export async function verifyOtp(email, code) {
  const suppliedHash = hash(String(code));
  if (typeof db.consumeOtp === 'function') {
    const result = await db.consumeOtp(email, suppliedHash, env.otp.maxAttempts);
    if (result === 'valid') return true;
    if (result === 'expired') {
      throw ApiError.badRequest('That code has expired. Request a new one.');
    }
    if (result === 'locked') {
      throw ApiError.tooManyRequests('Too many wrong attempts. Request a new code.');
    }
    if (result === 'invalid') {
      throw ApiError.badRequest('That code is not correct.');
    }
    throw ApiError.badRequest('No code was requested for this email. Request a new one.');
  }

  const entry = await db.findOne(TABLES.otp_codes, { email });

  if (!entry) {
    throw ApiError.badRequest('No code was requested for this email. Request a new one.');
  }
  if (Date.now() > entry.expires_at) {
    await db.remove(TABLES.otp_codes, { id: entry.id });
    throw ApiError.badRequest('That code has expired. Request a new one.');
  }
  if (entry.attempts >= env.otp.maxAttempts) {
    await db.remove(TABLES.otp_codes, { id: entry.id });
    throw ApiError.tooManyRequests('Too many wrong attempts. Request a new code.');
  }

  const supplied = Buffer.from(suppliedHash, 'hex');
  const stored = Buffer.from(entry.code_hash, 'hex');
  if (supplied.length !== stored.length || !timingSafeEqual(supplied, stored)) {
    await db.update(TABLES.otp_codes, { id: entry.id }, { attempts: entry.attempts + 1 });
    throw ApiError.badRequest('That code is not correct.');
  }

  await db.remove(TABLES.otp_codes, { id: entry.id });
  return true;
}
