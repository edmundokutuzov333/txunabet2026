import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requireIdentity } from '@/server/authorization';
import { getAdminDb } from '@/server/firebase/admin';

export async function GET() {
  try {
    const identity = await requireIdentity();
    const snapshot = await getAdminDb().collection('notifications').doc(identity.uid).collection('items').orderBy('createdAt', 'desc').limit(50).get();
    const notifications = snapshot.docs.map((doc) => doc.data());
    return NextResponse.json({ notifications, unreadCount: notifications.filter((item) => !item.read).length });
  } catch {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 401 });
  }
}

export async function PATCH() {
  try {
    const identity = await requireIdentity();
    const snapshot = await getAdminDb().collection('notifications').doc(identity.uid).collection('items').where('read', '==', false).limit(100).get();
    const batch = getAdminDb().batch();
    snapshot.docs.forEach((doc) => batch.update(doc.ref, { read: true, readAt: FieldValue.serverTimestamp() }));
    await batch.commit();
    return NextResponse.json({ ok: true, count: snapshot.size });
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
}
