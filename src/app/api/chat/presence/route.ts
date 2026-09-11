import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity } from '@/server/authorization';

const schema = z.object({ status: z.enum(['online', 'away', 'busy', 'dnd', 'offline']) });

export async function POST(request: Request) {
  try {
    const identity = await requireIdentity();
    const { status } = schema.parse(await request.json());
    await getAdminDb().collection('presence').doc(identity.uid).set({
      userId: identity.uid,
      companyId: identity.companyId,
      status,
      lastSeenAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 90_000),
    }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'INVALID_REQUEST' }, { status: 400 });
  }
}
