import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity } from '@/server/authorization';
import { writeAuditEvent } from '@/server/repositories/audit';

export async function GET() {
  try {
    const identity = await requireIdentity();
    const db = getAdminDb();
    const [profile, activities] = await Promise.all([
      db.collection('users').doc(identity.uid).get(),
      db.collection('activities').where('companyId', '==', identity.companyId).where('actorId', '==', identity.uid).limit(40).get(),
    ]);
    return NextResponse.json({
      profile: { uid: identity.uid, companyId: identity.companyId, role: identity.role, email: identity.email, ...(profile.data() ?? {}) },
      activities: activities.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a,b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PROFILE_LOAD_FAILED';
    return NextResponse.json({ error: code }, { status: code === 'UNAUTHENTICATED' ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const identity = await requireIdentity();
    const body = await request.json() as Record<string, unknown>;
    const patch = Object.fromEntries(Object.entries(body).filter(([key]) => ['displayName','bio','phone','location','departmentId'].includes(key)));
    await getAdminDb().collection('users').doc(identity.uid).set({ ...patch, updatedBy: identity.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'profile.update', resourceType: 'user', resourceId: identity.uid, metadata: { fields: Object.keys(patch) } });
    return NextResponse.json({ ok: true, profile: patch });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PROFILE_UPDATE_FAILED';
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
