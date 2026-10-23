import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createFirestoreDb } from './firestoreAdapter.js';

const projectId = process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT;
const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (!getApps().length) {
  initializeApp({
    ...(projectId ? { projectId } : {}),
    ...(isEmulator ? {} : { credential: applicationDefault() }),
  });
}

export const firestoreDb = createFirestoreDb(getFirestore());
