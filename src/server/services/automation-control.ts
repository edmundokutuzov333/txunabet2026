import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requirePermission } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { getAdminDb } from '@/server/firebase/admin';
import { writeAuditEvent } from '@/server/repositories/audit';

export const WorkflowStepControlSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  type: z.enum(['log', 'http', 'module.create', 'module.update', 'module.delete', 'condition']),
  name: z.string().max(180).optional(),
  config: z.record(z.unknown()).default({}),
});

export const WorkflowControlSchema = z.object({
  name: z.string().min(1).max(180),
  description: z.string().max(5000).optional().default(''),
  active: z.boolean().default(true),
  steps: z.array(WorkflowStepControlSchema).min(1).max(50),
});

export const AutomationControlSchema = z.object({
  name: z.string().min(1).max(180),
  description: z.string().max(5000).optional().default(''),
  active: z.boolean().default(true),
  workflowId: z.string().regex(/^[A-Za-z0-9_-]{1,180}$/),
  trigger: z.discriminatedUnion('type', [
    z.object({ type: z.literal('manual') }),
    z.object({ type: z.literal('cron'), cron: z.string().min(9).max(80), timezone: z.string().min(1).max(80).default('UTC') }),
    z.object({ type: z.literal('event'), eventName: z.string().min(1).max(180), filter: z.record(z.unknown()).optional() }),
  ]),
});

function jsonSize(value: unknown): number { return Buffer.byteLength(JSON.stringify(value), 'utf8'); }
function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, serialize(item)]));
  return value;
}

async function getWorkflowSnapshot(workflowId: string, companyId: string): Promise<{ id: string; version: number; data: z.infer<typeof WorkflowControlSchema> }> {
  const ref = getAdminDb().collection('module_workflows').doc(workflowId);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.companyId !== companyId) throw new Error('WORKFLOW_NOT_FOUND');
  const data = WorkflowControlSchema.safeParse(snapshot.data());
  if (!data.success) throw new Error('INVALID_WORKFLOW');
  return { id: snapshot.id, version: Number(snapshot.data()?.version ?? 1), data: data.data };
}

export async function listWorkflowControls(limit = 100) {
  const identity = await requirePermission(PERMISSIONS.AUTOMATION_READ);
  const snapshot = await getAdminDb().collection('module_workflows').where('companyId', '==', identity.companyId).limit(Math.min(limit, 100)).get();
  return snapshot.docs.map((doc) => serialize({ ...(doc.data() ?? {}), id: doc.id }));
}

export async function listAutomationControls(limit = 100) {
  const identity = await requirePermission(PERMISSIONS.AUTOMATION_READ);
  const snapshot = await getAdminDb().collection('module_automations').where('companyId', '==', identity.companyId).limit(Math.min(limit, 100)).get();
  return snapshot.docs.map((doc) => serialize({ ...(doc.data() ?? {}), id: doc.id }));
}

export async function listAutomationJobs(options: { limit?: number; status?: string } = {}) {
  const identity = await requirePermission(PERMISSIONS.AUTOMATION_READ);
  let query = getAdminDb().collection('automation_jobs').where('companyId', '==', identity.companyId).limit(Math.min(options.limit ?? 100, 100));
  if (options.status) query = query.where('status', '==', options.status);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => serialize({ ...(doc.data() ?? {}), id: doc.id })).sort((a, b) => String((b as Record<string, unknown>).createdAt ?? '').localeCompare(String((a as Record<string, unknown>).createdAt ?? '')));
}

export async function createWorkflow(input: unknown) {
  const identity = await requirePermission(PERMISSIONS.AUTOMATION_MANAGE);
  const parsed = WorkflowControlSchema.safeParse(input);
  if (!parsed.success || jsonSize(parsed.data) > 100_000) throw new Error('INVALID_WORKFLOW');
  const ref = getAdminDb().collection('module_workflows').doc();
  const versionRef = ref.collection('versions').doc('1');
  await getAdminDb().runTransaction(async (transaction) => {
    transaction.create(ref, { ...parsed.data, companyId: identity.companyId, createdBy: identity.uid, updatedBy: identity.uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), version: 1 });
    transaction.create(versionRef, { ...parsed.data, workflowId: ref.id, version: 1, createdBy: identity.uid, createdAt: FieldValue.serverTimestamp() });
  });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'create', resourceType: 'workflow', resourceId: ref.id, metadata: { name: parsed.data.name, version: 1 } });
  return { id: ref.id, version: 1, ...parsed.data };
}

