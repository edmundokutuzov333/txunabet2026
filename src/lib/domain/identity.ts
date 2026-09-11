export type EntityStatus = 'active' | 'suspended' | 'pending' | 'disabled';

export interface Company {
  id: string;
  name: string;
  slug: string;
  status: EntityStatus;
  timezone: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  status: EntityStatus;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  phone?: string | null;
  status: EntityStatus;
  companyId?: string;
  mfaRequired: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Membership {
  userId: string;
  companyId: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  permissions: string[];
  departmentIds: string[];
  status: 'active' | 'suspended' | 'invited';
  createdAt: unknown;
  updatedAt: unknown;
}

export interface DepartmentMembership {
  userId: string;
  departmentId: string;
  companyId: string;
  status: 'active' | 'suspended';
  createdAt: unknown;
}
