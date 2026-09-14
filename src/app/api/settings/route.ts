import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity } from '@/server/authorization';
import { writeAuditEvent } from '@/server/repositories/audit';

const DEFAULTS = { language: 'pt', timezone: 'Africa/Maputo', theme: 'dark', fontSize: 'medium', emailNotifications: true, pushNotifications: true, mentionsNotifications: true, highContrast: false, reducedMotion: false, voiceOver: false };

export async function GET() {
  try {
    const identity = await requireIdentity();
    const db = getAdminDb();
    const [settings, profile] = await Promise.all([db.collection('user_settings').doc(identity.uid).get(), db.collection('users').doc(identity.uid).get()]);
    return NextResponse.json({ settings: { ...DEFAULTS, ...(settings.data() ?? {}) }, profile: { email: profile.data()?.email ?? identity.email, role: profile.data()?.role ?? identity.role } });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'SETTINGS_LOAD_FAILED';
    return NextResponse.json({ error: code }, { status: code === 'UNAUTHENTICATED' ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const identity = await requireIdentity();
    const payload = await request.json() as Record<string, unknown>;
    const allowed = Object.keys(DEFAULTS);
    const patch = Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key)));
    await getAdminDb().collection('user_settings').doc(identity.uid).set({ ...patch, companyId: identity.companyId, updatedBy: identity.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'settings.update', resourceType: 'user_settings', resourceId: identity.uid, metadata: { fields: Object.keys(patch) } });
    return NextResponse.json({ ok: true, settings: patch });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'SETTINGS_UPDATE_FAILED';
    return NextResponse.json({ error: code }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await requireIdentity();
    const body = await request.json() as Record<string, unknown>;
    if (body.action !== 'export') return NextResponse.json({ error: 'ACTION_NOT_FOUND' }, { status: 400 });
    const db = getAdminDb();
    const [profile, settings, membership, notifications] = await Promise.all([
      db.collection('users').doc(identity.uid).get(),
      db.collection('user_settings').doc(identity.uid).get(),
      db.collection('companies').doc(identity.companyId).collection('members').doc(identity.uid).get(),
      db.collection('notifications').doc(identity.uid).collection('items').limit(100).get(),
    ]);
    return NextResponse.json({ export: { exportedAt: new Date().toISOString(), profile: profile.data() ?? {}, settings: { ...DEFAULTS, ...(settings.data() ?? {}) }, membership: membership.data() ?? {}, notifications: notifications.docs.map((doc) => ({ id: doc.id, ...doc.data() })) } });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'EXPORT_FAILED';
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
