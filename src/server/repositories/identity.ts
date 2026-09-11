import 'server-only';

import { getAdminAuth, getAdminDb } from '@/server/firebase/admin';
import type { Company, Department, Membership, UserProfile } from '@/lib/domain/identity';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getAdminDb().collection('users').doc(uid).get();
  return snapshot.exists ? ({ ...(snapshot.data() as UserProfile), uid } as UserProfile) : null;
}

export async function getMembership(companyId: string, uid: string): Promise<Membership | null> {
  const snapshot = await getAdminDb().collection('companies').doc(companyId).collection('members').doc(uid).get();
  return snapshot.exists ? (snapshot.data() as Membership) : null;
}

export async function getDepartment(departmentId: string): Promise<Department | null> {
  const snapshot = await getAdminDb().collection('departments').doc(departmentId).get();
  return snapshot.exists ? (snapshot.data() as Department) : null;
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const snapshot = await getAdminDb().collection('companies').doc(companyId).get();
  return snapshot.exists ? (snapshot.data() as Company) : null;
}

export async function resolveCompanyMembership(uid: string): Promise<{ companyId: string; membership: Membership } | null> {
  const profile = await getUserProfile(uid);
  const profileCompanyId = profile?.companyId;

  if (profileCompanyId) {
    const membership = await getMembership(profileCompanyId, uid);
    if (membership?.status === 'active') return { companyId: profileCompanyId, membership };
  }

  const snapshot = await getAdminDb()
    .collectionGroup('members')
    .where('userId', '==', uid)
    .where('status', '==', 'active')
    .limit(2)
    .get();

  if (snapshot.empty) return null;
  if (snapshot.size > 1) throw new Error('USER_HAS_MULTIPLE_ACTIVE_COMPANIES');

  const membership = snapshot.docs[0].data() as Membership;
  return membership.companyId ? { companyId: membership.companyId, membership } : null;
}

export async function setRoleClaim(uid: string, role: Membership['role'], companyId: string): Promise<void> {
  const user = await getAdminAuth().getUser(uid);
  await getAdminAuth().setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    role,
    companyId,
  });
}
