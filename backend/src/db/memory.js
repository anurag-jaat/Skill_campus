import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

/**
 * Database configuration and drivers for memory.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

/**
 * In-memory stand-in for Supabase, used only while SUPABASE_URL /
 * SUPABASE_SERVICE_ROLE_KEY are unset. It lets the whole app run end to end
 * before the database exists. Everything is lost when the server restarts.
 */
const tables = new Map();

const rowsOf = (name) => {
  if (!tables.has(name)) tables.set(name, []);
  return tables.get(name);
};

const matches = (row, where = {}) =>
  Object.entries(where).every(([key, value]) => row[key] === value);

const compare = (a, b, key, ascending) => {
  const left = a[key] ?? '';
  const right = b[key] ?? '';
  if (left === right) return 0;
  const result = left < right ? -1 : 1;
  return ascending ? result : -result;
};

export const memoryDb = {
  kind: 'memory',

  async insert(name, row) {
    const uniqueKey = name === 'otp_codes' ? row.email : null;
    const record = {
      id: uniqueKey ? createHash('sha256').update(uniqueKey).digest('hex') : randomUUID(),
      created_at: new Date().toISOString(),
      ...row,
    };
    const rows = rowsOf(name);
    const existingIndex = uniqueKey ? rows.findIndex((candidate) => candidate.id === record.id) : -1;
    if (existingIndex >= 0) {
      rows[existingIndex] = record;
    } else {
      rows.push(record);
    }
    return { ...record };
  },

  async findOne(name, where) {
    const row = rowsOf(name).find((candidate) => matches(candidate, where));
    return row ? { ...row } : null;
  },

  async findMany(name, where = {}, options = {}) {
    const { orderBy = 'created_at', ascending = false, limit = 50 } = options;
    return rowsOf(name)
      .filter((row) => matches(row, where))
      .sort((a, b) => compare(a, b, orderBy, ascending))
      .slice(0, limit)
      .map((row) => ({ ...row }));
  },

  async update(name, where, patch) {
    const row = rowsOf(name).find((candidate) => matches(candidate, where));
    if (!row) return null;
    Object.assign(row, patch, { updated_at: new Date().toISOString() });
    return { ...row };
  },

  async updateMany(name, where, patch) {
    const now = new Date().toISOString();
    const matched = rowsOf(name).filter((candidate) => matches(candidate, where));
    matched.forEach((row) => Object.assign(row, patch, { updated_at: now }));
    return matched.length;
  },

  async consumeOtp(email, codeHash, maxAttempts) {
    const rows = rowsOf('otp_codes');
    const id = createHash('sha256').update(email).digest('hex');
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return 'missing';

    const entry = rows[index];
    if (Date.now() > entry.expires_at) {
      rows.splice(index, 1);
      return 'expired';
    }
    if (entry.attempts >= maxAttempts) {
      rows.splice(index, 1);
      return 'locked';
    }

    const supplied = Buffer.from(codeHash, 'hex');
    const stored = Buffer.from(entry.code_hash, 'hex');
    if (supplied.length !== stored.length || !timingSafeEqual(supplied, stored)) {
      Object.assign(entry, { attempts: entry.attempts + 1, updated_at: new Date().toISOString() });
      return 'invalid';
    }

    rows.splice(index, 1);
    return 'valid';
  },

  async remove(name, where) {
    const rows = rowsOf(name);
    const index = rows.findIndex((candidate) => matches(candidate, where));
    if (index === -1) return false;
    rows.splice(index, 1);
    return true;
  },
};
