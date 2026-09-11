import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getConversationOrThrow } from '@/server/services/chat';

const schema = z.object({ typing: z.boolean() });

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const { typing } = schema.parse(await request.json());
    const { identity, ref } = await getConversationOrThrow(conversationId);
    const typingRef = ref.collection('typing').doc(identity.uid);
    if (!typing) {
      await typingRef.delete();
    } else {
      await typingRef.set({ userId: identity.uid, startedAt: FieldValue.serverTimestamp(), expiresAt: new Date(Date.now() + 10_000) }, { merge: true });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'FORBIDDEN' }, { status: 403 });
  }
}
