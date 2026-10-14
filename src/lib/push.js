// Push notifications. Firebase Cloud Messaging is the one Firebase service that cannot be replaced by
// MySQL: Android/iOS devices only receive pushes through FCM (APNs/FCM). Everything else is gone.
// firebase-admin is loaded lazily and ONLY when a push is actually sent.
let cached;

async function getFcm() {
  if (cached) return cached;
  const { initializeApp, getApps, getApp, cert } = await import('firebase-admin/app');
  const { getMessaging } = await import('firebase-admin/messaging');

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    credential = cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  } else {
    throw new Error('FCM is not configured: set FIREBASE_SERVICE_ACCOUNT (or FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)');
  }
  const app = getApps().length ? getApp() : initializeApp({ credential });
  cached = getMessaging(app);
  return cached;
}

export const messaging = {
  // firebase-admin v13 removed sendMulticast(); sendEachForMulticast() returns the same shape
  // ({ responses, successCount, failureCount }) so the route code does not change.
  async sendMulticast(message) {
    return (await getFcm()).sendEachForMulticast(message);
  },
};
