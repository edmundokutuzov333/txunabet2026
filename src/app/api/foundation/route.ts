import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationError } from '@/server/authorization';
import { ENTITY_TYPES, type EntityType } from '@/server/domain/entities';
import { createRelationship, deleteRelationship, listRelationships, publishDomainEvent } from '@/server/services/foundation';
import { requirePermission } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';

function errorResponse(error: unknown) {
  if (isAuthorizationError(error)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
  const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
  const bad = ['INVALID_RELATIONSHIP', 'SELF_RELATIONSHIP_NOT_ALLOWED', 'INVALID_ENTITY', 'INVALID_DOMAIN_EVENT'];
  const status = bad.includes(code) ? 400 : code === 'NOT_FOUND' || code === 'ENTITY_NOT_FOUND' ? 404 : 500;
  return NextResponse.json({ error: code }, { status });
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.OPERATIONS_READ);
    const entityType = request.nextUrl.searchParams.get('entityType') ?? '';
    const entityId = request.nextUrl.searchParams.get('entityId') ?? '';
    const direction = (request.nextUrl.searchParams.get('direction') ?? 'all') as 'outgoing' | 'incoming' | 'all';
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 200);
    if (!ENTITY_TYPES.includes(entityType as EntityType)) return NextResponse.json({ error: 'INVALID_ENTITY' }, { status: 400 });
    return NextResponse.json({ data: await listRelationships(entityType as EntityType, entityId, direction, Number.isFinite(limit) ? limit : 200) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action === 'relationship.create') return NextResponse.json({ data: await createRelationship(body.data) }, { status: 201 });
    if (body.action === 'event.publish') {
      const identity = await requirePermission(PERMISSIONS.AUTOMATION_MANAGE);
      const data = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data as Record<string, unknown> : {};
      return NextResponse.json({ data: { eventId: await publishDomainEvent(data, { companyId: identity.companyId, actorId: identity.uid }) } }, { status: 201 });
    }
    return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    await deleteRelationship(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
