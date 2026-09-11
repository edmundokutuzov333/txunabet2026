import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { addComment, listComments, updateComment } from '@/server/services/documents';

const createSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  selectedText: z.string().max(1000).optional(),
  anchorFrom: z.number().int().min(0).optional(),
  anchorTo: z.number().int().min(0).optional(),
});

const updateSchema = z.object({
  commentId: z.string().trim().min(1).max(180),
  resolved: z.boolean(),
});

function responseError(error: unknown) {
  const message = error instanceof Error ? error.message : 'REQUEST_FAILED';
  const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await context.params;
    return NextResponse.json({ comments: await listComments(documentId) });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await context.params;
    const input = createSchema.parse(await request.json());
    return NextResponse.json({ comment: await addComment({ ...input, documentId }) }, { status: 201 });
  } catch (error) {
    return responseError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await context.params;
    const input = updateSchema.parse(await request.json());
    return NextResponse.json({ comment: await updateComment({ ...input, documentId }) });
  } catch (error) {
    return responseError(error);
  }
}
