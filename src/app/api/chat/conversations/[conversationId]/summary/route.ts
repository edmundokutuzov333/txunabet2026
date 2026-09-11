import { NextResponse } from 'next/server';
import { requireIdentity } from '@/server/authorization';
import { summarizeConversationSecure } from '@/server/services/ai';

export async function POST(_: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const identity = await requireIdentity();
    const { conversationId } = await params;
    const result = await summarizeConversationSecure(identity.uid, identity.companyId, conversationId, 'summarize');
    return NextResponse.json({ summary: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI_REQUEST_FAILED';
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : message === 'AI_RATE_LIMITED' ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
