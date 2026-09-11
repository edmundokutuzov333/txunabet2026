import 'server-only';

import { cookies } from 'next/headers';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth } from '@/server/firebase/admin';
import { resolveCompanyMembership } from '@/server/repositories/identity';
import { roleHasPermission, type MembershipRole, type Permission } from './permissions';
import { logWarn } from '@/server/observability/logger';
import { recordMetric } from '@/server/observability/metrics';

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
    recordMetric({ name: 'auth_failure', value: 1, success: false });
    logWarn({ event: 'auth.session.invalid', metadata: { reason: 'invalid_session_cookie' } });
    return null;
  }
}

export async function requireIdentity(): Promise<AuthenticatedIdentity> {
  const token = await verifySessionCookie();
  if (!token) throw new Error('UNAUTHENTICATED');

  const resolved = await resolveCompanyMembership(token.uid);
  if (!resolved || resolved.membership.status !== 'active') {
    recordMetric({ name: 'auth_failure', value: 1, success: false, userId: token.uid });
    logWarn({ event: 'auth.membership.denied', userId: token.uid });
    throw new Error('FORBIDDEN');
  }

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
  if (!roleHasPermission(identity.role, permission, identity.permissions)) {
    recordMetric({ name: 'auth_failure', value: 1, success: false, userId: identity.uid, companyId: identity.companyId });
    logWarn({ event: 'auth.permission.denied', userId: identity.uid, companyId: identity.companyId, metadata: { permission } });
    throw new Error('FORBIDDEN');
  }
  return identity;
}

export async function requireDepartmentMember(departmentId: string): Promise<AuthenticatedIdentity> {
  const identity = await requireIdentity();
  if (!identity.departmentIds.includes(departmentId) && identity.role !== 'owner' && identity.role !== 'admin') {
    recordMetric({ name: 'auth_failure', value: 1, success: false, userId: identity.uid, companyId: identity.companyId });
    logWarn({ event: 'auth.department.denied', userId: identity.uid, companyId: identity.companyId });
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
  if (!hasRecentSecondFactor(identity.token)) {
    recordMetric({ name: 'auth_failure', value: 1, success: false, userId: identity.uid, companyId: identity.companyId });
    logWarn({ event: 'auth.mfa.required', userId: identity.uid, companyId: identity.companyId });
    throw new Error('MFA_REQUIRED');
  }
  return identity;
}

export function isAuthorizationError(error: unknown): boolean {
  return error instanceof Error && ['UNAUTHENTICATED', 'FORBIDDEN', 'MFA_REQUIRED'].includes(error.message);
}
