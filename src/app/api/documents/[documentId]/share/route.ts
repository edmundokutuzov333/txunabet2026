import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { shareDocument } from '@/server/services/documents';

const schema = z.object({
  kind: z.enum(['user', 'department', 'company']),
  targetId: z.string().trim().max(180).optional(),
  role: z.enum(['editor', 'viewer']).default('viewer'),
  remove: z.boolean().default(false),
});

export async function POST(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await context.params;
    const input = schema.parse(await request.json());
    return NextResponse.json({ document: await shareDocument({ ...input, documentId }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REQUEST_FAILED';
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
