import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationError, requirePermission } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { ENTITY_TYPES, DomainEventInputSchema, type EntityType } from '@/server/domain/entities';
import { createRelationship, deleteRelationship, listRelationships, publishDomainEvent } from '@/server/services/foundation';

function errorResponse(error: unknown) {
  if (isAuthorizationError(error)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
  const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
  const status = code === 'INVALID_RELATIONSHIP' || code === 'SELF_RELATIONSHIP_NOT_ALLOWED' || code === 'INVALID_ENTITY' || code === 'INVALID_DOMAIN_EVENT' ? 400 : code === 'NOT_FOUND' || code === 'ENTITY_NOT_FOUND' ? 404 : code === 'FORBIDDEN' ? 403 : 500;
  return NextResponse.json({ error: code }, { status });
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.OPERATIONS_READ);
    const entityType = request.nextUrl.searchParams.get('entityType') ?? '';
    const entityId = request.nextUrl.searchParams.get('entityId') ?? '';
    const rawDirection = request.nextUrl.searchParams.get('direction') ?? 'all';
    const direction = rawDirection === 'outgoing' || rawDirection === 'incoming' ? rawDirection : 'all';
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
    if (body.action === 'relationship.create') {
      return NextResponse.json({ data: await createRelationship(body.data) }, { status: 201 });
    }
    if (body.action === 'event.publish') {
      const identity = await requirePermission(PERMISSIONS.AUTOMATION_MANAGE);
      const parsed = DomainEventInputSchema.safeParse(body.data);
      if (!parsed.success) return NextResponse.json({ error: 'INVALID_DOMAIN_EVENT', details: parsed.error.flatten() }, { status: 400 });
      return NextResponse.json({ data: { eventId: await publishDomainEvent(parsed.data, { companyId: identity.companyId, actorId: identity.uid }) } }, { status: 201 });
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
