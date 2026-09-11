import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireIdentity } from '@/server/authorization';
import { runContextualAI } from '@/server/services/ai';

export const runtime = 'nodejs';

const schema = z.object({
  action: z.enum(['ask', 'write', 'rewrite', 'summarize', 'correct', 'translate', 'tone', 'expand', 'shorten', 'title', 'structure', 'extractTasks', 'extractDecisions', 'briefing', 'pending']),
  prompt: z.string().trim().min(1).max(12000),
  contextType: z.enum(['none', 'document', 'conversation', 'campaign', 'task']).default('none'),
  contextId: z.string().trim().max(180).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const identity = await requireIdentity();
    const input = schema.parse(await request.json());
    const result = await runContextualAI({ uid: identity.uid, companyId: identity.companyId, ...input });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI_REQUEST_FAILED';
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : message === 'AI_RATE_LIMITED' ? 429 : ['AI_TIMEOUT', 'AI_REQUEST_FAILED', 'AI_EMPTY_RESPONSE'].includes(message) ? 502 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
