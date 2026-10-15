import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 5;
const COOKIE_NAME = 'admin_session';

export async function POST(req) {
  try {
    const body = await req.json();
    const email = body?.email?.trim();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Store your Firebase Web API key in .env.local.
    const apiKey = process.env.FIREBASE_WEB_API_KEY;

    if (!apiKey) {
      console.error('FIREBASE_WEB_API_KEY is not configured');

      return NextResponse.json(
        { error: 'Firebase login configuration is missing' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const code = data?.error?.message || 'AUTH_ERROR';

      const messages = {
        EMAIL_NOT_FOUND: 'No account exists with this email',
        INVALID_EMAIL: 'Please enter a valid email',
        INVALID_PASSWORD: 'Incorrect password',
        INVALID_LOGIN_CREDENTIALS: 'Incorrect email or password',
        USER_DISABLED: 'This account has been disabled',
        TOO_MANY_ATTEMPTS_TRY_LATER:
          'Too many attempts. Please try again later',
      };

      const status =
        code === 'TOO_MANY_ATTEMPTS_TRY_LATER' ? 429 : 401;

      return NextResponse.json(
        { error: messages[code] || 'Firebase authentication failed' },
        { status }
      );
    }

    const { idToken, localId, email: authenticatedEmail } = data;

    if (!idToken || !localId) {
      return NextResponse.json(
        { error: 'Firebase did not return valid login credentials' },
        { status: 401 }
      );
    }

    // Requires valid Firebase Admin SDK credentials.
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: EXPIRES_IN_MS,
    });

    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: EXPIRES_IN_MS / 1000,
    });

    return NextResponse.json({
      uid: localId,
      email: authenticatedEmail,
    });
  } catch (error) {
    console.error('Admin login error:', error);

    return NextResponse.json(
      { error: 'Unable to log in. Check the server configuration.' },
      { status: 500 }
    );
  }
}