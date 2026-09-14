import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';

if (!admin.apps?.length) admin.initializeApp();
const db = admin.firestore();
const REGION = 'africa-south1';
const MAX_EVENTS_PER_TICK = 50;
const LEASE_MS = 8 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const RETRY_MS = 30 * 1000;

function now() { return admin.firestore.Timestamp.now(); }

function notificationTargets(event: Record<string, unknown>, members: Array<{ id: string; role: string }>): string[] {
  const payload = event.payload && typeof event.payload === 'object' ? event.payload as Record<string, unknown> : {};
  const directKeys = ['userId', 'assigneeId', 'assignedTo', 'ownerId', 'requesterId', 'approverId', 'recipientId'];
  const direct = directKeys.flatMap((key) => typeof payload[key] === 'string' ? [String(payload[key])] : []).filter((id) => id && id !== String(event.actorId ?? ''));
  if (direct.length) return Array.from(new Set(direct));
  const name = String(event.eventName ?? '');
  if (name === 'workflow.failed' || name.startsWith('incident.') || name.endsWith('.alert')) return members.filter((member) => ['owner', 'admin', 'manager'].includes(member.role)).map((member) => member.id);
  return [];
}

function notificationDescriptor(event: Record<string, unknown>) {
  const name = String(event.eventName ?? '');
  const payload = event.payload && typeof event.payload === 'object' ? event.payload as Record<string, unknown> : {};
  if (name === 'task.created' || name === 'task.assigned') return { category: 'assignment', severity: 'medium', title: 'Nova tarefa atribuída', body: String(payload.title ?? 'Uma tarefa foi atribuída a si.') };
  if (name === 'task.overdue') return { category: 'task', severity: 'high', title: 'Tarefa em atraso', body: String(payload.title ?? 'Uma tarefa ultrapassou o prazo.') };
  if (name === 'meeting.completed') return { category: 'meeting', severity: 'medium', title: 'Reunião concluída', body: String(payload.title ?? 'Uma reunião foi concluída.') };
  if (name === 'approval.requested') return { category: 'approval', severity: 'high', title: 'Aprovação pendente', body: String(payload.title ?? 'Uma aprovação requer a sua atenção.') };
  if (name === 'approval.approved') return { category: 'approval', severity: 'medium', title: 'Aprovação concluída', body: String(payload.title ?? 'Uma aprovação foi aprovada.') };
  if (name === 'approval.rejected') return { category: 'approval', severity: 'high', title: 'Aprovação rejeitada', body: String(payload.title ?? 'Uma aprovação foi rejeitada.') };
  if (name === 'form.submitted') return { category: 'form', severity: 'medium', title: 'Novo formulário submetido', body: String(payload.title ?? 'Um formulário recebeu uma nova submissão.') };
  if (name === 'document.updated') return { category: 'document', severity: 'low', title: 'Documento atualizado', body: String(payload.title ?? 'Um documento foi atualizado.') };
  if (name === 'workflow.failed') return { category: 'workflow', severity: 'critical', title: 'Workflow falhou', body: String(payload.error ?? payload.title ?? 'Uma execução de workflow falhou.') };
  if (name === 'decision.created' || name === 'decision.updated') return { category: 'decision', severity: 'medium', title: 'Decisão registada', body: String(payload.title ?? 'Uma decisão organizacional foi registada.') };
  if (name.startsWith('incident.') || name.endsWith('.alert')) return { category: 'alert', severity: 'critical', title: 'Alerta operacional', body: String(payload.message ?? payload.title ?? 'Um alerta operacional requer atenção.') };
  if (name === 'user.joined') return { category: 'system', severity: 'info', title: 'Novo membro na empresa', body: String(payload.displayName ?? payload.email ?? 'Um novo membro juntou-se à empresa.') };
  return { category: 'system', severity: 'info', title: 'Nova atividade', body: String(payload.title ?? name) };
}

