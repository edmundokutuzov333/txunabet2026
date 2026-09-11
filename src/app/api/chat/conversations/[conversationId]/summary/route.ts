import { NextResponse } from 'next/server';
import { getAdminDb } from '@/server/firebase/admin';
import { getConversationOrThrow } from '@/server/services/chat';
import { summarizeChat } from '@/ai/flows/summarize-chat';

export async function POST(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const { ref } = await getConversationOrThrow(conversationId);
    const snapshot = await ref.collection('messages').orderBy('createdAt', 'desc').limit(50).get();
    const messages = snapshot.docs.map((doc) => doc.data()).reverse();
    const summary = await summarizeChat({ messages: messages.map((message) => ({ author: message.senderId, content: message.body })) });
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível resumir a conversa.' }, { status: 400 });
  }
}