export async function updateWorkflow(id: string, input: unknown) {
  const identity = await requirePermission(PERMISSIONS.AUTOMATION_MANAGE);
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(id)) throw new Error('INVALID_ID');
  const parsed = WorkflowControlSchema.safeParse(input);
  if (!parsed.success || jsonSize(parsed.data) > 100_000) throw new Error('INVALID_WORKFLOW');
  const ref = getAdminDb().collection('module_workflows').doc(id);
  const existing = await ref.get();
  if (!existing.exists || existing.data()?.companyId !== identity.companyId) throw new Error('NOT_FOUND');
  const nextVersion = Number(existing.data()?.version ?? 1) + 1;
  const versionRef = ref.collection('versions').doc(String(nextVersion));
  await getAdminDb().runTransaction(async (transaction) => {
    transaction.update(ref, { ...parsed.data, updatedBy: identity.uid, updatedAt: FieldValue.serverTimestamp(), version: nextVersion });
    transaction.create(versionRef, { ...parsed.data, workflowId: id, version: nextVersion, createdBy: identity.uid, createdAt: FieldValue.serverTimestamp() });
  });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'update', resourceType: 'workflow', resourceId: id, metadata: { name: parsed.data.name, version: nextVersion } });
  return { id, version: nextVersion, ...parsed.data };
}

export async function createAutomation(input: unknown) {
  const identity = await requirePermission(PERMISSIONS.AUTOMATION_MANAGE);
  const parsed = AutomationControlSchema.safeParse(input);
  if (!parsed.success || jsonSize(parsed.data) > 50_000) throw new Error('INVALID_AUTOMATION');
  const workflow = await getWorkflowSnapshot(parsed.data.workflowId, identity.companyId);
  const ref = getAdminDb().collection('module_automations').doc();
  await ref.create({ ...parsed.data, companyId: identity.companyId, createdBy: identity.uid, updatedBy: identity.uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), version: 1, workflowVersion: workflow.version, lastScheduledKey: null });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'create', resourceType: 'automation', resourceId: ref.id, metadata: { name: parsed.data.name, workflowId: parsed.data.workflowId, workflowVersion: workflow.version } });
  return { id: ref.id, workflowVersion: workflow.version, ...parsed.data };
}

export async function updateAutomation(id: string, input: unknown) {
  const identity = await requirePermission(PERMISSIONS.AUTOMATION_MANAGE);
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(id)) throw new Error('INVALID_ID');
  const parsed = AutomationControlSchema.safeParse(input);
  if (!parsed.success || jsonSize(parsed.data) > 50_000) throw new Error('INVALID_AUTOMATION');
  const workflow = await getWorkflowSnapshot(parsed.data.workflowId, identity.companyId);
  const ref = getAdminDb().collection('module_automations').doc(id);
  const existing = await ref.get();
  if (!existing.exists || existing.data()?.companyId !== identity.companyId) throw new Error('NOT_FOUND');
  await ref.update({ ...parsed.data, workflowVersion: workflow.version, updatedBy: identity.uid, updatedAt: FieldValue.serverTimestamp(), version: FieldValue.increment(1), lastScheduledKey: null });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'update', resourceType: 'automation', resourceId: id, metadata: { name: parsed.data.name, workflowId: parsed.data.workflowId, workflowVersion: workflow.version } });
  return { id, workflowVersion: workflow.version, ...parsed.data };
}

export async function enqueueManualAutomation(id: string, payload: Record<string, unknown> = {}) {
  const identity = await requirePermission(PERMISSIONS.AUTOMATION_MANAGE);
  const automationRef = getAdminDb().collection('module_automations').doc(id);
  const automation = await automationRef.get();
  if (!automation.exists || automation.data()?.companyId !== identity.companyId || automation.data()?.active !== true) throw new Error('AUTOMATION_NOT_ACTIVE');
  const workflowId = String(automation.data()?.workflowId ?? '');
  const workflow = await getWorkflowSnapshot(workflowId, identity.companyId);
  const key = `manual_${id}_${identity.uid}_${randomUUID().replace(/-/g, '')}`;
  await getAdminDb().collection('automation_jobs').doc(key).create({ id: key, companyId: identity.companyId, automationId: id, workflowId, workflowVersion: workflow.version, trigger: 'manual', payload, idempotencyKey: key, status: 'pending', attempts: 0, maxAttempts: 5, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), nextAttemptAt: Timestamp.now() });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'execute', resourceType: 'automation', resourceId: id, metadata: { jobId: key, workflowVersion: workflow.version } });
  return { jobId: key, workflowVersion: workflow.version };
}

export async function retryAutomationJob(id: string) {
  const identity = await requirePermission(PERMISSIONS.AUTOMATION_MANAGE);
  const ref = getAdminDb().collection('automation_jobs').doc(id);
  const job = await ref.get();
  if (!job.exists || job.data()?.companyId !== identity.companyId) throw new Error('NOT_FOUND');
  const data = job.data() ?? {};
  if (!['dead', 'failed'].includes(String(data.status))) throw new Error('JOB_NOT_RETRYABLE');
  await ref.update({ status: 'pending', attempts: 0, nextAttemptAt: Timestamp.now(), leaseUntil: FieldValue.delete(), finishedAt: FieldValue.delete(), error: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'retry', resourceType: 'automation_job', resourceId: id });
  return { ok: true };
}
