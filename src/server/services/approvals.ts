import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requirePermission, requireIdentity } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { getAdminDb } from '@/server/firebase/admin';
import { queueDomainEventTransaction, publishDomainEvent } from '@/server/services/foundation';
import { writeAuditEvent } from '@/server/repositories/audit';

const ApprovalCreateSchema = z.object({
  title: z.string().min(1).max(240),
  description: z.string().max(5000).default(''),
  approverId: z.string().min(1).max(180),
  entityType: z.string().min(1).max(80).default('approval'),
  entityId: z.string().min(1).max(180),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).default({}),
});

const ApprovalDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().max(5000).default(''),
});

function safeApprovalId(id: string): boolean { return /^[A-Za-z0-9_-]{1,180}$/.test(id); }

export async function listApprovals() {
  const identity = await requireIdentity();
  const snapshot = await getAdminDb().collection('approvals').where('companyId', '==', identity.companyId).limit(200).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
}

export async function createApproval(input: unknown) {
  const identity = await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);
  const parsed = ApprovalCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error('INVALID_APPROVAL');
  const approver = await getAdminDb().collection('companies').doc(identity.companyId).collection('members').doc(parsed.data.approverId).get();
  if (!approver.exists || approver.data()?.status !== 'active') throw new Error('APPROVER_NOT_FOUND');
  const db = getAdminDb();
  const ref = db.collection('approvals').doc();
  const now = FieldValue.serverTimestamp();
  const eventId = `approval_requested_${ref.id}`;
  await db.runTransaction(async (transaction) => {
    transaction.create(ref, {
      id: ref.id,
      companyId: identity.companyId,
      createdBy: identity.uid,
      updatedBy: identity.uid,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      metadata: parsed.data.metadata,
      permissions: {},
      version: 1,
      title: parsed.data.title,
      description: parsed.data.description,
      approverId: parsed.data.approverId,
      requesterId: identity.uid,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate,
    });
    await queueDomainEventTransaction(transaction, {
      eventName: 'approval.requested',
      entityType: 'approval',
      entityId: ref.id,
      payload: { title: parsed.data.title, approverId: parsed.data.approverId, requesterId: identity.uid, entityType: parsed.data.entityType, entityId: parsed.data.entityId, priority: parsed.data.priority, dueDate: parsed.data.dueDate },
      metadata: { source: 'approval-service' },
    }, { companyId: identity.companyId, actorId: identity.uid, eventId });
  });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'approval.create', resourceType: 'approval', resourceId: ref.id, metadata: { title: parsed.data.title, approverId: parsed.data.approverId } });
  return { id: ref.id, ...(await ref.get()).data() };
}

export async function decideApproval(id: string, input: unknown) {
  const identity = await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);
  if (!safeApprovalId(id)) throw new Error('INVALID_ID');
  const parsed = ApprovalDecisionSchema.safeParse(input);
  if (!parsed.success) throw new Error('INVALID_APPROVAL_DECISION');
  const db = getAdminDb();
  const ref = db.collection('approvals').doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.companyId !== identity.companyId) throw new Error('NOT_FOUND');
  const current = snapshot.data() as Record<string, unknown>;
  if (!['pending', 'requested', 'awaiting'].includes(String(current.status ?? ''))) throw new Error('APPROVAL_NOT_PENDING');
  if (current.approverId !== identity.uid && !['owner', 'admin'].includes(identity.role)) throw new Error('FORBIDDEN');
  const status = parsed.data.decision;
  const eventName = status === 'approved' ? 'approval.approved' : 'approval.rejected';
  await db.runTransaction(async (transaction) => {
    transaction.update(ref, { status, updatedBy: identity.uid, updatedAt: FieldValue.serverTimestamp(), decision: status, decisionComment: parsed.data.comment, decidedBy: identity.uid, decidedAt: FieldValue.serverTimestamp(), version: Number(current.version ?? 1) + 1 });
    await queueDomainEventTransaction(transaction, {
      eventName,
      entityType: 'approval',
      entityId: id,
      payload: { title: current.title ?? 'Aprovação', approverId: current.approverId, requesterId: current.requesterId, decisionComment: parsed.data.comment, decision: status },
      metadata: { source: 'approval-service' },
    }, { companyId: identity.companyId, actorId: identity.uid, eventId: `${eventName.replace(/\./g, '_')}_${id}_${Number(current.version ?? 1) + 1}` });
  });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: `approval.${status}`, resourceType: 'approval', resourceId: id, metadata: { comment: parsed.data.comment } });
  await publishDomainEvent({ eventName: 'approval.updated', entityType: 'approval', entityId: id, payload: { status }, metadata: { source: 'approval-service' } }, { companyId: identity.companyId, actorId: identity.uid });
  return { id, status, decisionComment: parsed.data.comment };
}
