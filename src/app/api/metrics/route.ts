import { NextResponse } from 'next/server';
import { requirePermission } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { getMetricSnapshot, summarizeMetrics } from '@/server/observability/metrics';

export async function GET() {
  try {
    const identity = await requirePermission(PERMISSIONS.AUDIT_READ);
    return NextResponse.json({ companyId: identity.companyId, summary: summarizeMetrics(), samples: getMetricSnapshot() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : 403 });
  }
}
