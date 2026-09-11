import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireIdentity } from '@/server/authorization';
import { summarizeConversationSecure } from '@/server/services/ai';

const schema = z.object({ action: z.enum(['summarize', 'decisions', 'tasks', 'briefing', 'pending']) });

export async function POST(request: NextRequest, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const identity = await requireIdentity();
    const { conversationId } = await context.params;
    const { action } = schema.parse(await request.json());
    const suggestion = await summarizeConversationSecure(identity.uid, identity.companyId, conversationId, action);
    return NextResponse.json({ suggestion }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI_REQUEST_FAILED';
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : message === 'AI_RATE_LIMITED' ? 429 : ['AI_TIMEOUT', 'AI_EMPTY_RESPONSE'].includes(message) ? 502 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
