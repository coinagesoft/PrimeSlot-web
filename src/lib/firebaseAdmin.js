import {
  cert,
  getApp,
  getApps,
  initializeApp,
} from 'firebase-admin/app';

import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    return {
      ...account,
      projectId: account.projectId || account.project_id,
      clientEmail: account.clientEmail || account.client_email,
      privateKey: (account.privateKey || account.private_key)
        ?.replace(/\\n/g, '\n'),
    };
  }

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
  } = process.env;

  if (
    FIREBASE_PROJECT_ID &&
    FIREBASE_CLIENT_EMAIL &&
    FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

const serviceAccount = getServiceAccount();
const projectId =
  serviceAccount?.projectId ||
  process.env.FIREBASE_PROJECT_ID ||
  'prime-slot-35cd9';

const existingApps = getApps();

const app = existingApps.length
  ? getApp()
  : initializeApp({
      ...(serviceAccount
        ? { credential: cert(serviceAccount) }
        : {}),
      projectId,
      databaseURL:
        process.env.FIREBASE_DATABASE_URL ||
        `https://${projectId}-default-rtdb.firebaseio.com`,
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        `${projectId}.firebasestorage.app`,
    });

export const adminAuth = getAuth(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const bucket = storage.bucket();
export const messaging = getMessaging(app);

export function getAdminApp() {
  return {
    adminApp: app,
    adminAuth,
    rtdb,
    storage,
    bucket,
    messaging,
  };
}

const admin = { app };
export default admin;