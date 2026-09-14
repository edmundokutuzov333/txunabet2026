import 'server-only';

import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { getAdminDb, getAdminStorage } from '@/server/firebase/admin';
import { requireIdentity, requirePermission, type AuthenticatedIdentity } from '@/server/authorization';
import { PERMISSIONS, type Permission } from '@/server/authorization/permissions';
import { writeAuditEvent } from '@/server/repositories/audit';
import { publishDomainEvent } from '@/server/services/foundation';
import { MODULE_SAFE_KEY, sanitizeModulePayload } from '@/lib/quality/module-security';
import type { EntityType } from '@/server/domain/entities';

export type ModuleName =
  | 'cloud' | 'calendar' | 'meetings' | 'integrations' | 'knowledge-base' | 'campaigns'
  | 'tasks' | 'reports' | 'workflows' | 'automations' | 'pulse' | 'workspaces';

type ModuleConfig = { collection: string; read: Permission; write: Permission; titleField?: string; entityType: EntityType };

const CONFIG: Record<ModuleName, ModuleConfig> = {
  cloud: { collection: 'module_cloud_files', read: PERMISSIONS.FILES_READ, write: PERMISSIONS.FILES_WRITE, titleField: 'name', entityType: 'file' },
  calendar: { collection: 'module_calendar_events', read: PERMISSIONS.OPERATIONS_READ, write: PERMISSIONS.OPERATIONS_MANAGE, titleField: 'title', entityType: 'event' },
  meetings: { collection: 'module_meetings', read: PERMISSIONS.OPERATIONS_READ, write: PERMISSIONS.OPERATIONS_MANAGE, titleField: 'title', entityType: 'meeting' },
  integrations: { collection: 'module_integrations', read: PERMISSIONS.AUTOMATION_READ, write: PERMISSIONS.AUTOMATION_MANAGE, titleField: 'name', entityType: 'integration' },
  'knowledge-base': { collection: 'module_knowledge_articles', read: PERMISSIONS.KNOWLEDGE_READ, write: PERMISSIONS.KNOWLEDGE_MANAGE, titleField: 'title', entityType: 'knowledge_article' },
  campaigns: { collection: 'module_campaigns', read: PERMISSIONS.MARKETING_READ, write: PERMISSIONS.MARKETING_MANAGE, titleField: 'name', entityType: 'campaign' },
  tasks: { collection: 'module_tasks', read: PERMISSIONS.OPERATIONS_READ, write: PERMISSIONS.OPERATIONS_MANAGE, titleField: 'title', entityType: 'task' },
  reports: { collection: 'module_reports', read: PERMISSIONS.REPORTING_READ, write: PERMISSIONS.REPORTING_MANAGE, titleField: 'name', entityType: 'report' },
  workflows: { collection: 'module_workflows', read: PERMISSIONS.AUTOMATION_READ, write: PERMISSIONS.AUTOMATION_MANAGE, titleField: 'name', entityType: 'workflow' },
  automations: { collection: 'module_automations', read: PERMISSIONS.AUTOMATION_READ, write: PERMISSIONS.AUTOMATION_MANAGE, titleField: 'name', entityType: 'automation' },
  pulse: { collection: 'module_pulse_items', read: PERMISSIONS.OPERATIONS_READ, write: PERMISSIONS.OPERATIONS_MANAGE, titleField: 'title', entityType: 'activity' },
  workspaces: { collection: 'module_workspaces', read: PERMISSIONS.OPERATIONS_READ, write: PERMISSIONS.OPERATIONS_MANAGE, titleField: 'name', entityType: 'workspace' },
};

const MAX_RECORDS = 200;
const CLOUD_IMMUTABLE_FIELDS = new Set(['storagePath', 'mimeType', 'size', 'ownerId', 'createdBy']);

function configFor(module: string): ModuleConfig {
  if (!(module in CONFIG)) throw new Error('MODULE_NOT_FOUND');
  return CONFIG[module as ModuleName];
}

function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, serialize(item)]));
  return value;
}

function publicRecord(doc: { id: string; data: () => DocumentData | undefined }): Record<string, unknown> {
  return serialize({ ...(doc.data() ?? {}), id: doc.id }) as Record<string, unknown>;
}

