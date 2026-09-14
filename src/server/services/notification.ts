import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { requireIdentity } from '@/server/authorization';
import { getAdminDb } from '@/server/firebase/admin';
import { writeAuditEvent } from '@/server/repositories/audit';

export type NotificationChannel = 'in-app' | 'email' | 'push';
export type NotificationMode = 'instant' | 'digest' | 'mute' | 'critical-only';
export type NotificationCategory = 'mention' | 'assignment' | 'comment' | 'approval' | 'form' | 'task' | 'document' | 'meeting' | 'workflow' | 'alert' | 'decision' | 'request' | 'system';
export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface NotificationRecord {
  id: string;
  companyId: string;
  userId: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  eventName?: string;
  actionUrl?: string;
  read: boolean;
  readAt?: unknown;
  channels: NotificationChannel[];
  createdAt: Timestamp;
  metadata: Record<string, unknown>;
}

const DEFAULT_PREFERENCES: Record<NotificationCategory, NotificationMode> = {
  mention: 'instant', assignment: 'instant', comment: 'instant', approval: 'instant', form: 'digest', task: 'instant',
  document: 'digest', meeting: 'instant', workflow: 'critical-only', alert: 'instant', decision: 'digest', request: 'instant', system: 'critical-only',
};

export function describeNotificationEvent(eventName: string, payload: Record<string, unknown>): { category: NotificationCategory; severity: NotificationSeverity; title: string; body: string } {
  const name = eventName.toLowerCase();
  if (name === 'task.created' || name === 'task.assigned') return { category: 'assignment', severity: 'medium', title: 'Nova tarefa atribuída', body: String(payload.title ?? 'Uma tarefa foi atribuída a si.') };
  if (name === 'task.overdue') return { category: 'task', severity: 'high', title: 'Tarefa em atraso', body: String(payload.title ?? 'Uma tarefa ultrapassou o prazo.') };
  if (name === 'meeting.completed') return { category: 'meeting', severity: 'medium', title: 'Reunião concluída', body: String(payload.title ?? 'Uma reunião foi concluída.') };
  if (name === 'approval.requested') return { category: 'approval', severity: 'high', title: 'Aprovação pendente', body: String(payload.title ?? 'Uma aprovação requer a sua atenção.') };
  if (name === 'approval.approved') return { category: 'approval', severity: 'medium', title: 'Aprovação concluída', body: String(payload.title ?? 'Uma aprovação foi aprovada.') };
  if (name === 'approval.rejected') return { category: 'approval', severity: 'high', title: 'Aprovação rejeitada', body: String(payload.title ?? 'Uma aprovação foi rejeitada.') };
  if (name === 'form.submitted') return { category: 'form', severity: 'medium', title: 'Novo formulário submetido', body: String(payload.title ?? 'Um formulário recebeu uma nova submissão.') };
  if (name === 'document.updated') return { category: 'document', severity: 'low', title: 'Documento atualizado', body: String(payload.title ?? 'Um documento foi atualizado.') };
  if (name === 'workflow.failed') return { category: 'alert', severity: 'critical', title: 'Workflow falhou', body: String(payload.error ?? payload.title ?? 'Uma execução de workflow falhou.') };
  if (name === 'decision.created' || name === 'decision.updated') return { category: 'decision', severity: 'medium', title: 'Decisão registada', body: String(payload.title ?? 'Uma decisão organizacional foi registada.') };
  if (name.endsWith('.alert') || name.startsWith('incident.')) return { category: 'alert', severity: 'critical', title: 'Alerta operacional', body: String(payload.message ?? payload.title ?? 'Um alerta operacional requer atenção.') };
  if (name === 'user.joined') return { category: 'system', severity: 'info', title: 'Novo membro na empresa', body: String(payload.displayName ?? payload.email ?? 'Um novo membro juntou-se à empresa.') };
  return { category: 'system', severity: 'info', title: 'Nova atividade', body: String(payload.title ?? `Evento ${eventName}`) };
}

function targetUsers(event: { companyId: string; actorId: string; eventName: string; payload: Record<string, unknown> }, members: Array<{ id: string; role?: string }>): string[] {
  const direct = ['userId', 'assigneeId', 'assignedTo', 'ownerId', 'requesterId', 'approverId', 'recipientId']
    .map((key) => event.payload[key]).filter((value): value is string => typeof value === 'string' && value.length > 0);
  if (direct.length) return Array.from(new Set(direct)).filter((uid) => uid !== event.actorId);
  if (event.eventName === 'workflow.failed' || event.eventName.startsWith('incident.') || event.eventName.endsWith('.alert')) {
    return members.filter((member) => ['owner', 'admin', 'manager'].includes(member.role ?? '')).map((member) => member.id);
  }
  return [];
}

