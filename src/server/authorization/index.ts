import 'server-only';

import { cookies } from 'next/headers';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth } from '@/server/firebase/admin';
import { resolveCompanyMembership } from '@/server/repositories/identity';
import { roleHasPermission, type MembershipRole, type Permission } from './permissions';

export const SESSION_COOKIE = '__session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export interface AuthenticatedIdentity {
  uid: string;
  email: string | null;
  companyId: string;
  role: MembershipRole;
  permissions: string[];
  departmentIds: string[];
  token: DecodedIdToken;
}

export async function verifySessionCookie(): Promise<DecodedIdToken | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  try {
    return await getAdminAuth().verifySessionCookie(session, true);
  } catch {
    return null;
  }
}

export async function requireIdentity(): Promise<AuthenticatedIdentity> {
  const token = await verifySessionCookie();
  if (!token) throw new Error('UNAUTHENTICATED');

  const resolved = await resolveCompanyMembership(token.uid);
  if (!resolved || resolved.membership.status !== 'active') throw new Error('FORBIDDEN');

  return {
    uid: token.uid,
    email: token.email ?? null,
    companyId: resolved.companyId,
    role: resolved.membership.role,
    permissions: resolved.membership.permissions ?? [],
    departmentIds: resolved.membership.departmentIds ?? [],
    token,
  };
}

export async function requirePermission(permission: Permission): Promise<AuthenticatedIdentity> {
  const identity = await requireIdentity();
  if (!roleHasPermission(identity.role, permission, identity.permissions)) throw new Error('FORBIDDEN');
  return identity;
}

export async function requireDepartmentMember(departmentId: string): Promise<AuthenticatedIdentity> {
  const identity = await requireIdentity();
  if (!identity.departmentIds.includes(departmentId) && identity.role !== 'owner' && identity.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return identity;
}

export function hasRecentSecondFactor(token: DecodedIdToken): boolean {
  const firebase = token.firebase as { sign_in_second_factor?: string } | undefined;
  return Boolean(firebase?.sign_in_second_factor);
}

export async function requireMfa(): Promise<AuthenticatedIdentity> {
  const identity = await requireIdentity();
  if (!hasRecentSecondFactor(identity.token)) throw new Error('MFA_REQUIRED');
  return identity;
}

export function isAuthorizationError(error: unknown): boolean {
  return error instanceof Error && ['UNAUTHENTICATED', 'FORBIDDEN', 'MFA_REQUIRED'].includes(error.message);
}
