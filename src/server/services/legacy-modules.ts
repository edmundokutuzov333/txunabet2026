import 'server-only';

import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity, requirePermission, type AuthenticatedIdentity } from '@/server/authorization';
import { PERMISSIONS, type Permission } from '@/server/authorization/permissions';
import { writeAuditEvent } from '@/server/repositories/audit';

export type ModuleName =
  | 'cloud'
  | 'calendar'
  | 'meetings'
  | 'integrations'
  | 'knowledge-base'
  | 'campaigns'
  | 'tasks'
  | 'reports'
  | 'workflows'
  | 'automations'
  | 'pulse'
  | 'workspaces';

type ModuleConfig = {
  collection: string;
  read: Permission;
  write: Permission;
  titleField?: string;
};

const CONFIG: Record<ModuleName, ModuleConfig> = {
  cloud: { collection: 'module_cloud_files', read: PERMISSIONS.FILES_READ, write: PERMISSIONS.FILES_WRITE, titleField: 'name' },
  calendar: { collection: 'module_calendar_events', read: PERMISSIONS.OPERATIONS_READ, write: PERMISSIONS.OPERATIONS_MANAGE, titleField: 'title' },
  meetings: { collection: 'module_meetings', read: PERMISSIONS.OPERATIONS_READ, write: PERMISSIONS.OPERATIONS_MANAGE, titleField: 'title' },
  integrations: { collection: 'module_integrations', read: PERMISSIONS.AUTOMATION_READ, write: PERMISSIONS.AUTOMATION_MANAGE, titleField: 'name' },
  'knowledge-base': { collection: 'module_knowledge_articles', read: PERMISSIONS.KNOWLEDGE_READ, write: PERMISSIONS.KNOWLEDGE_MANAGE, titleField: 'title' },
  campaigns: { collection: 'module_campaigns', read: PERMISSIONS.MARKETING_READ, write: PERMISSIONS.MARKETING_MANAGE, titleField: 'name' },
  tasks: { collection: 'module_tasks', read: PERMISSIONS.OPERATIONS_READ, write: PERMISSIONS.OPERATIONS_MANAGE, titleField: 'title' },
  reports: { collection: 'module_reports', read: PERMISSIONS.REPORTING_READ, write: PERMISSIONS.REPORTING_MANAGE, titleField: 'name' },
  workflows: { collection: 'module_workflows', read: PERMISSIONS.AUTOMATION_READ, write: PERMISSIONS.AUTOMATION_MANAGE, titleField: 'name' },
  automations: { collection: 'module_automations', read: PERMISSIONS.AUTOMATION_READ, write: PERMISSIONS.AUTOMATION_MANAGE, titleField: 'name' },
  pulse: { collection: 'module_pulse_items', read: PERMISSIONS.OPERATIONS_READ, write: PERMISSIONS.OPERATIONS_MANAGE, titleField: 'title' },
  workspaces: { collection: 'module_workspaces', read: PERMISSIONS.OPERATIONS_READ, write: PERMISSIONS.OPERATIONS_MANAGE, titleField: 'name' },
};

const SAFE_KEY = /^[A-Za-z0-9_-]{1,180}$/;
const MAX_RECORDS = 200;
const MAX_KEYS = 60;
const MAX_STRING = 5000;

function configFor(module: string): ModuleConfig {
  if (!(module in CONFIG)) throw new Error('MODULE_NOT_FOUND');
  return CONFIG[module as ModuleName];
}

function normalizePrimitive(value: unknown): unknown {
  if (typeof value === 'string') return value.trim().slice(0, MAX_STRING);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value;
  if (value === null) return null;
  if (Array.isArray(value)) return value.slice(0, 200).map(normalizePrimitive);
  if (value instanceof Date) return value;
  return undefined;
}

function sanitizePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('INVALID_PAYLOAD');
  const entries = Object.entries(payload as Record<string, unknown>).slice(0, MAX_KEYS);
  const result: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (!SAFE_KEY.test(key)) continue;
    const normalized = normalizePrimitive(value);
    if (normalized !== undefined) result[key] = normalized;
  }
  return result;
}

function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = serialize(item);
    return out;
  }
  return value;
}

function publicRecord(doc: FirebaseFirestore.QueryDocumentSnapshot<DocumentData> | FirebaseFirestore.DocumentSnapshot<DocumentData>): Record<string, unknown> {
  const data = doc.data() ?? {};
  return serialize({ ...data, id: doc.id }) as Record<string, unknown>;
}

function titleFor(config: ModuleConfig, data: Record<string, unknown>): string {
  const value = config.titleField ? data[config.titleField] : undefined;
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 240) : 'Sem título';
}

