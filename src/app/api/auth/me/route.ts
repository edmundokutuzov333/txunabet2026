import { NextResponse } from 'next/server';
import { requireIdentity } from '@/server/authorization';

export async function GET() {
  try {
    const identity = await requireIdentity();
    return NextResponse.json({
      user: {
        uid: identity.uid,
        email: identity.email,
        companyId: identity.companyId,
        role: identity.role,
        permissions: identity.permissions,
        departmentIds: identity.departmentIds,
      },
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status });
  }
}
