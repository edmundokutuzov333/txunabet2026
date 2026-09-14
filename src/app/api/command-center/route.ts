import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationError } from '@/server/authorization';
import { getCommandCenter } from '@/server/services/command-center';
import { listInbox, markInboxRead, getNotificationPreferences, updateNotificationPreferences } from '@/server/services/notification';

function errorResponse(error: unknown) {
  if (isAuthorizationError(error)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
  return NextResponse.json({ error: error instanceof Error ? error.message : 'INTERNAL_ERROR' }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const resource = request.nextUrl.searchParams.get('resource') ?? 'center';
    if (resource === 'inbox') return NextResponse.json({ data: await listInbox({ limit: Number(request.nextUrl.searchParams.get('limit') ?? 100), onlyUnread: request.nextUrl.searchParams.get('unread') === '1', category: request.nextUrl.searchParams.get('category') ?? undefined }) });
    if (resource === 'preferences') return NextResponse.json({ data: await getNotificationPreferences() });
    return NextResponse.json({ data: await getCommandCenter() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action === 'read') {
      const ids = Array.isArray(body.notificationIds) ? body.notificationIds.filter((value): value is string => typeof value === 'string') : [];
      await markInboxRead(ids);
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'preferences') {
      return NextResponse.json({ data: await updateNotificationPreferences((body.preferences ?? {}) as Record<string, unknown>) });
    }
    return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
