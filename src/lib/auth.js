// Admin authentication without Firebase Auth.
//  - Admin accounts live in the MySQL table `admin_users` (scrypt password hashes).
//  - A login produces a signed JWT stored in the httpOnly `admin_session` cookie.
//  - Admin tokens are signed with ADMIN_JWT_SECRET (NOT the member JWT_SECRET) and carry an
//    audience claim, so a member token can never be accepted as an admin session.
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { generatePushId } from './ids.js';

const AUDIENCE = 'primeslot-admin';

function adminSecret() {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s || s.length < 16) {
    // Fail closed: never fall back to a known default for admin sessions.
    throw new Error('ADMIN_JWT_SECRET is not set (use a random string of at least 16 characters)');
  }
  return s;
}

export function signAdminToken({ uid, email }, expiresInSeconds = 60 * 60 * 24 * 5) {
  return jwt.sign({ email, role: 'admin' }, adminSecret(), {
    subject: String(uid),
    audience: AUDIENCE,
    expiresIn: expiresInSeconds,
  });
}

function verifyAdminToken(token) {
  const p = jwt.verify(token, adminSecret(), { audience: AUDIENCE });
  return { uid: p.sub, email: p.email || null, admin: true };
}

/* ---- password hashing (scrypt, no extra dependency) ---- */
const N = 16384, R = 8, P = 1, KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, n, r, p, saltHex, hashHex] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length, {
      N: Number(n), r: Number(r), p: Number(p),
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// Same method names the routes already call, so the guards in each route keep working unchanged.
export const adminAuth = {
  async verifySessionCookie(token /* , checkRevoked */) {
    return verifyAdminToken(token);
  },
  async verifyIdToken(token) {
    return verifyAdminToken(token);
  },
  async createUser({ email, displayName } = {}) {
    // No external accounts any more: just mint an id for the record the route is about to save.
    return { uid: generatePushId(), email: email || null, displayName: displayName || null };
  },
};

// Used by routes that expect "Authorization: Bearer <admin token>" (e.g. /api/users/:id).
// Returns the decoded admin ({ uid, email, admin: true }) or null.
export async function verifyAuth(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}
