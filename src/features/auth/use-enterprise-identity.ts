'use client';

import { useEffect, useState } from 'react';

export interface EnterpriseIdentity {
  uid: string;
  email: string | null;
  companyId: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  permissions: string[];
  departmentIds: string[];
}

export function useEnterpriseIdentity() {
  const [identity, setIdentity] = useState<EnterpriseIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json() as { user?: EnterpriseIdentity };
        return payload.user ?? null;
      })
      .then((value) => {
        if (!cancelled) setIdentity(value);
      })
      .catch(() => {
        if (!cancelled) setIdentity(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { identity, loading };
}
