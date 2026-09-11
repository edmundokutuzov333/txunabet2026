import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getAdminDb } from '@/server/firebase/admin';
import { createNotificationsForMessage, getConversationOrThrow } from '@/server/services/chat';

const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(20_000),
  type: z.enum(['text', 'system', 'file']).default('text'),
  clientMessageId: z.string().min(8).max(128),
  replyToMessageId: z.string().min(1).max(128).nullable().optional(),
  mentions: z.array(z.string().min(1).max(128)).max(100).default([]),
  attachments: z.array(z.object({
    name: z.string().min(1).max(255),
    storagePath: z.string().min(1).max(500),
    mimeType: z.string().min(1).max(120),
    sizeBytes: z.number().int().positive().max(100 * 1024 * 1024),
  })).max(10).default([]),
});

export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const { ref } = await getConversationOrThrow(conversationId);
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '50'), 1), 100);
    const before = url.searchParams.get('before');
    let query = ref.collection('messages').orderBy('createdAt', 'desc').limit(limit);
    if (before) {
      const cursor = await ref.collection('messages').doc(before).get();
      if (cursor.exists) query = ref.collection('messages').orderBy('createdAt', 'desc').startAfter(cursor).limit(limit);
    }
    const snapshot = await query.get();
    const messages = snapshot.docs.map((doc) => doc.data()).reverse();
    return NextResponse.json({ messages, hasMore: snapshot.size === limit });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'FORBIDDEN' }, { status: 403 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const { identity, ref, data: conversation } = await getConversationOrThrow(conversationId);
    const input = createMessageSchema.parse(await request.json());

    const existing = await ref.collection('messages').where('clientMessageId', '==', input.clientMessageId).limit(1).get();
    if (!existing.empty) return NextResponse.json({ message: existing.docs[0].data(), duplicate: true });

    if (input.mentions.some((uid) => uid === identity.uid)) input.mentions = input.mentions.filter((uid) => uid !== identity.uid);

    for (const attachment of input.attachments) {
      if (!attachment.storagePath.startsWith(`companies/${identity.companyId}/conversations/${conversationId}/attachments/${identity.uid}/`)) {
        return NextResponse.json({ error: 'ATTACHMENT_PATH_NOT_ALLOWED' }, { status: 400 });
      }
    }

    if (input.replyToMessageId) {
      const replyTarget = await ref.collection('messages').doc(input.replyToMessageId).get();
      if (!replyTarget.exists) return NextResponse.json({ error: 'REPLY_TARGET_NOT_FOUND' }, { status: 400 });
    }

    const messageRef = ref.collection('messages').doc();
    const now = FieldValue.serverTimestamp();
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
    };

    const batch = getAdminDb().batch();
    batch.set(messageRef, message);
    batch.set(ref, { updatedAt: now, lastMessageAt: now, lastMessageId: messageRef.id }, { merge: true });
    await batch.commit();

    await createNotificationsForMessage({
      conversationId,
      senderId: identity.uid,
      companyId: identity.companyId,
      body: input.body,
      mentions: input.mentions,
      replyToMessageId: input.replyToMessageId,
    });

    return NextResponse.json({ message: { ...message, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, conversation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVALID_REQUEST';
    return NextResponse.json({ error: message }, { status: message === 'FORBIDDEN' ? 403 : 400 });
  }
}
