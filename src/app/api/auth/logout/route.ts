import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/server/firebase/admin';
import { SESSION_COOKIE } from '@/server/authorization';

const TEST_AUTH_COOKIE = '__oryon_test_auth';

export async function POST() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;

  if (session) {
    try {
      const decoded = await getAdminAuth().verifySessionCookie(session, false);
      await getAdminAuth().revokeRefreshTokens(decoded.uid);
    } catch {
      // Always clear the local session cookie, even when the server session is invalid.
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: SESSION_COOKIE, value: '', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  response.cookies.set({ name: TEST_AUTH_COOKIE, value: '', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}

export async function DELETE() {
  return POST();
}