function titleFor(config: ModuleConfig, data: Record<string, unknown>): string {
  const value = config.titleField ? data[config.titleField] : undefined;
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 240) : '';
}

function isPrivileged(identity: AuthenticatedIdentity): boolean {
  return identity.role === 'owner' || identity.role === 'admin';
}

function hasCloudAccess(identity: AuthenticatedIdentity, data: DocumentData | undefined): boolean {
  if (!data || data.companyId !== identity.companyId) return false;
  if (isPrivileged(identity)) return true;
  if (data.ownerId === identity.uid || data.createdBy === identity.uid) return true;
  return Array.isArray(data.sharedWith) && data.sharedWith.includes(identity.uid);
}

function hasCloudWriteAccess(identity: AuthenticatedIdentity, data: DocumentData | undefined): boolean {
  if (!data || data.companyId !== identity.companyId) return false;
  if (isPrivileged(identity)) return true;
  return data.ownerId === identity.uid || data.createdBy === identity.uid;
}

async function ensureRecordAccess(module: ModuleName, identity: AuthenticatedIdentity, data: DocumentData | undefined): Promise<void> {
  if (module === 'cloud') {
    if (!hasCloudAccess(identity, data)) throw new Error('FORBIDDEN');
    return;
  }
  if (!data || data.companyId !== identity.companyId) throw new Error('FORBIDDEN');
}

async function emitModuleEvent(identity: AuthenticatedIdentity, module: ModuleName, action: 'created' | 'updated' | 'deleted', id: string, data: Record<string, unknown> = {}): Promise<void> {
  const config = configFor(module);
  await publishDomainEvent({
    eventName: `${config.entityType}.${action}`,
    entityType: config.entityType,
    entityId: id,
    payload: { module, ...data },
    metadata: { source: 'legacy-module-service' },
  }, { companyId: identity.companyId, actorId: identity.uid });
}

export async function listModuleRecords(module: ModuleName, options?: { q?: string; limit?: number }): Promise<Record<string, unknown>[]> {
  const config = configFor(module);
  const identity = await requirePermission(config.read);
  const snapshot = await getAdminDb().collection(config.collection).where('companyId', '==', identity.companyId).limit(Math.min(options?.limit ?? MAX_RECORDS, MAX_RECORDS)).get();
  let records = snapshot.docs.map(publicRecord);
  if (module === 'cloud' && !isPrivileged(identity)) records = records.filter((record) => record.ownerId === identity.uid || record.createdBy === identity.uid || (Array.isArray(record.sharedWith) && record.sharedWith.includes(identity.uid)));
  records.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
  const q = options?.q?.trim().toLowerCase();
  return q ? records.filter((record) => JSON.stringify(record).toLowerCase().includes(q)) : records;
}

export async function getModuleRecord(module: ModuleName, id: string): Promise<Record<string, unknown>> {
  const config = configFor(module);
  const identity = await requirePermission(config.read);
  if (!MODULE_SAFE_KEY.test(id)) throw new Error('INVALID_ID');
  const snapshot = await getAdminDb().collection(config.collection).doc(id).get();
  if (!snapshot.exists) throw new Error('NOT_FOUND');
  await ensureRecordAccess(module, identity, snapshot.data());
  return publicRecord(snapshot);
}

export async function createModuleRecord(module: ModuleName, rawData: unknown): Promise<Record<string, unknown>> {
  const config = configFor(module);
  const identity = await requirePermission(config.write);
  const data = sanitizeModulePayload(rawData);
  if (module === 'cloud' && data.type !== 'folder') throw new Error('CLOUD_FILES_REQUIRE_UPLOAD');
  const title = titleFor(config, data);
  if (config.titleField && !title) throw new Error('TITLE_REQUIRED');
  const ref = getAdminDb().collection(config.collection).doc();
  const now = FieldValue.serverTimestamp();
  await ref.create({ ...data, id: ref.id, companyId: identity.companyId, ownerId: module === 'cloud' ? identity.uid : data.ownerId, createdBy: identity.uid, updatedBy: identity.uid, createdAt: now, updatedAt: now, version: 1, status: data.status ?? 'active', metadata: data.metadata ?? {}, permissions: data.permissions ?? {}, searchTitle: title.toLowerCase() });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'create', resourceType: module, resourceId: ref.id, metadata: { title } });
  await emitModuleEvent(identity, module, 'created', ref.id, { record: publicRecord(await ref.get()) });
  return getModuleRecord(module, ref.id);
}

