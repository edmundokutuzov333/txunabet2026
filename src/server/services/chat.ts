import 'server-only';

import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity, type AuthenticatedIdentity } from '@/server/authorization';

export type ConversationKind = 'company_general' | 'department' | 'direct' | 'group';

function directConversationId(userA: string, userB: string): string { return `direct_${[userA, userB].sort().join('_')}`; }
export async function requireChatIdentity(): Promise<AuthenticatedIdentity> { return requireIdentity(); }

export async function getOrCreateConversation(input: { type: ConversationKind; departmentId?: string; targetUserId?: string; name?: string; memberIds?: string[] }): Promise<{ id: string; data: Record<string, unknown> }> {
  const identity = await requireChatIdentity();
  const db = getAdminDb();
  let id = '';
  let members: string[] = [identity.uid];
  if (input.type === 'company_general') {
    id = `company_general_${identity.companyId}`;
  } else if (input.type === 'department') {
    if (!input.departmentId) throw new Error('DEPARTMENT_REQUIRED');
    const dept = await db.collection('departments').doc(input.departmentId).get();
    if (!dept.exists || dept.data()?.companyId !== identity.companyId) throw new Error('FORBIDDEN');
    const membership = await db.collection('departments').doc(input.departmentId).collection('members').doc(identity.uid).get();
    if (!membership.exists || membership.data()?.status !== 'active') throw new Error('FORBIDDEN');
    id = `department_${input.departmentId}`;
    const deptMembers = await db.collection('departments').doc(input.departmentId).collection('members').where('status', '==', 'active').get();
    members = deptMembers.docs.map((doc) => doc.id);
  } else if (input.type === 'direct') {
    if (!input.targetUserId || input.targetUserId === identity.uid) throw new Error('TARGET_USER_REQUIRED');
    const target = await db.collection('companies').doc(identity.companyId).collection('members').doc(input.targetUserId).get();
    if (!target.exists || target.data()?.status !== 'active') throw new Error('FORBIDDEN');
    members = [identity.uid, input.targetUserId].sort();
    id = directConversationId(identity.uid, input.targetUserId);
  } else {
    const requested = input.memberIds ?? [];
    const valid = await Promise.all(requested.slice(0, 100).map(async (uid) => {
      const member = await db.collection('companies').doc(identity.companyId).collection('members').doc(uid).get();
      return member.exists && member.data()?.status === 'active' ? uid : null;
    }));
    members = Array.from(new Set([identity.uid, ...valid.filter((uid): uid is string => Boolean(uid))]));
    id = `group_${crypto.randomUUID()}`;
  }
  const ref = db.collection('conversations').doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    const now = FieldValue.serverTimestamp();
    await ref.set({ id, companyId: identity.companyId, type: input.type, name: input.name ?? null, departmentId: input.departmentId ?? null, createdBy: identity.uid, memberIds: members, createdAt: now, updatedAt: now, lastMessageAt: null, lastMessageId: null, pinnedMessageIds: [] });
  }
  const fresh = await ref.get();
  const data = fresh.data();
  if (!data) throw new Error('CONVERSATION_NOT_FOUND');
  return { id, data: data as Record<string, unknown> };
}

function canAccessConversation(identity: AuthenticatedIdentity, conversation: FirebaseFirestore.DocumentData): boolean {
  if (conversation.companyId !== identity.companyId) return false;
  if (conversation.type === 'company_general') return true;
  if (conversation.type === 'department') return Boolean(conversation.departmentId && identity.departmentIds.includes(String(conversation.departmentId)));
  return Array.isArray(conversation.memberIds) && conversation.memberIds.includes(identity.uid);
}

export async function getConversationOrThrow(conversationId: string) {
  if (!conversationId || conversationId.length > 180) throw new Error('INVALID_CONVERSATION');
  const identity = await requireChatIdentity();
  const ref = getAdminDb().collection('conversations').doc(conversationId);
  const snapshot = await ref.get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || !canAccessConversation(identity, data)) throw new Error('FORBIDDEN');
  return { identity, ref, data: data as Record<string, unknown> };
}

export async function createNotificationsForMessage(input: { conversationId: string; senderId: string; companyId: string; body: string; mentions?: string[]; replyToMessageId?: string | null; messageId?: string }): Promise<void> {
  const db = getAdminDb();
  const conversation = await db.collection('conversations').doc(input.conversationId).get();
  const data = conversation.data();
  if (!conversation.exists || !data) return;
  let recipients: string[] = Array.isArray(data.memberIds) ? data.memberIds.filter((id: string) => id !== input.senderId) : [];
  if (data.type === 'company_general') {
    const members = await db.collection('companies').doc(input.companyId).collection('members').where('status', '==', 'active').get();
    recipients = members.docs.map((doc) => doc.id).filter((id) => id !== input.senderId);
  }
  if (data.type === 'department' && data.departmentId) {
    const members = await db.collection('departments').doc(String(data.departmentId)).collection('members').where('status', '==', 'active').get();
    recipients = members.docs.map((doc) => doc.id).filter((id) => id !== input.senderId);
  }
  const mentioned = new Set(input.mentions ?? []);
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();
  for (const uid of new Set(recipients)) {
    const ref = db.collection('notifications').doc(uid).collection('items').doc();
    batch.set(ref, { id: ref.id, userId: uid, companyId: input.companyId, type: mentioned.has(uid) ? 'mention' : input.replyToMessageId ? 'reply' : 'new_message', conversationId: input.conversationId, messageId: input.messageId ?? null, actorId: input.senderId, bodyPreview: input.body.slice(0, 180), read: false, createdAt: now });
  }
  if (recipients.length) await batch.commit();
}

export async function markConversationRead(conversationId: string, messageId: string): Promise<void> {
  const { identity, ref } = await getConversationOrThrow(conversationId);
  const message = await ref.collection('messages').doc(messageId).get();
  if (!message.exists) throw new Error('MESSAGE_NOT_FOUND');
  await ref.collection('reads').doc(identity.uid).set({ userId: identity.uid, conversationId, lastReadMessageId: messageId, lastReadAt: FieldValue.serverTimestamp() }, { merge: true });
}
