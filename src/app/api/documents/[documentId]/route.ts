import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireDocument, saveDocument } from '@/server/services/documents';
import { isAuthorizationError } from '@/server/authorization';

const patchSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  textPreview: z.string().max(500).optional(),
  checkpoint: z.boolean().optional(),
  expectedVersion: z.number().int().min(1).optional(),
});

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'REQUEST_FAILED';
  let status = 400;
  if (message === 'UNAUTHENTICATED') status = 401;
  else if (['FORBIDDEN', 'DOCUMENT_READ_ONLY'].includes(message)) status = 403;
  else if (['DOCUMENT_NOT_FOUND'].includes(message)) status = 404;
  else if (message === 'DOCUMENT_VERSION_CONFLICT') status = 409;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await context.params;
    const { data, role } = await requireDocument(documentId);
    return NextResponse.json({ document: data, role });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await context.params;
    const input = patchSchema.parse(await request.json());
    return NextResponse.json({ document: await saveDocument({ ...input, documentId }) });
  } catch (error) {
    return errorResponse(error);
  }
}
