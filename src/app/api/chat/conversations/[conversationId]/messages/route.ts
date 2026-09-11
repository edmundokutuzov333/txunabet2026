import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getAdminDb } from '@/server/firebase/admin';
import { createNotificationsForMessage, getConversationOrThrow } from '@/server/services/chat';
import { logError, logInfo } from '@/server/observability/logger';
import { recordMetric } from '@/server/observability/metrics';

const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(20_000),
  type: z.enum(['text', 'system', 'file']).default('text'),
  clientMessageId: z.string().min(8).max(128),
  replyToMessageId: z.string().min(1).max(128).nullable().optional(),
  mentions: z.array(z.string().min(1).max(128)).max(100).default([]),
  attachments: z.array(z.object({ name: z.string().min(1).max(255), storagePath: z.string().min(1).max(500), mimeType: z.string().min(1).max(120), sizeBytes: z.number().int().positive().max(100 * 1024 * 1024) })).max(10).default([]),
});

function searchTokens(value: string) {
  return Array.from(new Set(value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9@_-]+/g, ' ').split(/\s+/).filter((token) => token.length >= 2).slice(0, 40)));
}

export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const { ref } = await getConversationOrThrow(conversationId);
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '50'), 1), 100);
    const before = url.searchParams.get('before');
    let messagesQuery = ref.collection('messages').orderBy('createdAt', 'desc').limit(limit);
    if (before) {
      const cursor = await ref.collection('messages').doc(before).get();
      if (cursor.exists) messagesQuery = ref.collection('messages').orderBy('createdAt', 'desc').startAfter(cursor).limit(limit);
    }
    const snapshot = await messagesQuery.get();
    return NextResponse.json({ messages: snapshot.docs.map((doc) => doc.data()).reverse(), hasMore: snapshot.size === limit });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'FORBIDDEN' }, { status: 403 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const started = performance.now();
  try {
    const { conversationId } = await params;
    const { identity, ref, data: conversation } = await getConversationOrThrow(conversationId);
    const input = createMessageSchema.parse(await request.json());
    const existing = await ref.collection('messages').where('clientMessageId', '==', input.clientMessageId).limit(1).get();
    if (!existing.empty) return NextResponse.json({ message: existing.docs[0].data(), duplicate: true });
    input.mentions = input.mentions.filter((uid) => uid !== identity.uid);

    for (const attachment of input.attachments) {
      if (!attachment.storagePath.startsWith(`companies/${identity.companyId}/conversations/${conversationId}/attachments/${identity.uid}/`)) return NextResponse.json({ error: 'ATTACHMENT_PATH_NOT_ALLOWED' }, { status: 400 });
    }
    if (input.replyToMessageId) {
      const replyTarget = await ref.collection('messages').doc(input.replyToMessageId).get();
      if (!replyTarget.exists) return NextResponse.json({ error: 'REPLY_TARGET_NOT_FOUND' }, { status: 400 });
    }

    const messageRef = ref.collection('messages').doc();
    const now = FieldValue.serverTimestamp();
    const attachmentTokens = input.attachments.flatMap((attachment) => searchTokens(attachment.name));
    const message = {
      id: messageRef.id,
      conversationId,
      companyId: identity.companyId,
      senderId: identity.uid,
      body: input.body,
      type: input.type,
      createdAt: now,
      updatedAt: now,
      replyToMessageId: input.replyToMessageId ?? null,
      attachments: input.attachments,
      mentions: input.mentions,
      reactions: {},
      editedAt: null,
      deletedAt: null,
      clientMessageId: input.clientMessageId,
      searchTokens: Array.from(new Set([...searchTokens(input.body), ...attachmentTokens])).slice(0, 60),
    };

    const batch = getAdminDb().batch();
    batch.set(messageRef, message);
    batch.set(ref, { updatedAt: now, lastMessageAt: now, lastMessageId: messageRef.id }, { merge: true });
    await batch.commit();
    await createNotificationsForMessage({ conversationId, senderId: identity.uid, companyId: identity.companyId, body: input.body, mentions: input.mentions, replyToMessageId: input.replyToMessageId, messageId: messageRef.id });
    const durationMs = Math.round(performance.now() - started);
    recordMetric({ name: 'chat_delivery', value: durationMs, success: true, userId: identity.uid, companyId: identity.companyId });
    logInfo({ event: 'chat.message.created', userId: identity.uid, companyId: identity.companyId, durationMs, metadata: { conversationType: String(conversation.type), hasAttachments: input.attachments.length > 0 } });
    return NextResponse.json({ message: { ...message, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, conversation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVALID_REQUEST';
    recordMetric({ name: 'chat_delivery', value: Math.round(performance.now() - started), success: false });
    logError({ event: 'chat.message.failed', metadata: { error: message } });
    return NextResponse.json({ error: message }, { status: message === 'FORBIDDEN' ? 403 : 400 });
  }
}
