import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDocument, listDocuments } from '@/server/services/documents';
import { isAuthorizationError } from '@/server/authorization';

const contentSchema = z.record(z.string(), z.unknown()).optional();
const createSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  content: contentSchema,
  textPreview: z.string().max(500).optional(),
});

function errorResponse(error: unknown) {
  const status = isAuthorizationError(error) ? (error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403) : 400;
  return NextResponse.json({ error: error instanceof Error ? error.message : 'REQUEST_FAILED' }, { status });
}

export async function GET() {
  try {
    return NextResponse.json({ documents: await listDocuments() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createSchema.parse(await request.json());
    return NextResponse.json({ document: await createDocument(input) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
