import { NextResponse } from 'next/server';
import { isAuthorizationError } from '@/server/authorization';
import { getModuleAnalytics } from '@/server/services/legacy-modules';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { requirePermission } from '@/server/authorization';

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.REPORTING_READ);
    const data = await getModuleAnalytics();
    return NextResponse.json({ data });
  } catch (error) {
    const status = isAuthorizationError(error) ? 403 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'INTERNAL_ERROR' }, { status });
  }
}
