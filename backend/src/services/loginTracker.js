import fs from 'fs';
import path from 'path';
import { db, TABLES } from '../db/index.js';

/**
 * Service to track, persist, and format student last seen and online activity status.
 * @author = kruthinraj
 * @date = 2026-10-16
 */

const CACHE_FILE = process.env.LOGIN_CACHE_FILE ||
  path.resolve(process.cwd(), 'data', 'last_logins.json');
let memoryLogins = {};

// Load persisted logins cache on startup if exists
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    memoryLogins = JSON.parse(raw);
  }
} catch (e) {
  memoryLogins = {};
}

function persistCache() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryLogins, null, 2), 'utf8');
  } catch (err) {
    // Non-fatal if filesystem is readonly in production/serverless
  }
}

// In-memory exact timestamps for real-time online detection (accurate to the millisecond)
const lastSeenExactTimestamps = {};
// Throttle database writes so we don't spam Postgres more than once every 3 minutes per user
const lastDbUpdateTimestamps = {};

/**
 * Record user activity / last seen timestamp.
 * Updates exact in-memory timestamp, local persistence cache, and throttled DB column.
 */
export async function recordUserActivity(userId) {
  if (!userId) return;
  const now = new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();

  // Instant in-memory and local cache update
  lastSeenExactTimestamps[userId] = nowMs;
  memoryLogins[userId] = nowIso;
  persistCache();

  // Check if we should update database (at most once every 3 minutes per user)
  const lastDbWrite = lastDbUpdateTimestamps[userId];
  if (lastDbWrite && nowMs - lastDbWrite < 3 * 60 * 1000) {
    return;
  }

  lastDbUpdateTimestamps[userId] = nowMs;

  try {
    // Attempt updating last_login_at on database
    await db.update(TABLES.users, { id: userId }, { last_login_at: nowIso, updated_at: nowIso });
  } catch (err) {
    // If last_login_at column does not exist yet in Postgres, update updated_at
    try {
      await db.update(TABLES.users, { id: userId }, { updated_at: nowIso });
    } catch (_) {}
  }
}

/**
 * Retrieve the most accurate last seen / login timestamp for a user.
 */
export function getUserLastLogin(user) {
  if (!user) return null;
  const inMemoryMs = lastSeenExactTimestamps[user.id];
  if (inMemoryMs) {
    return new Date(inMemoryMs).toISOString();
  }
  return (
    memoryLogins[user.id] ||
    user.last_login_at ||
    user.updated_at ||
    user.created_at ||
    null
  );
}

/**
 * Check if a user is currently online (seen within thresholdMinutes, default 10 mins).
 */
export function isUserOnline(userId, thresholdMinutes = 10) {
  if (!userId) return false;
  const lastMs = lastSeenExactTimestamps[userId] || (memoryLogins[userId] ? new Date(memoryLogins[userId]).getTime() : null);
  if (!lastMs) return false;
  return (Date.now() - lastMs) <= (thresholdMinutes * 60 * 1000);
}