async function materializeMeetingActions(event: Record<string, unknown>): Promise<void> {
  if (String(event.eventName ?? '') !== 'meeting.completed') return;
  const payload = event.payload && typeof event.payload === 'object' ? event.payload as Record<string, unknown> : {};
  const actions = Array.isArray(payload.actionItems) ? payload.actionItems : [];
  if (!actions.length) return;
  const companyId = String(event.companyId ?? '');
  const meetingId = String(event.entityId ?? '');
  for (let index = 0; index < Math.min(actions.length, 30); index += 1) {
    const raw = actions[index];
    const action = typeof raw === 'string' ? { title: raw } : raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const title = String(action.title ?? action.text ?? '').trim();
    if (!title) continue;
    const taskId = `meeting_${meetingId}_${index}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 700);
    const taskRef = db.collection('module_tasks').doc(taskId);
    await db.runTransaction(async (transaction) => {
      if ((await transaction.get(taskRef)).exists) return;
      transaction.create(taskRef, {
        id: taskId,
        companyId,
        createdBy: String(event.actorId ?? ''),
        updatedBy: String(event.actorId ?? ''),
        ownerId: typeof action.assigneeId === 'string' ? action.assigneeId : undefined,
        assigneeId: typeof action.assigneeId === 'string' ? action.assigneeId : undefined,
        title,
        description: String(action.description ?? `Action item da reunião ${meetingId}.`),
        status: 'active',
        priority: String(action.priority ?? 'medium'),
        dueDate: typeof action.dueDate === 'string' ? action.dueDate : undefined,
        meetingId,
        sourceEventId: String(event.eventId ?? ''),
        metadata: { source: 'meeting.action-item', meetingId },
        permissions: {},
        version: 1,
        createdAt: now(),
        updatedAt: now(),
      });
    });
  }
}

async function materializeEvent(event: Record<string, unknown>): Promise<void> {
  const companyId = String(event.companyId ?? '');
  const eventId = String(event.eventId ?? '');
  if (!companyId || !eventId) throw new Error('INVALID_OUTBOX_EVENT');
  const membersSnapshot = await db.collection('companies').doc(companyId).collection('members').where('status', '==', 'active').limit(500).get();
  const members = membersSnapshot.docs.map((doc) => ({ id: doc.id, role: String(doc.data().role ?? '') }));
  const descriptor = notificationDescriptor(event);
  const targets = notificationTargets(event, members);
  for (const userId of targets) {
    const preference = await db.collection('notification_preferences').doc(userId).get();
    const mode = String(preference.data()?.[descriptor.category] ?? (descriptor.severity === 'critical' ? 'instant' : 'instant'));
    if (mode === 'mute' || (mode === 'critical-only' && !['critical', 'high'].includes(descriptor.severity))) continue;
    const notificationId = `${eventId}_${userId}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 700);
    const notificationRef = db.collection('notifications').doc(userId).collection('items').doc(notificationId);
    await db.runTransaction(async (transaction) => {
      if ((await transaction.get(notificationRef)).exists) return;
      transaction.create(notificationRef, { id: notificationId, companyId, userId, category: descriptor.category, severity: descriptor.severity, title: descriptor.title, body: descriptor.body, entityType: String(event.entityType ?? 'activity'), entityId: String(event.entityId ?? ''), eventName: String(event.eventName ?? ''), actionUrl: '/dashboard/inbox', read: false, channels: ['in-app'], deliveryMode: mode, createdAt: now(), metadata: { sourceEventId: eventId } });
    });
  }
  await materializeMeetingActions(event);
  const activityRef = db.collection('activities').doc(eventId);
  await db.runTransaction(async (transaction) => {
    if ((await transaction.get(activityRef)).exists) return;
    transaction.create(activityRef, { id: eventId, companyId, actorId: String(event.actorId ?? ''), eventName: String(event.eventName ?? ''), entityType: String(event.entityType ?? 'activity'), entityId: String(event.entityId ?? ''), payload: event.payload ?? {}, metadata: event.metadata ?? {}, createdAt: event.occurredAt ?? now(), status: 'active', version: 1 });
  });
}

