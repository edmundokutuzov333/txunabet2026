import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminAuth } from '@/server/firebase/admin';
import { resolveCompanyMembership } from '@/server/repositories/identity';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/server/authorization';

const TEST_AUTH_COOKIE = '__oryon_test_auth';
const TEST_AUTH_UID = process.env.ORYON_TEST_AUTH_UID || '6NF2GKox6KOzGcJskE4Ej6cleIE2';
const TEST_AUTH_EMAIL = process.env.ORYON_TEST_AUTH_EMAIL || 'admin@txunabet.com';
const TEST_AUTH_BYPASS = process.env.ORYON_TEST_AUTH_BYPASS === 'true';

const bodySchema = z.object({ idToken: z.string().min(20).max(10_000) });

function decodeIdTokenPayload(idToken: string): { sub?: string; email?: string } {
  const [, encodedPayload] = idToken.split('.');
  if (!encodedPayload) throw new Error('INVALID_ID_TOKEN');
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as { sub?: unknown; email?: unknown };
  return {
    sub: typeof payload.sub === 'string' ? payload.sub : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());

    if (TEST_AUTH_BYPASS) {
      const payload = decodeIdTokenPayload(body.idToken);
      if (payload.sub !== TEST_AUTH_UID || payload.email?.toLowerCase() !== TEST_AUTH_EMAIL.toLowerCase()) {
        return NextResponse.json({ ok: false, error: 'A conta de teste não corresponde à identidade configurada.' }, { status: 403 });
      }

      const response = NextResponse.json({
        ok: true,
        uid: TEST_AUTH_UID,
        companyId: process.env.ORYON_TEST_AUTH_COMPANY_ID || 'oryon-test-company',
        testMode: true,
      });
      response.cookies.set({
        name: TEST_AUTH_COOKIE,
        value: 'enabled',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
      return response;
    }

    const decoded = await getAdminAuth().verifyIdToken(body.idToken, true);
    const membership = await resolveCompanyMembership(decoded.uid);

    if (!membership || membership.membership.status !== 'active') {
      return NextResponse.json({ ok: false, error: 'A conta não possui acesso empresarial ativo.' }, { status: 403 });
    }

    const sessionCookie = await getAdminAuth().createSessionCookie(body.idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });

    const response = NextResponse.json({ ok: true, uid: decoded.uid, companyId: membership.companyId });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });
  }
}
