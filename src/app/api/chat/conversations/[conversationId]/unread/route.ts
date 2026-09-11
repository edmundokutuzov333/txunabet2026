import { NextResponse } from 'next/server';
import { getConversationOrThrow } from '@/server/services/chat';
import { getAdminDb } from '@/server/firebase/admin';

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const { identity, ref } = await getConversationOrThrow(conversationId);
    const readSnapshot = await ref.collection('reads').doc(identity.uid).get();
    if (!readSnapshot.exists) {
      const latest = await ref.collection('messages').orderBy('createdAt', 'desc').limit(100).get();
      return NextResponse.json({ unreadCount: latest.size, lastReadMessageId: null, lastReadAt: null });
    }
    const readData = readSnapshot.data() ?? {};
    const lastReadMessage = typeof readData.lastReadMessageId === 'string' ? await ref.collection('messages').doc(readData.lastReadMessageId).get() : null;
    if (!lastReadMessage?.exists) return NextResponse.json({ unreadCount: 0, lastReadMessageId: readData.lastReadMessageId ?? null, lastReadAt: readData.lastReadAt ?? null });
    const createdAt = lastReadMessage.data()?.createdAt;
    const snapshot = createdAt ? await ref.collection('messages').where('createdAt', '>', createdAt).get() : await ref.collection('messages').limit(100).get();
    return NextResponse.json({ unreadCount: snapshot.size, lastReadMessageId: readData.lastReadMessageId ?? null, lastReadAt: readData.lastReadAt ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'FORBIDDEN' }, { status: 403 });
  }
}
