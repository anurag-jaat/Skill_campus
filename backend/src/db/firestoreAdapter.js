import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

const nowIso = () => new Date().toISOString();
const deterministicId = (value) => createHash('sha256').update(value).digest('hex');

const compare = (a, b, key, ascending) => {
  const left = a[key] ?? '';
  const right = b[key] ?? '';
  if (left === right) return 0;
  const result = left < right ? -1 : 1;
  return ascending ? result : -result;
};

const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, clean(entry)])
    );
  }
  return value;
};

const matchesWhere = (row, where) =>
  Object.entries(where).every(
    ([key, value]) => JSON.stringify(row[key]) === JSON.stringify(value)
  );

export function createFirestoreDb(firestore) {
  const matchingDocuments = async (table, where = {}) => {
    const entries = Object.entries(where);
    let query = firestore.collection(table);

    // Use one indexed equality filter to avoid requiring composite indexes.
    if (entries.length) {
      const [key, value] = entries[0];
      query = query.where(key, '==', value);
    }

    const snapshot = await query.get();
    return snapshot.docs
      .map((document) => ({ document, row: { ...document.data(), id: document.id } }))
      .filter(({ row }) => matchesWhere(row, where));
  };

  return {
    kind: 'firestore',

    async insert(table, row) {
      const uniqueKey = table === 'colleges'
        ? row.domain
        : table === 'otp_codes'
          ? row.email
          : null;
      const id = uniqueKey ? deterministicId(uniqueKey) : randomUUID();
      const record = { id, created_at: nowIso(), ...clean(row) };
      await firestore.collection(table).doc(id).set(record);
      return record;
    },

    async findOne(table, where = {}) {
      const matches = await matchingDocuments(table, where);
      return matches.length ? matches[0].row : null;
    },

    async findMany(table, where = {}, options = {}) {
      const { orderBy = 'created_at', ascending = false, limit = 50 } = options;
      const matches = await matchingDocuments(table, where);
      return matches
        .map(({ row }) => row)
        .sort((a, b) => compare(a, b, orderBy, ascending))
        .slice(0, limit);
    },

    async update(table, where, patch) {
      const matches = await matchingDocuments(table, where);
      if (!matches.length) return null;

      const { document, row } = matches[0];
      const updated = { ...clean(patch), updated_at: nowIso() };
      await document.ref.update(updated);
      return { ...row, ...updated };
    },

    async updateMany(table, where, patch) {
      const matches = await matchingDocuments(table, where);
      const updatedAt = nowIso();
      const changes = { ...clean(patch), updated_at: updatedAt };

      for (let offset = 0; offset < matches.length; offset += 500) {
        const batch = firestore.batch();
        matches.slice(offset, offset + 500).forEach(({ document }) => {
          batch.update(document.ref, changes);
        });
        await batch.commit();
      }
      return matches.length;
    },

    async consumeOtp(email, codeHash, maxAttempts) {
      const reference = firestore.collection('otp_codes').doc(deterministicId(email));
      return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) return 'missing';

        const entry = snapshot.data();
        if (Date.now() > entry.expires_at) {
          transaction.delete(reference);
          return 'expired';
        }
        if (entry.attempts >= maxAttempts) {
          transaction.delete(reference);
          return 'locked';
        }

        const supplied = Buffer.from(codeHash, 'hex');
        const stored = Buffer.from(entry.code_hash, 'hex');
        if (supplied.length !== stored.length || !timingSafeEqual(supplied, stored)) {
          transaction.update(reference, { attempts: entry.attempts + 1, updated_at: nowIso() });
          return 'invalid';
        }

        transaction.delete(reference);
        return 'valid';
      });
    },

    async remove(table, where) {
      const matches = await matchingDocuments(table, where);
      if (!matches.length) return false;
      await matches[0].document.ref.delete();
      return true;
    },
  };
}