async function enqueueAutomationJobs(event: Record<string, unknown>): Promise<number> {
  const companyId = String(event.companyId ?? '');
  const eventName = String(event.eventName ?? '');
  const eventId = String(event.eventId ?? '');
  const payload = event.payload && typeof event.payload === 'object' ? event.payload as Record<string, unknown> : {};
  if (!companyId || !eventName || !eventId) throw new Error('INVALID_OUTBOX_EVENT');
  let lastId: string | undefined;
  let created = 0;
  while (true) {
    let query = db.collection('module_automations').where('companyId', '==', companyId).where('active', '==', true).orderBy(admin.firestore.FieldPath.documentId()).limit(500);
    if (lastId) query = query.startAfter(lastId);
    const automations = await query.get();
    for (const automation of automations.docs) {
      const data = automation.data();
      const trigger = data.trigger as Record<string, unknown> | undefined;
      if (!trigger || trigger.type !== 'event' || trigger.eventName !== eventName) continue;
      const filter = trigger.filter;
      if (filter && typeof filter === 'object' && !Array.isArray(filter)) if (!Object.entries(filter as Record<string, unknown>).every(([key, expected]) => payload[key] === expected)) continue;
      const workflowId = String(data.workflowId ?? '');
      if (!workflowId) continue;
      const workflow = await db.collection('module_workflows').doc(workflowId).get();
      if (!workflow.exists || workflow.data()?.companyId !== companyId) continue;
      const workflowVersion = Number(workflow.data()?.version ?? 1);
      const idempotencyKey = `${automation.id}_${eventName}_${eventId}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 700);
      const jobRef = db.collection('automation_jobs').doc(idempotencyKey);
      await db.runTransaction(async (transaction) => {
        if ((await transaction.get(jobRef)).exists) return;
        transaction.create(jobRef, { id: jobRef.id, companyId, automationId: automation.id, workflowId, workflowVersion, trigger: 'event', payload: { ...payload, eventName, eventId }, idempotencyKey, status: 'pending', attempts: 0, maxAttempts: 5, createdAt: now(), updatedAt: now(), nextAttemptAt: now() });
        created += 1;
      });
    }
    if (automations.size < 500) return created;
    lastId = automations.docs[automations.docs.length - 1]?.id;
    if (!lastId) return created;
  }
}

async function processOne(doc: admin.firestore.QueryDocumentSnapshot): Promise<void> {
  const ref = doc.ref;
  const claimed = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    if (!current.exists) return null;
    const data = current.data() ?? {};
    if (data.status !== 'pending') return null;
    const nextAttemptAt = data.nextAttemptAt instanceof admin.firestore.Timestamp ? data.nextAttemptAt.toMillis() : 0;
    if (nextAttemptAt > Date.now()) return null;
    const attempts = Number(data.attempts ?? 0) + 1;
    transaction.update(ref, { status: 'processing', attempts, leaseUntil: admin.firestore.Timestamp.fromMillis(Date.now() + LEASE_MS), updatedAt: now() });
    return { ...data, id: current.id, attempts } as Record<string, unknown>;
  });
  if (!claimed) return;
  try {
    await materializeEvent(claimed);
    await enqueueAutomationJobs(claimed);
    await ref.update({ status: 'published', publishedAt: now(), leaseUntil: admin.firestore.FieldValue.delete(), updatedAt: now(), lastError: admin.firestore.FieldValue.delete() });
  } catch (error) {
    const attempts = Number(claimed.attempts ?? 1);
    const message = error instanceof Error ? error.message : 'OUTBOX_DISPATCH_FAILED';
    if (attempts >= MAX_ATTEMPTS) await ref.update({ status: 'failed', leaseUntil: admin.firestore.FieldValue.delete(), lastError: message, updatedAt: now(), failedAt: now() });
    else await ref.update({ status: 'pending', leaseUntil: admin.firestore.FieldValue.delete(), lastError: message, nextAttemptAt: admin.firestore.Timestamp.fromMillis(Date.now() + Math.min(15 * 60 * 1000, RETRY_MS * (2 ** (attempts - 1)))), updatedAt: now() });
    logger.error('Domain event outbox processing failed', { eventId: doc.id, attempts, error: message });
  }
}

export const domainEventOutboxWorker = onSchedule({ schedule: '* * * * *', timeZone: 'UTC', region: REGION, timeoutSeconds: 540, memory: '256MiB' }, async () => {
  const snapshot = await db.collection('event_outbox').where('status', '==', 'pending').orderBy('nextAttemptAt', 'asc').limit(MAX_EVENTS_PER_TICK).get();
  for (const doc of snapshot.docs) await processOne(doc);
});