export async function createNotificationFromEvent(event: { eventId: string; companyId: string; actorId: string; eventName: string; entityType: string; entityId: string; payload: Record<string, unknown>; metadata?: Record<string, unknown> }): Promise<number> {
  const db = getAdminDb();
  const descriptor = describeNotificationEvent(event.eventName, event.payload);
  const membershipSnapshot = await db.collection('companies').doc(event.companyId).collection('members').where('status', '==', 'active').limit(500).get();
  const members = membershipSnapshot.docs.map((doc) => ({ id: doc.id, role: String(doc.data().role ?? '') }));
  const users = targetUsers(event, members);
  if (!users.length) return 0;
  let created = 0;
  for (const userId of users) {
    const mode: NotificationMode = DEFAULT_PREFERENCES[descriptor.category];
    if (mode === 'mute' || (mode === 'critical-only' && !['critical', 'high'].includes(descriptor.severity))) continue;
    const notificationId = `${event.eventId}_${userId}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 700);
    const ref = db.collection('notifications').doc(userId).collection('items').doc(notificationId);
    await db.runTransaction(async (transaction) => {
      if ((await transaction.get(ref)).exists) return;
      transaction.create(ref, {
        id: notificationId,
        companyId: event.companyId,
        userId,
        category: descriptor.category,
        severity: descriptor.severity,
        title: descriptor.title,
        body: descriptor.body,
        entityType: event.entityType,
        entityId: event.entityId,
        eventName: event.eventName,
        actionUrl: `/dashboard/${event.entityType.replace(/_/g, '-')}`,
        read: false,
        channels: ['in-app'],
        createdAt: Timestamp.now(),
        metadata: { ...(event.metadata ?? {}), sourceEventId: event.eventId },
      });
      created += 1;
    });
  }
  return created;
}

export async function listInbox(options: { limit?: number; onlyUnread?: boolean; category?: string; since?: Date } = {}) {
  const identity = await requireIdentity();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const snapshot = await getAdminDb().collection('notifications').doc(identity.uid).collection('items').orderBy('createdAt', 'desc').limit(limit).get();
  let records = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })) as Array<Record<string, unknown>>;
  records = records.filter((item) => item.companyId === identity.companyId);
  if (options.onlyUnread) records = records.filter((item) => item.read !== true);
  if (options.category) records = records.filter((item) => item.category === options.category);
  if (options.since) records = records.filter((item) => {
    const createdAt = item.createdAt;
    const createdMillis = createdAt instanceof Timestamp ? createdAt.toMillis() : typeof createdAt === 'string' ? Date.parse(createdAt) : 0;
    return createdMillis >= options.since!.getTime();
  });
  return records;
}

export async function markInboxRead(notificationIds: string[]) {
  const identity = await requireIdentity();
  const db = getAdminDb();
  const batch = db.batch();
  for (const id of notificationIds.slice(0, 100)) batch.update(db.collection('notifications').doc(identity.uid).collection('items').doc(id), { read: true, readAt: FieldValue.serverTimestamp() });
  if (notificationIds.length) await batch.commit();
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'notification.read', resourceType: 'notification', resourceId: identity.uid, metadata: { notificationIds: notificationIds.slice(0, 100) } });
}

export async function getNotificationPreferences() {
  const identity = await requireIdentity();
  const snapshot = await getAdminDb().collection('notification_preferences').doc(identity.uid).get();
  return { ...DEFAULT_PREFERENCES, ...(snapshot.data() ?? {}) };
}

export async function updateNotificationPreferences(input: Record<string, unknown>) {
  const identity = await requireIdentity();
  const allowedModes: NotificationMode[] = ['instant', 'digest', 'mute', 'critical-only'];
  const sanitized: Record<string, NotificationMode> = {};
  for (const [category, value] of Object.entries(input)) if (category in DEFAULT_PREFERENCES && typeof value === 'string' && allowedModes.includes(value as NotificationMode)) sanitized[category] = value as NotificationMode;
  await getAdminDb().collection('notification_preferences').doc(identity.uid).set({ ...sanitized, updatedAt: FieldValue.serverTimestamp(), updatedBy: identity.uid }, { merge: true });
  return { ...DEFAULT_PREFERENCES, ...sanitized };
}
