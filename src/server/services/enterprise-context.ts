import 'server-only';

import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity, requirePermission, type AuthenticatedIdentity } from '@/server/authorization';
import { PERMISSIONS, type Permission } from '@/server/authorization/permissions';
import { writeAuditEvent } from '@/server/repositories/audit';
import { Timestamp, type DocumentData } from 'firebase-admin/firestore';

export type ContextType = 'messages' | 'people' | 'tasks' | 'projects' | 'campaigns' | 'meetings' | 'documents' | 'files' | 'knowledge' | 'decisions' | 'approvals' | 'workflows' | 'reports';
export type SearchScope = ContextType | 'all';
export type SearchResult = { id: string; type: ContextType; title: string; snippet: string; score: number; updatedAt?: string; workspaceId?: string; ownerId?: string; metadata: Record<string, unknown> };

type Source = { type: ContextType; collection: string; permission: Permission; titleFields: string[]; textFields: string[]; special?: 'people' | 'cloud' | 'messages' };

const SOURCES: Source[] = [
  { type: 'people', collection: 'members', permission: PERMISSIONS.USERS_READ, titleFields: ['displayName', 'name', 'email'], textFields: ['displayName', 'name', 'email', 'department', 'role'], special: 'people' },
  { type: 'tasks', collection: 'module_tasks', permission: PERMISSIONS.OPERATIONS_READ, titleFields: ['title', 'name'], textFields: ['title', 'description', 'status', 'priority', 'assigneeId', 'ownerId'] },
  { type: 'projects', collection: 'projects', permission: PERMISSIONS.OPERATIONS_READ, titleFields: ['title', 'name'], textFields: ['title', 'name', 'description', 'status', 'ownerId'] },
  { type: 'campaigns', collection: 'module_campaigns', permission: PERMISSIONS.MARKETING_READ, titleFields: ['name', 'title'], textFields: ['name', 'title', 'description', 'status', 'ownerId'] },
  { type: 'meetings', collection: 'module_meetings', permission: PERMISSIONS.OPERATIONS_READ, titleFields: ['title', 'name'], textFields: ['title', 'name', 'description', 'agenda', 'notes', 'transcript'] },
  { type: 'documents', collection: 'module_documents', permission: PERMISSIONS.DOCUMENTS_READ, titleFields: ['title', 'name'], textFields: ['title', 'name', 'content', 'summary', 'description'] },
  { type: 'files', collection: 'module_cloud_files', permission: PERMISSIONS.FILES_READ, titleFields: ['name', 'title'], textFields: ['name', 'title', 'description', 'mimeType'], special: 'cloud' },
  { type: 'knowledge', collection: 'module_knowledge_articles', permission: PERMISSIONS.KNOWLEDGE_READ, titleFields: ['title', 'name'], textFields: ['title', 'name', 'content', 'summary', 'tags'] },
  { type: 'decisions', collection: 'module_decisions', permission: PERMISSIONS.OPERATIONS_READ, titleFields: ['title', 'name'], textFields: ['title', 'name', 'summary', 'decision', 'rationale', 'meetingId'] },
  { type: 'approvals', collection: 'approvals', permission: PERMISSIONS.APPROVALS_READ, titleFields: ['title'], textFields: ['title', 'description', 'state', 'status', 'entityType', 'entityId'] },
  { type: 'workflows', collection: 'module_workflows', permission: PERMISSIONS.AUTOMATION_READ, titleFields: ['name', 'title'], textFields: ['name', 'title', 'description', 'status'] },
  { type: 'reports', collection: 'module_reports', permission: PERMISSIONS.REPORTING_READ, titleFields: ['name', 'title'], textFields: ['name', 'title', 'description', 'content', 'summary'] },
  { type: 'messages', collection: 'chat_messages', permission: PERMISSIONS.CHAT_READ, titleFields: ['text', 'title'], textFields: ['text', 'title', 'body', 'content'], special: 'messages' },
];

