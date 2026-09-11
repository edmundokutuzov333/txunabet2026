'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, endBefore, limitToLast, onSnapshot, orderBy, query, getDocs, type DocumentSnapshot, type Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { initializeFirebase, useUser } from '@/firebase';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';

export type ChatAttachment = { name: string; storagePath: string; mimeType: string; sizeBytes: number; downloadUrl?: string };
export type EnterpriseMessage = {
  id: string; conversationId: string; companyId: string; senderId: string; body: string; type: 'text' | 'system' | 'file';
  createdAt: Timestamp | string | null; updatedAt?: Timestamp | string | null; replyToMessageId?: string | null;
  attachments?: ChatAttachment[]; mentions?: string[]; reactions?: Record<string, string[]>; editedAt?: Timestamp | string | null;
  deletedAt?: Timestamp | string | null; clientMessageId?: string | null; queued?: boolean;
};
export type EnterpriseConversation = {
  id: string; companyId: string; type: 'company_general' | 'department' | 'direct' | 'group'; name?: string | null;
  departmentId?: string | null; memberIds?: string[]; createdBy: string; lastMessageAt?: Timestamp | string | null; lastMessageId?: string | null;
  pinnedMessageIds?: string[];
};

export function useEnterpriseChat(conversationId: string | null) {
  const { user } = useUser();
  const { identity } = useEnterpriseIdentity();
  const [messages, setMessages] = useState<EnterpriseMessage[]>([]);
  const [loading, setLoading] = useState(Boolean(conversationId));
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const oldestSnapshot = useRef<DocumentSnapshot | null>(null);
  const pending = useRef(new Map<string, EnterpriseMessage>());

  useEffect(() => {
    if (!conversationId || !user || !identity) { setMessages([]); setLoading(false); return; }
    const { firestore } = initializeFirebase();
    const messagesRef = collection(firestore, 'conversations', conversationId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'), limitToLast(50));
    setLoading(true);
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const fresh = snapshot.docs.map((item) => item.data() as EnterpriseMessage);
      oldestSnapshot.current = snapshot.docs[0] ?? null;
      setHasMore(snapshot.size === 50);
      setMessages((previous) => {
        const optimistic = Array.from(pending.current.values()).filter((message) => !fresh.some((item) => item.clientMessageId === message.clientMessageId));
        return [...fresh, ...optimistic];
      });
      setLoading(false);
    }, () => setLoading(false));
    const typingRef = collection(firestore, 'conversations', conversationId, 'typing');
    const unsubscribeTyping = onSnapshot(typingRef, (snapshot) => {
      const now = Date.now();
      setTypingUserIds(snapshot.docs.map((item) => item.data()).filter((item) => item.userId !== user.uid && item.expiresAt?.toMillis?.() > now || (item.expiresAt?.toDate?.() instanceof Date && item.expiresAt.toDate().getTime() > now)).map((item) => item.userId));
    }, () => setTypingUserIds([]));
    return () => { unsubscribeMessages(); unsubscribeTyping(); };
  }, [conversationId, identity, user]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || !oldestSnapshot.current || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const { firestore } = initializeFirebase();
      const messagesRef = collection(firestore, 'conversations', conversationId, 'messages');
      const olderQuery = query(messagesRef, orderBy('createdAt', 'asc'), endBefore(oldestSnapshot.current), limitToLast(50));
      const snapshot = await getDocs(olderQuery);
      const older = snapshot.docs.map((item) => item.data() as EnterpriseMessage);
      oldestSnapshot.current = snapshot.docs[0] ?? oldestSnapshot.current;
      setHasMore(snapshot.size === 50);
      setMessages((previous) => {
        const byId = new Map<string, EnterpriseMessage>([...older, ...previous].map((message) => [message.id, message]));
        return Array.from(byId.values()).sort((a, b) => timeValue(a.createdAt) - timeValue(b.createdAt));
      });
    } finally { setLoadingOlder(false); }
  }, [conversationId, hasMore, loadingOlder]);

  const sendMessage = useCallback(async (input: { body: string; replyToMessageId?: string | null; mentions?: string[]; attachments?: File[] }) => {
    if (!conversationId || !user || !identity || !input.body.trim()) return;
    const clientMessageId = `${user.uid}_${crypto.randomUUID()}`;
    const attachments: ChatAttachment[] = [];
    for (const file of input.attachments ?? []) {
      if (file.size > 100 * 1024 * 1024) throw new Error('Ficheiro demasiado grande. O limite é 100 MB.');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
      const path = `companies/${identity.companyId}/conversations/${conversationId}/attachments/${user.uid}/${clientMessageId}_${safeName}`;
      const { storage } = initializeFirebase();
      await uploadBytes(storageRef(storage, path), file, { contentType: file.type || 'application/octet-stream' });
      const downloadUrl = await getDownloadURL(storageRef(storage, path));
      attachments.push({ name: file.name, storagePath: path, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, downloadUrl });
    }

    const optimistic: EnterpriseMessage = {
      id: `optimistic_${clientMessageId}`, conversationId, companyId: identity.companyId, senderId: user.uid,
      body: input.body.trim(), type: attachments.length ? 'file' : 'text', createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), replyToMessageId: input.replyToMessageId ?? null, attachments,
      mentions: input.mentions ?? [], reactions: {}, clientMessageId,
    };
    pending.current.set(clientMessageId, optimistic);
    setMessages((current) => [...current, optimistic]);

    const requestBody = JSON.stringify({ body: input.body, clientMessageId, replyToMessageId: input.replyToMessageId ?? null, mentions: input.mentions ?? [], attachments, type: attachments.length ? 'file' : 'text' });
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        if (!navigator.onLine) await waitForOnline();
        const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: requestBody });
        if (response.ok) { pending.current.delete(clientMessageId); return; }
        const payload = await response.json().catch(() => ({ error: 'Falha no envio.' }));
        lastError = new Error(payload.error || 'Falha no envio.');
        if (response.status >= 400 && response.status < 500) break;
      } catch (error) { lastError = error; }
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
    pending.current.delete(clientMessageId);
    setMessages((current) => current.filter((message) => message.clientMessageId !== clientMessageId));
    throw (lastError instanceof Error ? lastError : new Error('Não foi possível enviar a mensagem.'));
  }, [conversationId, identity, user]);

  const markRead = useCallback(async (messageId: string) => { if (!conversationId || !messageId) return; await fetch(`/api/chat/conversations/${conversationId}/read`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ messageId }) }); }, [conversationId]);
  const editMessage = useCallback(async (messageId: string, body: string) => { if (!conversationId) return; const response = await fetch(`/api/chat/conversations/${conversationId}/messages/${messageId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ body }) }); if (!response.ok) throw new Error('Não foi possível editar a mensagem.'); }, [conversationId]);
  const deleteMessage = useCallback(async (messageId: string) => { if (!conversationId) return; const response = await fetch(`/api/chat/conversations/${conversationId}/messages/${messageId}`, { method: 'DELETE', credentials: 'include' }); if (!response.ok) throw new Error('Não foi possível apagar a mensagem.'); }, [conversationId]);
  const reactToMessage = useCallback(async (messageId: string, emoji: string, action: 'add' | 'remove') => { if (!conversationId) return; const response = await fetch(`/api/chat/conversations/${conversationId}/reactions`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ messageId, emoji, action }) }); if (!response.ok) throw new Error('Não foi possível actualizar a reacção.'); }, [conversationId]);

  return useMemo(() => ({ messages, loading, loadingOlder, hasMore, typingUserIds, loadOlder, sendMessage, markRead, editMessage, deleteMessage, reactToMessage }), [messages, loading, loadingOlder, hasMore, typingUserIds, loadOlder, sendMessage, markRead, editMessage, deleteMessage, reactToMessage]);
}

async function waitForOnline(): Promise<void> {
  if (typeof window === 'undefined' || navigator.onLine) return;
  await new Promise<void>((resolve) => { const handler = () => { window.removeEventListener('online', handler); resolve(); }; window.addEventListener('online', handler); });
}

export async function ensureConversation(input: { type: EnterpriseConversation['type']; departmentId?: string; targetUserId?: string; name?: string; memberIds?: string[] }) {
  const response = await fetch('/api/chat/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify(input) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Não foi possível abrir a conversa.');
  return payload.conversation as { id: string; data: EnterpriseConversation };
}

export async function listConversations(): Promise<EnterpriseConversation[]> {
  const response = await fetch('/api/chat/conversations', { credentials: 'include', cache: 'no-store' });
  if (!response.ok) return [];
  const payload = await response.json();
  return payload.conversations ?? [];
}

function timeValue(value: EnterpriseMessage['createdAt']) {
  if (!value) return 0;
  if (typeof value === 'string') return Date.parse(value) || 0;
  if ('toMillis' in value && typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}