export async function updateModuleRecord(module: ModuleName, id: string, rawData: unknown): Promise<Record<string, unknown>> {
  const config = configFor(module);
  const identity = await requirePermission(config.write);
  if (!MODULE_SAFE_KEY.test(id)) throw new Error('INVALID_ID');
  const ref = getAdminDb().collection(config.collection).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('NOT_FOUND');
  const current = snapshot.data();
  await ensureRecordAccess(module, identity, current);
  if (module === 'cloud' && !hasCloudWriteAccess(identity, current)) throw new Error('FORBIDDEN');
  let data = sanitizeModulePayload(rawData);
  if (module === 'cloud') data = Object.fromEntries(Object.entries(data).filter(([key]) => !CLOUD_IMMUTABLE_FIELDS.has(key)));
  const merged = { ...(current ?? {}), ...data } as Record<string, unknown>;
  const title = titleFor(config, merged);
  if (config.titleField && !title) throw new Error('TITLE_REQUIRED');
  const nextVersion = Number(current?.version ?? 1) + 1;
  await ref.update({ ...data, updatedBy: identity.uid, updatedAt: FieldValue.serverTimestamp(), version: nextVersion, status: data.status ?? current?.status ?? 'active', metadata: data.metadata ?? current?.metadata ?? {}, permissions: data.permissions ?? current?.permissions ?? {}, searchTitle: title.toLowerCase() });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'update', resourceType: module, resourceId: id, metadata: { title, version: nextVersion } });
  await emitModuleEvent(identity, module, 'updated', id, { record: await getModuleRecord(module, id) });
  return getModuleRecord(module, id);
}

export async function deleteModuleRecord(module: ModuleName, id: string): Promise<void> {
  const config = configFor(module);
  const identity = await requirePermission(config.write);
  if (!MODULE_SAFE_KEY.test(id)) throw new Error('INVALID_ID');
  const ref = getAdminDb().collection(config.collection).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('NOT_FOUND');
  const data = snapshot.data();
  await ensureRecordAccess(module, identity, data);
  if (module === 'cloud' && !hasCloudWriteAccess(identity, data)) throw new Error('FORBIDDEN');
  if (module === 'cloud' && typeof data?.storagePath === 'string') await getAdminStorage().bucket().file(data.storagePath).delete({ ignoreNotFound: true });
  await ref.delete();
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'delete', resourceType: module, resourceId: id });
  await emitModuleEvent(identity, module, 'deleted', id);
}

export async function getModuleAnalytics(): Promise<{ totals: Record<string, number>; activity: { date: string; count: number }[] }> {
  const identity = await requireIdentity();
  const db = getAdminDb();
  const entries = Object.entries(CONFIG);
  const snapshots = await Promise.all(entries.map(async ([module, config]) => [module, await db.collection(config.collection).where('companyId', '==', identity.companyId).limit(500).get()] as const));
  const totals: Record<string, number> = {};
  const activity = new Map<string, number>();
  for (const [module, snapshot] of snapshots) {
    const visible = module !== 'cloud' || isPrivileged(identity) ? snapshot.docs : snapshot.docs.filter((doc) => doc.data().ownerId === identity.uid || doc.data().createdBy === identity.uid || (Array.isArray(doc.data().sharedWith) && doc.data().sharedWith.includes(identity.uid)));
    totals[module] = visible.length;
    for (const doc of visible) {
      const createdAt = doc.data().createdAt;
      const date = createdAt instanceof Timestamp ? createdAt.toDate().toISOString().slice(0, 10) : createdAt instanceof Date ? createdAt.toISOString().slice(0, 10) : '';
      if (date) activity.set(date, (activity.get(date) ?? 0) + 1);
    }
  }
  return { totals, activity: Array.from(activity.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, count]) => ({ date, count })) };
}

export function modulePermissions(module: ModuleName): { read: Permission; write: Permission } {
  const config = configFor(module);
  return { read: config.read, write: config.write };
}