function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialize(v)]));
  return value;
}
function textOf(data: DocumentData, fields: string[]): string { return fields.map((field) => { const value = data[field]; if (typeof value === 'string') return value; if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' || typeof item === 'number').join(' '); if (value && typeof value === 'object') return JSON.stringify(serialize(value)); if (typeof value === 'number' || typeof value === 'boolean') return String(value); return ''; }).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(); }
function titleOf(data: DocumentData, fields: string[]): string { for (const field of fields) if (typeof data[field] === 'string' && data[field].trim()) return data[field].trim().slice(0, 240); return 'Sem título'; }
function visible(data: DocumentData, identity: AuthenticatedIdentity, special?: Source['special']): boolean {
  if (data.companyId !== identity.companyId) return false;
  if (special === 'people') return true;
  if (special === 'cloud') return data.ownerId === identity.uid || data.createdBy === identity.uid || (Array.isArray(data.sharedWith) && data.sharedWith.includes(identity.uid)) || ['owner', 'admin'].includes(identity.role);
  if (Array.isArray(data.sharedWith) && data.sharedWith.includes(identity.uid)) return true;
  if (Array.isArray(data.permissions?.userIds) && data.permissions.userIds.includes(identity.uid)) return true;
  return true;
}
async function sourceRows(source: Source, identity: AuthenticatedIdentity): Promise<Array<{ source: Source; id: string; data: DocumentData; title: string; text: string }>> {
  const db = getAdminDb();
  const base = source.special === 'people' ? db.collection('companies').doc(identity.companyId).collection(source.collection) : db.collection(source.collection);
  const snapshot = await base.where('companyId', '==', identity.companyId).limit(source.special === 'messages' ? 250 : 200).get();
  return snapshot.docs.filter((doc) => visible(doc.data(), identity, source.special)).map((doc) => ({ source, id: doc.id, data: doc.data(), title: titleOf(doc.data(), source.titleFields), text: textOf(doc.data(), source.textFields) }));
}
function tokenize(query: string): string[] { return Array.from(new Set(query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((token) => token.length >= 2))); }
function lexicalScore(query: string, title: string, text: string): number { const q = query.toLowerCase(); const tokens = tokenize(query); if (!tokens.length) return 0; const hay = `${title} ${text}`.toLowerCase(); const exact = hay.includes(q) ? 0.45 : 0; const tokenScore = tokens.reduce((sum, token) => sum + (hay.includes(token) ? 1 : 0), 0) / tokens.length; const titleBoost = tokens.reduce((sum, token) => sum + (title.toLowerCase().includes(token) ? 1 : 0), 0) / tokens.length * 0.35; return Math.min(1, exact + tokenScore * 0.2 + titleBoost); }
async function embed(text: string, taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' = 'RETRIEVAL_QUERY'): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY; if (!key) return [];
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ model: 'models/gemini-embedding-001', content: { parts: [{ text: text.slice(0, 8000) }] }, taskType }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`GEMINI_EMBED_${response.status}`);
  const json = await response.json() as { embedding?: { values?: number[] } }; return json.embedding?.values ?? [];
}
function cosine(a: number[], b: number[]): number { if (!a.length || !b.length || a.length !== b.length) return 0; let dot = 0; let na = 0; let nb = 0; for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return na && nb ? dot / Math.sqrt(na * nb) : 0; }

export async function enterpriseSearch(options: { q: string; scope?: SearchScope; type?: ContextType; workspaceId?: string; personId?: string; limit?: number; semantic?: boolean }): Promise<SearchResult[]> {
  const identity = await requireIdentity(); const q = options.q.trim(); if (!q) return [];
  const requestedTypes = options.type && options.type !== 'messages' ? [options.type] : options.scope === 'all' || !options.scope ? SOURCES.map((s) => s.type) : [options.scope as ContextType];
  const rows: Array<{ source: Source; id: string; data: DocumentData; title: string; text: string }> = [];
  for (const source of SOURCES.filter((s) => requestedTypes.includes(s.type))) { try { await requirePermission(source.permission); rows.push(...await sourceRows(source, identity)); } catch { /* inaccessible source */ } }
  const filtered = rows.filter((row) => !options.workspaceId || row.data.workspaceId === options.workspaceId).filter((row) => !options.personId || [row.data.ownerId, row.data.assigneeId, row.data.userId].includes(options.personId));
  const lexical = filtered.map((row) => ({ row, lexical: lexicalScore(q, row.title, row.text) })).sort((a, b) => b.lexical - a.lexical);
  let queryEmbedding: number[] = [];
  if (options.semantic !== false && process.env.GEMINI_API_KEY) { try { queryEmbedding = await embed(q, 'RETRIEVAL_QUERY'); } catch { queryEmbedding = []; } }
  const db = getAdminDb(); const vectorCandidates = lexical.slice(0, queryEmbedding.length ? 80 : 0);
  const vectorMap = new Map<string, number[]>();
  if (queryEmbedding.length) {
    await Promise.all(vectorCandidates.map(async ({ row }) => {
      const ref = db.collection('enterprise_search_index').doc(`${row.source.type}_${row.id}`.replace(/[^A-Za-z0-9_-]/g, '_'));
      const cached = await ref.get(); const cachedEmbedding = cached.data()?.embedding; if (Array.isArray(cachedEmbedding) && cachedEmbedding.length) { vectorMap.set(`${row.source.type}:${row.id}`, cachedEmbedding.filter((v): v is number => typeof v === 'number')); return; }
      try { const vector = await embed(`${row.title}\n${row.text}`, 'RETRIEVAL_DOCUMENT'); if (vector.length) { vectorMap.set(`${row.source.type}:${row.id}`, vector); await ref.set({ companyId: identity.companyId, sourceType: row.source.type, sourceId: row.id, title: row.title, text: row.text.slice(0, 12000), embedding: vector, updatedAt: Timestamp.now() }, { merge: true }); } } catch { /* lexical fallback */ }
    }));
  }
  const results: SearchResult[] = [];
  for (const { row, lexical: lexicalValue } of lexical) {
    const semanticValue = queryEmbedding.length ? Math.max(0, cosine(queryEmbedding, vectorMap.get(`${row.source.type}:${row.id}`) ?? [])) : 0;
    const updatedMillis = row.data.updatedAt instanceof Timestamp ? row.data.updatedAt.toMillis() : typeof row.data.updatedAt === 'string' ? Date.parse(row.data.updatedAt) : 0;
    const recency = updatedMillis ? Math.max(0, 1 - (Date.now() - updatedMillis) / (1000 * 60 * 60 * 24 * 365)) : 0;
    const score = Math.min(1, lexicalValue * (queryEmbedding.length ? 0.48 : 0.9) + semanticValue * (queryEmbedding.length ? 0.47 : 0) + recency * 0.05);
    if (score > 0.02) results.push({ id: row.id, type: row.source.type, title: row.title, snippet: row.text.slice(0, 280), score, updatedAt: updatedMillis ? new Date(updatedMillis).toISOString() : undefined, workspaceId: typeof row.data.workspaceId === 'string' ? row.data.workspaceId : undefined, ownerId: typeof row.data.ownerId === 'string' ? row.data.ownerId : undefined, metadata: serialize({ sourceCollection: row.source.collection, status: row.data.status, entityType: row.data.entityType }) as Record<string, unknown> });
  }
  results.sort((a, b) => b.score - a.score); await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'search.query', resourceType: 'enterprise_search', resourceId: identity.uid, metadata: { q: q.slice(0, 240), resultCount: results.length, semantic: Boolean(queryEmbedding.length) } });
  return results.slice(0, Math.min(Math.max(options.limit ?? 30, 1), 50));
}

