import 'server-only';

import crypto from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity, type AuthenticatedIdentity } from '@/server/authorization';

export type DocumentRole = 'owner' | 'editor' | 'viewer';
export type DocumentShareKind = 'user' | 'department' | 'company';

export interface DocumentRecord {
  id: string;
  title: string;
  ownerId: string;
  companyId: string;
  createdAt: unknown;
  updatedAt: unknown;
  contentVersion: number;
  currentVersion: number;
  status: 'active' | 'archived' | 'deleted';
  content: Record<string, unknown>;
  textPreview: string;
  viewerIds: string[];
  editorIds: string[];
  sharedDepartmentIds: string[];
  sharedCompany: boolean;
}

function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 240) || 'Novo documento';
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function hashContent(content: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

async function companyMemberActive(identity: AuthenticatedIdentity, uid: string): Promise<boolean> {
  const snapshot = await getAdminDb().collection('companies').doc(identity.companyId).collection('members').doc(uid).get();
  return snapshot.exists && snapshot.data()?.status === 'active';
}

async function departmentBelongsToCompany(identity: AuthenticatedIdentity, departmentId: string): Promise<boolean> {
  const snapshot = await getAdminDb().collection('departments').doc(departmentId).get();
  return snapshot.exists && snapshot.data()?.companyId === identity.companyId;
}

function accessFor(identity: AuthenticatedIdentity, document: DocumentRecord): DocumentRole | null {
  if (document.companyId !== identity.companyId || document.status !== 'active') return null;
  if (document.ownerId === identity.uid) return 'owner';
  if (document.editorIds.includes(identity.uid)) return 'editor';
  if (document.viewerIds.includes(identity.uid)) return 'viewer';
  if (document.sharedCompany) return 'viewer';
  if (document.sharedDepartmentIds.some((id) => identity.departmentIds.includes(id))) return 'viewer';
  return null;
}

export async function requireDocument(documentId: string): Promise<{ identity: AuthenticatedIdentity; role: DocumentRole; ref: FirebaseFirestore.DocumentReference; data: DocumentRecord }> {
  const identity = await requireIdentity();
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(documentId)) throw new Error('INVALID_DOCUMENT');
  const ref = getAdminDb().collection('documents').doc(documentId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('DOCUMENT_NOT_FOUND');
  const data = snapshot.data() as DocumentRecord;
  const role = accessFor(identity, data);
  if (!role) throw new Error('FORBIDDEN');
  return { identity, role, ref, data };
}

export async function createDocument(input: { title?: string; content?: Record<string, unknown>; textPreview?: string }): Promise<DocumentRecord> {
  const identity = await requireIdentity();
  const db = getAdminDb();
  const ref = db.collection('documents').doc();
  const content = input.content && typeof input.content === 'object' ? input.content : {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  };
  const now = FieldValue.serverTimestamp();
  const record = {
    id: ref.id,
    title: normalizeTitle(input.title ?? ''),
    ownerId: identity.uid,
    companyId: identity.companyId,
    createdAt: now,
    updatedAt: now,
    contentVersion: 1,
    currentVersion: 1,
    status: 'active',
    content,
    textPreview: normalizeText(input.textPreview ?? ''),
    viewerIds: [],
    editorIds: [],
    sharedDepartmentIds: [],
    sharedCompany: false,
  } satisfies Record<string, unknown>;
  await ref.set(record);
  const versionRef = ref.collection('versions').doc('v1');
  await versionRef.set({ id: 'v1', documentId: ref.id, companyId: identity.companyId, version: 1, createdBy: identity.uid, createdAt: now, title: record.title, content, textPreview: record.textPreview, contentHash: hashContent(content) });
  const fresh = await ref.get();
  return fresh.data() as DocumentRecord;
}

export async function saveDocument(input: { documentId: string; title?: string; content?: Record<string, unknown>; textPreview?: string; checkpoint?: boolean; expectedVersion?: number }): Promise<DocumentRecord> {
  const { identity, role, ref, data } = await requireDocument(input.documentId);
  if (role === 'viewer') throw new Error('DOCUMENT_READ_ONLY');
  if (input.expectedVersion != null && Number(input.expectedVersion) !== Number(data.contentVersion)) throw new Error('DOCUMENT_VERSION_CONFLICT');

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.title !== undefined) updates.title = normalizeTitle(input.title);
  if (input.content !== undefined) updates.content = input.content;
  if (input.textPreview !== undefined) updates.textPreview = normalizeText(input.textPreview);

  const hasContentChange = input.content !== undefined;
  const nextVersion = Number(data.contentVersion || 0) + (hasContentChange ? 1 : 0);
  if (hasContentChange) updates.contentVersion = nextVersion;

  await ref.update(updates);

  if (input.checkpoint && hasContentChange) {
    const version = nextVersion;
    await ref.collection('versions').doc(`v${version}`).set({
      id: `v${version}`,
      documentId: input.documentId,
      companyId: identity.companyId,
      version,
      createdBy: identity.uid,
      createdAt: FieldValue.serverTimestamp(),
      title: input.title !== undefined ? normalizeTitle(input.title) : data.title,
      content: input.content,
      textPreview: normalizeText(input.textPreview ?? data.textPreview ?? ''),
      contentHash: hashContent(input.content),
    }, { merge: true });
    await ref.update({ currentVersion: version });
  }

  const fresh = await ref.get();
  return fresh.data() as DocumentRecord;
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const identity = await requireIdentity();
  const snapshot = await getAdminDb().collection('documents').where('companyId', '==', identity.companyId).where('status', '==', 'active').orderBy('updatedAt', 'desc').limit(200).get();
  return snapshot.docs.map((doc) => doc.data() as DocumentRecord).filter((document) => accessFor(identity, document) !== null);
}

