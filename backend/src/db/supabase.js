import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { memoryDb } from './memory.js';

/**
 * Database configuration and drivers for supabase.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

/**
 * Server-side Supabase client. It uses the service-role key, which bypasses
 * Row Level Security, so this module must never be imported by the frontend.
 * Every request is authorised in our own middleware before it reaches here.
 */
export const supabase = createClient(env.supabase.url, env.supabase.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const DOWNTIME_MESSAGE =
  'The database service is unavailable. Check the backend database configuration and connectivity, then try again.';

export const isHtmlOrDowntimeError = (text) => {
  if (!text || typeof text !== 'string') return false;
  return (
    /<[a-z][\s\S]*>/i.test(text) ||
    text.includes('<!DOCTYPE') ||
    text.includes('<html') ||
    text.includes('<body') ||
    /521|502|503|504|cloudflare|web server is down/i.test(text) ||
    /fetch failed|econnrefused|enotfound|etimedout|network\s*error/i.test(text)
  );
};

export const sanitizeDbErrorMessage = (error) => {
  if (!error) return DOWNTIME_MESSAGE;
  const rawMsg = typeof error === 'string' ? error : (error.message || '');
  const rawDetails = typeof error?.details === 'string' ? error.details : '';
  const combined = `${rawMsg} ${rawDetails}`.trim();

  if (isHtmlOrDowntimeError(combined)) {
    return DOWNTIME_MESSAGE;
  }

  const stripped = rawMsg.replace(/<[^>]*>?/gm, '').trim();
  return stripped ? `Database error: ${stripped}` : DOWNTIME_MESSAGE;
};

const fail = (error) => {
  console.error('[Supabase Error]', error?.message ? String(error.message).slice(0, 300) : error);
  const cleanMessage = sanitizeDbErrorMessage(error);
  const isDowntime =
    isHtmlOrDowntimeError(error?.message) ||
    isHtmlOrDowntimeError(error?.details) ||
    cleanMessage === DOWNTIME_MESSAGE;
  throw new ApiError(isDowntime ? 503 : 500, cleanMessage);
};

const isMissingTable = (err) =>
  err?.code === '42P01' ||
  (typeof err?.message === 'string' && (
    err.message.includes('does not exist') ||
    err.message.includes('relation') ||
    err.message.includes('schema cache') ||
    err.message.includes('Could not find the table')
  ));

const applyWhere = (query, where = {}) =>
  Object.entries(where).reduce((acc, [column, value]) => acc.eq(column, value), query);

export const supabaseDb = {
  kind: 'supabase',

  async insert(table, row) {
    try {
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) {
        if (isMissingTable(error)) return memoryDb.insert(table, row);
        fail(error);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (isMissingTable(err)) return memoryDb.insert(table, row);
      fail(err);
    }
  },

  async findOne(table, where) {
    try {
      const { data, error } = await applyWhere(supabase.from(table).select('*'), where)
        .limit(1)
        .maybeSingle();
      if (error) {
        if (isMissingTable(error)) return memoryDb.findOne(table, where);
        fail(error);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (isMissingTable(err)) return memoryDb.findOne(table, where);
      fail(err);
    }
  },

  async findMany(table, where = {}, options = {}) {
    try {
      const { orderBy = 'created_at', ascending = false, limit = 50 } = options;
      const { data, error } = await applyWhere(supabase.from(table).select('*'), where)
        .order(orderBy, { ascending })
        .limit(limit);
      if (error) {
        if (isMissingTable(error)) return memoryDb.findMany(table, where, options);
        fail(error);
      }
      return data ?? [];
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (isMissingTable(err)) return memoryDb.findMany(table, where, options);
      fail(err);
    }
  },

  async update(table, where, patch) {
    try {
      const { data, error } = await applyWhere(supabase.from(table).update(patch), where)
        .select()
        .maybeSingle();
      if (error) {
        if (isMissingTable(error)) return memoryDb.update(table, where, patch);
        fail(error);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (isMissingTable(err)) return memoryDb.update(table, where, patch);
      fail(err);
    }
  },

  async updateMany(table, where, patch) {
    try {
      const { data, error } = await applyWhere(supabase.from(table).update(patch), where)
        .select();
      if (error) {
        if (isMissingTable(error)) return memoryDb.updateMany(table, where, patch);
        fail(error);
      }
      return data ? data.length : 0;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (isMissingTable(err)) return memoryDb.updateMany(table, where, patch);
      fail(err);
    }
  },

  async remove(table, where) {
    try {
      const { error } = await applyWhere(supabase.from(table).delete(), where);
      if (error) {
        if (isMissingTable(error)) return memoryDb.remove(table, where);
        fail(error);
      }
      return true;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (isMissingTable(err)) return memoryDb.remove(table, where);
      fail(err);
    }
  },
};