export async function getKnowledgeGraph(entityType: ContextType, entityId: string, depth = 1): Promise<Record<string, unknown>> {
  const identity = await requireIdentity(); const source = SOURCES.find((item) => item.type === entityType); if (!source) throw new Error('UNKNOWN_CONTEXT_TYPE'); await requirePermission(source.permission);
  const db = getAdminDb(); const ref = source.special === 'people' ? db.collection('companies').doc(identity.companyId).collection(source.collection).doc(entityId) : db.collection(source.collection).doc(entityId); const snap = await ref.get(); if (!snap.exists || !visible(snap.data() ?? {}, identity, source.special)) throw new Error('NOT_FOUND');
  const node = { id: entityId, type: entityType, title: titleOf(snap.data() ?? {}, source.titleFields), data: serialize(snap.data() ?? {}) }; const edges: Array<Record<string, unknown>> = []; const data = snap.data() ?? {};
  const relationMap: Array<[string, ContextType]> = [['projectId', 'projects'], ['meetingId', 'meetings'], ['campaignId', 'campaigns'], ['taskId', 'tasks'], ['documentId', 'documents'], ['approvalId', 'approvals'], ['workflowId', 'workflows'], ['reportId', 'reports'], ['decisionId', 'decisions'], ['ownerId', 'people'], ['assigneeId', 'people']];
  for (const [field, targetType] of relationMap) { if (typeof data[field] !== 'string') continue; const target = SOURCES.find((item) => item.type === targetType); if (!target) continue; try { const targetRef = (target.special === 'people' ? db.collection('companies').doc(identity.companyId).collection(target.collection) : db.collection(target.collection)).doc(data[field]); const found = await targetRef.get(); if (found.exists && visible(found.data() ?? {}, identity, target.special)) edges.push({ field, to: { id: found.id, type: targetType, title: titleOf(found.data() ?? {}, target.titleFields) } }); } catch { /* inaccessible link */ } }
  if (depth > 1 && edges.length) { const nested = await Promise.all(edges.slice(0, 12).map(async (edge) => getKnowledgeGraph((edge.to as { type: ContextType }).type, String((edge.to as { id: string }).id), depth - 1).catch(() => ({ edges: [] })))); edges.push(...nested.flatMap((graph) => graph.edges as Array<Record<string, unknown>>)); }
  return { nodes: [node], edges };
}
