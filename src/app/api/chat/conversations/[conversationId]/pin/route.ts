import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getConversationOrThrow } from '@/server/services/chat';
import { z } from 'zod';

const schema = z.object({ messageId: z.string().min(1).max(128), pinned: z.boolean() });

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const input = schema.parse(await request.json());
    const { identity, ref } = await getConversationOrThrow(conversationId);
    const message = await ref.collection('messages').doc(input.messageId).get();
    if (!message.exists) return NextResponse.json({ error: 'MESSAGE_NOT_FOUND' }, { status: 404 });
    await ref.update({ pinnedMessageIds: input.pinned ? FieldValue.arrayUnion(input.messageId) : FieldValue.arrayRemove(input.messageId), updatedAt: FieldValue.serverTimestamp(), lastPinnedBy: identity.uid });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'FORBIDDEN' }, { status: 403 });
  }
}