export async function listVersions(documentId: string) {
  const { ref } = await requireDocument(documentId);
  const snapshot = await ref.collection('versions').orderBy('version', 'desc').limit(100).get();
  return snapshot.docs.map((doc) => doc.data());
}

export async function restoreVersion(documentId: string, version: number): Promise<DocumentRecord> {
  const { identity, role, ref, data } = await requireDocument(documentId);
  if (role === 'viewer') throw new Error('DOCUMENT_READ_ONLY');
  if (!Number.isInteger(version) || version < 1) throw new Error('INVALID_VERSION');
  const versionSnapshot = await ref.collection('versions').doc(`v${version}`).get();
  if (!versionSnapshot.exists) throw new Error('VERSION_NOT_FOUND');
  const versionData = versionSnapshot.data()!;
  const currentVersion = Number(data.contentVersion || 0) + 1;
  await ref.update({ content: versionData.content, title: versionData.title || data.title, textPreview: versionData.textPreview || '', contentVersion: currentVersion, currentVersion, updatedAt: FieldValue.serverTimestamp() });
  await ref.collection('versions').doc(`v${currentVersion}`).set({ id: `v${currentVersion}`, documentId, companyId: identity.companyId, version: currentVersion, createdBy: identity.uid, createdAt: FieldValue.serverTimestamp(), title: versionData.title || data.title, content: versionData.content, textPreview: versionData.textPreview || '', restoredFromVersion: version, contentHash: hashContent(versionData.content) });
  const fresh = await ref.get();
  return fresh.data() as DocumentRecord;
}

