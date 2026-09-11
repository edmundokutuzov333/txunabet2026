import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getConversationOrThrow } from '@/server/services/chat';

const schema = z.object({ messageId: z.string().min(1).max(128), emoji: z.string().min(1).max(16), action: z.enum(['add', 'remove']) });

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const input = schema.parse(await request.json());
    const { identity, ref } = await getConversationOrThrow(conversationId);
    const messageRef = ref.collection('messages').doc(input.messageId);

    await getAdminTransactionUpdate(messageRef, identity.uid, input.emoji, input.action);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVALID_REQUEST';
    return NextResponse.json({ error: message }, { status: message === 'FORBIDDEN' ? 403 : 400 });
  }
}

async function getAdminTransactionUpdate(ref: FirebaseFirestore.DocumentReference, userId: string, emoji: string, action: 'add' | 'remove') {
  const { getAdminDb } = await import('@/server/firebase/admin');
  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error('MESSAGE_NOT_FOUND');
    const reactions = (snapshot.data()?.reactions ?? {}) as Record<string, string[]>;
    const current = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
    const next = action === 'add' ? Array.from(new Set([...current, userId])) : current.filter((id) => id !== userId);
    const nextReactions = { ...reactions };
    if (next.length) nextReactions[emoji] = next;
    else delete nextReactions[emoji];
    transaction.update(ref, { reactions: nextReactions, updatedAt: FieldValue.serverTimestamp() });
  });
}
