import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requirePermission, isAuthorizationError } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { getAdminDb } from '@/server/firebase/admin';
import { writeAuditEvent } from '@/server/repositories/audit';

const goalPatchSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().max(3000).optional(),
  progress: z.number().min(0).max(100).optional(),
  status: z.string().trim().max(60).optional(),
  dueDate: z.string().trim().max(80).optional(),
  ownerId: z.string().trim().max(180).optional(),
});

const goalCreateSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().max(3000).default(''),
  progress: z.number().min(0).max(100).default(0),
  status: z.string().trim().max(60).default('active'),
  dueDate: z.string().trim().max(80).optional(),
  ownerId: z.string().trim().max(180).optional(),
});

function errorResponse(error: unknown) {
  if (isAuthorizationError(error)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
  const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
  const status = message === 'NOT_FOUND' ? 404 : ['INVALID_ID', 'INVALID_GOAL'].includes(message) ? 400 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const identity = await requirePermission(PERMISSIONS.OPERATIONS_READ);
    const snapshot = await getAdminDb().collection('goals').where('companyId', '==', identity.companyId).limit(200).get();
    const data = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);
    const input = goalCreateSchema.parse(await request.json());
    const ref = getAdminDb().collection('goals').doc();
    const now = FieldValue.serverTimestamp();
    await ref.create({
      id: ref.id,
      companyId: identity.companyId,
      ...input,
      ownerId: input.ownerId ?? identity.uid,
      createdBy: identity.uid,
      updatedBy: identity.uid,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    await writeAuditEvent({
      companyId: identity.companyId,
      actorId: identity.uid,
      action: 'goal.created',
      resourceType: 'goal',
      resourceId: ref.id,
      metadata: { title: input.title },
    });
    const created = await ref.get();
    return NextResponse.json({ data: { id: ref.id, ...(created.data() as Record<string, unknown>) } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const identity = await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);
    const id = request.nextUrl.searchParams.get('id');
    if (!id || !/^[A-Za-z0-9_-]{1,180}$/.test(id)) throw new Error('INVALID_ID');
    const input = goalPatchSchema.parse(await request.json());
    const ref = getAdminDb().collection('goals').doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data()?.companyId !== identity.companyId) throw new Error('NOT_FOUND');
    await ref.update({ ...input, updatedBy: identity.uid, updatedAt: FieldValue.serverTimestamp(), version: Number(snapshot.data()?.version ?? 1) + 1 });
    await writeAuditEvent({
      companyId: identity.companyId,
      actorId: identity.uid,
      action: 'goal.updated',
      resourceType: 'goal',
      resourceId: id,
      metadata: { fields: Object.keys(input) },
    });
    const updated = await ref.get();
    return NextResponse.json({ data: { id, ...(updated.data() as Record<string, unknown>) } });
  } catch (error) {
    return errorResponse(error);
  }
}
