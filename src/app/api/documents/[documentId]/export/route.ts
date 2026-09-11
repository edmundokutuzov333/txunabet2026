import { NextRequest, NextResponse } from 'next/server';
import { documentExport } from '@/server/services/documents';

export async function GET(_: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await context.params;
    const exported = await documentExport(documentId);
    return new NextResponse(exported.content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exported.filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REQUEST_FAILED';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
