import { NextResponse } from 'next/server';
import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity } from '@/server/authorization';

export async function GET() {
  try {
    const identity = await requireIdentity();
    const snapshot = await getAdminDb().collection('companies').doc(identity.companyId).collection('members').where('status', '==', 'active').get();
    const members = await Promise.all(snapshot.docs.map(async (member) => {
      const profile = await getAdminDb().collection('users').doc(member.id).get();
      const data = profile.data() ?? {};
      return {
        uid: member.id,
        displayName: data.displayName ?? member.id,
        email: data.email ?? null,
        photoURL: data.photoURL ?? null,
        role: member.data()?.role ?? 'member',
        departmentIds: member.data()?.departmentIds ?? [],
      };
    }));
    return NextResponse.json({ members });
  } catch {
    return NextResponse.json({ members: [] }, { status: 401 });
  }
}
