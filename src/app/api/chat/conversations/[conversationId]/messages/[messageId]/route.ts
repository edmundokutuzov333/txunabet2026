import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getAdminDb } from '@/server/firebase/admin';
import { getConversationOrThrow } from '@/server/services/chat';

const updateSchema = z.object({
  body: z.string().trim().min(1).max(20_000),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ conversationId: string; messageId: string }> }) {
  try {
    const { conversationId, messageId } = await params;
    const { identity, ref } = await getConversationOrThrow(conversationId);
    const messageRef = ref.collection('messages').doc(messageId);
    const snapshot = await messageRef.get();
    if (!snapshot.exists || snapshot.data()?.senderId !== identity.uid) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    const input = updateSchema.parse(await request.json());
    await messageRef.update({ body: input.body, editedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'INVALID_REQUEST' }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ conversationId: string; messageId: string }> }) {
  try {
    const { conversationId, messageId } = await params;
    const { identity, ref } = await getConversationOrThrow(conversationId);
    const messageRef = ref.collection('messages').doc(messageId);
    const snapshot = await messageRef.get();
    if (!snapshot.exists || snapshot.data()?.senderId !== identity.uid) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    await messageRef.update({ body: 'Esta mensagem foi apagada.', attachments: [], deletedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'INVALID_REQUEST' }, { status: 400 });
  }
}
