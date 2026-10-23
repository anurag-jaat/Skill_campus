import { env, isFirestoreConfigured, isSupabaseConfigured } from '../config/env.js';
import { memoryDb } from './memory.js';

/**
 * Database configuration and drivers for index.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

/**
 * Single data-access entry point.
 *
 * Both drivers expose the same five methods, so no module above this layer
 * needs to know whether it is talking to Postgres or to a Map:
 *
 *   db.insert(table, row)
 *   db.findOne(table, where)
 *   db.findMany(table, where, { orderBy, ascending, limit })
 *   db.update(table, where, patch)
 *   db.updateMany(table, where, patch)
 *   db.remove(table, where)
 *
 * Cloud database drivers are imported lazily so local mock mode does not need
 * provider credentials or make network calls during application startup.
 */
/** Table names, kept in one place so a typo becomes an import error. */
export const TABLES = {
  users: 'users',
  listings: 'listings',
  bids: 'bids',
  exchanges: 'exchanges',
  reviews: 'reviews',
  messages: 'messages',
  reports: 'reports',
  admin_actions: 'admin_actions',
  colleges: 'colleges',
  support_tickets: 'support_tickets',
  support_messages: 'support_messages',
  otp_codes: 'otp_codes',
};

let db = memoryDb;

if (isFirestoreConfigured) {
  const { firestoreDb } = await import('./firestore.js');
  db = firestoreDb;
} else if (env.databaseDriver === 'supabase' && isSupabaseConfigured) {
  const { supabaseDb } = await import('./supabase.js');
  db = supabaseDb;
}

if (db.kind === 'memory') {
  const college = await db.findOne(TABLES.colleges, { domain: env.college.domain });
  if (!college) {
    await db.insert(TABLES.colleges, {
      domain: env.college.domain,
      name: env.college.name,
    });
  }
}

export { db };