export async function shareDocument(input: { documentId: string; kind: DocumentShareKind; targetId?: string; role: Exclude<DocumentRole, 'owner'>; remove?: boolean }) {
  const { identity, role, ref, data } = await requireDocument(input.documentId);
  if (role !== 'owner') throw new Error('FORBIDDEN');
  const targetRole = input.role;
  if (input.kind === 'user') {
    if (!input.targetId || input.targetId === data.ownerId) throw new Error('INVALID_SHARE_TARGET');
    if (!(await companyMemberActive(identity, input.targetId))) throw new Error('SHARE_TARGET_NOT_MEMBER');
    const field = targetRole === 'editor' ? 'editorIds' : 'viewerIds';
    const oppositeField = targetRole === 'editor' ? 'viewerIds' : 'editorIds';
    const current = Array.isArray(data[field]) ? data[field] : [];
    const opposite = Array.isArray(data[oppositeField]) ? oppositeField : [];
    const next = input.remove ? current.filter((id) => id !== input.targetId) : Array.from(new Set([...current, input.targetId]));
    const oppositeCurrent = Array.isArray(data[oppositeField]) ? data[oppositeField] : [];
    await ref.update({ [field]: next, [oppositeField]: input.remove ? oppositeCurrent : oppositeCurrent.filter((id) => id !== input.targetId), updatedAt: FieldValue.serverTimestamp() });
  } else if (input.kind === 'department') {
    if (!input.targetId || !(await departmentBelongsToCompany(identity, input.targetId))) throw new Error('INVALID_SHARE_TARGET');
    const current = Array.isArray(data.sharedDepartmentIds) ? data.sharedDepartmentIds : [];
    const next = input.remove ? current.filter((id) => id !== input.targetId) : Array.from(new Set([...current, input.targetId]));
    await ref.update({ sharedDepartmentIds: next, updatedAt: FieldValue.serverTimestamp() });
  } else {
    await ref.update({ sharedCompany: input.remove ? false : true, updatedAt: FieldValue.serverTimestamp() });
  }
  const fresh = await ref.get();
  return fresh.data() as DocumentRecord;
}

export async function addComment(input: { documentId: string; body: string; selectedText?: string; anchorFrom?: number; anchorTo?: number }) {
  const { identity, role, ref } = await requireDocument(input.documentId);
  if (role === 'viewer' || !input.body.trim()) throw new Error('INVALID_COMMENT');
  const commentRef = ref.collection('comments').doc();
  const now = FieldValue.serverTimestamp();
  await commentRef.set({ id: commentRef.id, documentId: input.documentId, companyId: identity.companyId, authorId: identity.uid, body: input.body.trim().slice(0, 5000), selectedText: (input.selectedText ?? '').slice(0, 1000), anchorFrom: Number.isInteger(input.anchorFrom) ? input.anchorFrom : null, anchorTo: Number.isInteger(input.anchorTo) ? input.anchorTo : null, resolved: false, createdAt: now, updatedAt: now });
  const fresh = await commentRef.get();
  return fresh.data();
}

export async function listComments(documentId: string) {
  const { ref } = await requireDocument(documentId);
  const snapshot = await ref.collection('comments').orderBy('createdAt', 'asc').limit(200).get();
  return snapshot.docs.map((doc) => doc.data());
}

export async function updateComment(input: { documentId: string; commentId: string; resolved: boolean }) {
  const { identity, ref } = await requireDocument(input.documentId);
  const commentRef = ref.collection('comments').doc(input.commentId);
  const comment = await commentRef.get();
  if (!comment.exists) throw new Error('COMMENT_NOT_FOUND');
  const data = comment.data()!;
  if (data.authorId !== identity.uid && identity.role !== 'owner' && identity.role !== 'admin') throw new Error('FORBIDDEN');
  await commentRef.update({ resolved: Boolean(input.resolved), updatedAt: FieldValue.serverTimestamp() });
  const fresh = await commentRef.get();
  return fresh.data();
}

export async function documentExport(documentId: string) {
  const { data } = await requireDocument(documentId);
  const body = typeof data.content === 'object' ? JSON.stringify(data.content) : '';
  const generatedAt = Timestamp.now().toDate().toISOString();
  return { filename: `${normalizeTitle(data.title).replace(/[^a-z0-9À-ÿ]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'documento'}-${data.currentVersion}.json`, content: body, generatedAt };
}
