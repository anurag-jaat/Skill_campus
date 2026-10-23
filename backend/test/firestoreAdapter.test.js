import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createFirestoreDb } from '../src/db/firestoreAdapter.js';

function createFakeFirestore() {
  const collections = new Map();
  const records = (name) => {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name);
  };

  const makeRef = (name, id) => ({
    id,
    async get() {
      const data = records(name).get(id);
      return { exists: Boolean(data), id, data: () => data };
    },
    async set(data) {
      records(name).set(id, { ...data });
    },
    async update(patch) {
      const current = records(name).get(id);
      if (!current) throw new Error('Document does not exist');
      records(name).set(id, { ...current, ...patch });
    },
    async delete() {
      records(name).delete(id);
    },
  });

  const firestore = {
    collection(name) {
      const filters = [];
      return {
        where(key, operation, value) {
          assert.equal(operation, '==');
          filters.push([key, value]);
          return this;
        },
        async get() {
          const docs = [...records(name).entries()]
            .filter(([, data]) => filters.every(([key, value]) => data[key] === value))
            .map(([id, data]) => ({
              id,
              ref: makeRef(name, id),
              data: () => ({ ...data }),
            }));
          return { docs };
        },
        doc(id) {
          return makeRef(name, id);
        },
      };
    },
    batch() {
      const operations = [];
      return {
        update(ref, patch) {
          operations.push(() => ref.update(patch));
        },
        async commit() {
          await Promise.all(operations.map((operation) => operation()));
        },
      };
    },
    async runTransaction(callback) {
      const operations = [];
      const result = await callback({
        get: (reference) => reference.get(),
        update: (reference, patch) => operations.push(() => reference.update(patch)),
        delete: (reference) => operations.push(() => reference.delete()),
      });
      await Promise.all(operations.map((operation) => operation()));
      return result;
    },
  };

  return { firestore, records };
}

test('Firestore adapter supports CRUD, filtering, sorting, and safe patching', async () => {
  const { firestore, records } = createFakeFirestore();
  const db = createFirestoreDb(firestore);

  const first = await db.insert('users', {
    email: 'first@example.edu',
    college_id: 'college-a',
    full_name: 'First',
    bio: 'keep',
  });
  const second = await db.insert('users', {
    email: 'second@example.edu',
    college_id: 'college-a',
    full_name: 'Second',
  });
  await db.insert('users', { email: 'other@example.edu', college_id: 'college-b' });

  assert.equal(first.id, (await db.findOne('users', { email: first.email })).id);
  assert.equal(await db.findOne('users', { email: 'missing@example.edu' }), null);

  const found = await db.findMany(
    'users',
    { college_id: 'college-a', full_name: 'Second' },
    { orderBy: 'full_name', ascending: true, limit: 1 }
  );
  assert.deepEqual(found.map((user) => user.id), [second.id]);

  const updated = await db.update('users', { id: first.id }, { bio: 'updated', ignored: undefined });
  assert.equal(updated.bio, 'updated');
  assert.equal(records('users').get(first.id).bio, 'updated');
  assert.equal('ignored' in records('users').get(first.id), false);

  assert.equal(
    await db.updateMany('users', { college_id: 'college-a' }, { is_blocked: true }),
    2
  );
  assert.equal(records('users').get(second.id).is_blocked, true);
  assert.equal(await db.remove('users', { id: second.id }), true);
  assert.equal(await db.remove('users', { id: second.id }), false);
});

test('Firestore adapter keeps college domains and OTPs on deterministic unique document ids', async () => {
  const { firestore } = createFakeFirestore();
  const db = createFirestoreDb(firestore);
  const first = await db.insert('colleges', { domain: 'lnct.ac.in', name: 'LNCT' });
  const repeated = await db.insert('colleges', { domain: 'lnct.ac.in', name: 'LNCT College' });
  const otp = await db.insert('otp_codes', { email: 'student@lnct.ac.in', code_hash: 'old' });
  const replacedOtp = await db.insert('otp_codes', { email: 'student@lnct.ac.in', code_hash: 'new' });

  assert.equal(repeated.id, first.id);
  assert.equal((await db.findMany('colleges', { domain: 'lnct.ac.in' })).length, 1);
  assert.equal(replacedOtp.id, otp.id);
  assert.equal((await db.findOne('otp_codes', { email: 'student@lnct.ac.in' })).code_hash, 'new');
});

test('Firestore adapter atomically validates, tracks attempts, and consumes OTPs', async () => {
  const { firestore } = createFakeFirestore();
  const db = createFirestoreDb(firestore);
  const email = 'student@lnct.ac.in';
  const codeHash = createHash('sha256').update('123456').digest('hex');
  await db.insert('otp_codes', {
    email,
    code_hash: codeHash,
    expires_at: Date.now() + 60_000,
    attempts: 0,
  });

  assert.equal(await db.consumeOtp(email, '0'.repeat(64), 5), 'invalid');
  assert.equal((await db.findOne('otp_codes', { email })).attempts, 1);
  assert.equal(await db.consumeOtp(email, codeHash, 5), 'valid');
  assert.equal(await db.consumeOtp(email, codeHash, 5), 'missing');
});
