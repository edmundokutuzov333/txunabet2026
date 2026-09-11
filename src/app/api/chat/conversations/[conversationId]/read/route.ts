import { NextResponse } from 'next/server';
import { z } from 'zod';
import { markConversationRead } from '@/server/services/chat';

const schema = z.object({ messageId: z.string().min(1).max(128) });

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const { messageId } = schema.parse(await request.json());
    await markConversationRead(conversationId, messageId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVALID_REQUEST';
    return NextResponse.json({ error: message }, { status: message === 'FORBIDDEN' ? 403 : 400 });
  }
}
