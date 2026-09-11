import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminAuth } from '@/server/firebase/admin';
import { resolveCompanyMembership } from '@/server/repositories/identity';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/server/authorization';

const bodySchema = z.object({ idToken: z.string().min(20).max(10_000) });

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
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
