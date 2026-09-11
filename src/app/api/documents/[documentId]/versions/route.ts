import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listVersions, restoreVersion } from '@/server/services/documents';

const restoreSchema = z.object({ version: z.number().int().min(1) });

export async function GET(_: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await context.params;
    return NextResponse.json({ versions: await listVersions(documentId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REQUEST_FAILED';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await context.params;
    const input = restoreSchema.parse(await request.json());
    return NextResponse.json({ document: await restoreVersion(documentId, input.version) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REQUEST_FAILED';
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : message === 'DOCUMENT_NOT_FOUND' || message === 'VERSION_NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
