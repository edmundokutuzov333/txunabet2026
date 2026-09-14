import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/server/firebase/admin';
import { requireIdentity } from '@/server/authorization';
import { writeAuditEvent } from '@/server/repositories/audit';

export async function GET() {
  try {
    const identity = await requireIdentity();
    const db = getAdminDb();
    const [profile, logs, sessions] = await Promise.all([
      db.collection('users').doc(identity.uid).get(),
      db.collection('security_events').where('companyId', '==', identity.companyId).where('userId', '==', identity.uid).limit(50).get(),
      db.collection('security_sessions').where('companyId', '==', identity.companyId).where('userId', '==', identity.uid).limit(20).get(),
    ]);
    const profileData = profile.data() ?? {};
    return NextResponse.json({
      settings: { mfaRequired: profileData.mfaRequired !== false, mfaEnabled: profileData.mfaEnabled === true },
      logs: logs.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a,b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))),
      sessions: sessions.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'SECURITY_LOAD_FAILED';
    return NextResponse.json({ error: code }, { status: code === 'UNAUTHENTICATED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await requireIdentity();
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? '');
    const db = getAdminDb();
    if (action === 'mfa') {
      const enabled = Boolean(body.enabled);
      await db.collection('users').doc(identity.uid).set({ mfaEnabled: enabled, updatedAt: FieldValue.serverTimestamp(), updatedBy: identity.uid }, { merge: true });
      await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: enabled ? 'security.mfa.enable' : 'security.mfa.disable', resourceType: 'user', resourceId: identity.uid });
      return NextResponse.json({ ok: true, enabled });
    }
    if (action === 'revoke-all') {
      await getAdminAuth().revokeRefreshTokens(identity.uid);
      const sessions = await db.collection('security_sessions').where('companyId', '==', identity.companyId).where('userId', '==', identity.uid).limit(50).get();
      if (!sessions.empty) { const batch = db.batch(); sessions.docs.forEach((doc) => batch.update(doc.ref, { revokedAt: Timestamp.now(), state: 'revoked', updatedAt: Timestamp.now() })); await batch.commit(); }
      await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'security.sessions.revoke_all', resourceType: 'session', resourceId: identity.uid });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'ACTION_NOT_FOUND' }, { status: 400 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'SECURITY_ACTION_FAILED';
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