async function ensureCompanyAccess(identity: AuthenticatedIdentity, data: DocumentData): Promise<void> {
  if (data.companyId !== identity.companyId) throw new Error('FORBIDDEN');
}

export async function listModuleRecords(module: ModuleName, options?: { q?: string; limit?: number }): Promise<Record<string, unknown>[]> {
  const config = configFor(module);
  const identity = await requirePermission(config.read);
  let query = getAdminDb().collection(config.collection).where('companyId', '==', identity.companyId).orderBy('updatedAt', 'desc').limit(Math.min(options?.limit ?? MAX_RECORDS, MAX_RECORDS));
  const snapshot = await query.get();
  const records = snapshot.docs.map(publicRecord);
  const q = options?.q?.trim().toLowerCase();
  if (!q) return records;
  return records.filter((record) => JSON.stringify(record).toLowerCase().includes(q));
}

export async function getModuleRecord(module: ModuleName, id: string): Promise<Record<string, unknown>> {
  const config = configFor(module);
  const identity = await requirePermission(config.read);
  if (!SAFE_KEY.test(id)) throw new Error('INVALID_ID');
  const snapshot = await getAdminDb().collection(config.collection).doc(id).get();
  if (!snapshot.exists) throw new Error('NOT_FOUND');
  await ensureCompanyAccess(identity, snapshot.data());
  return publicRecord(snapshot);
}

export async function createModuleRecord(module: ModuleName, rawData: unknown): Promise<Record<string, unknown>> {
  const config = configFor(module);
  const identity = await requirePermission(config.write);
  const data = sanitizePayload(rawData);
  const title = titleFor(config, data);
  const ref = getAdminDb().collection(config.collection).doc();
  const now = FieldValue.serverTimestamp();
  await ref.create({
    ...data,
    id: ref.id,
    companyId: identity.companyId,
    createdBy: identity.uid,
    updatedBy: identity.uid,
    createdAt: now,
    updatedAt: now,
    version: 1,
    searchTitle: title.toLowerCase(),
  });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'create', resourceType: module, resourceId: ref.id, metadata: { title } });
  return getModuleRecord(module, ref.id);
}

export async function updateModuleRecord(module: ModuleName, id: string, rawData: unknown): Promise<Record<string, unknown>> {
  const config = configFor(module);
  const identity = await requirePermission(config.write);
  if (!SAFE_KEY.test(id)) throw new Error('INVALID_ID');
  const ref = getAdminDb().collection(config.collection).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('NOT_FOUND');
  await ensureCompanyAccess(identity, snapshot.data());
  const data = sanitizePayload(rawData);
  const title = titleFor(config, { ...snapshot.data(), ...data });
  await ref.update({ ...data, updatedBy: identity.uid, updatedAt: FieldValue.serverTimestamp(), version: FieldValue.increment(1), searchTitle: title.toLowerCase() });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'update', resourceType: module, resourceId: id, metadata: { title } });
  return getModuleRecord(module, id);
}

export async function deleteModuleRecord(module: ModuleName, id: string): Promise<void> {
  const config = configFor(module);
  const identity = await requirePermission(config.write);
  if (!SAFE_KEY.test(id)) throw new Error('INVALID_ID');
  const ref = getAdminDb().collection(config.collection).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('NOT_FOUND');
  await ensureCompanyAccess(identity, snapshot.data());
  await ref.delete();
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'delete', resourceType: module, resourceId: id });
}

export async function getModuleAnalytics(): Promise<{ totals: Record<string, number>; activity: { date: string; count: number }[] }> {
  const identity = await requireIdentity();
  const db = getAdminDb();
  const entries = Object.entries(CONFIG);
  const totals: Record<string, number> = {};
  const activity = new Map<string, number>();
  for (const [module, config] of entries) {
    const snapshot = await db.collection(config.collection).where('companyId', '==', identity.companyId).limit(500).get();
    totals[module] = snapshot.size;
    for (const doc of snapshot.docs) {
      const createdAt = doc.data().createdAt;
      let date = '';
      if (createdAt instanceof Timestamp) date = createdAt.toDate().toISOString().slice(0, 10);
      else if (createdAt instanceof Date) date = createdAt.toISOString().slice(0, 10);
      if (date) activity.set(date, (activity.get(date) ?? 0) + 1);
    }
  }
  return {
    totals,
    activity: Array.from(activity.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, count]) => ({ date, count })),
  };
}

export function modulePermissions(module: ModuleName): { read: Permission; write: Permission } {
  const config = configFor(module);
  return { read: config.read, write: config.write };
}
