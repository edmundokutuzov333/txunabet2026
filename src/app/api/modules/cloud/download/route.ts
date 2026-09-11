import { NextRequest, NextResponse } from 'next/server';
import { createSignedDownloadUrl } from '@/server/services/storage';
import { getModuleRecord } from '@/server/services/legacy-modules';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
    const record = await getModuleRecord('cloud', id);
    const storagePath = record.storagePath;
    if (typeof storagePath !== 'string') return NextResponse.json({ error: 'FILE_NOT_READY' }, { status: 409 });
    const url = await createSignedDownloadUrl(storagePath);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'INTERNAL_ERROR' }, { status: 500 });
  }
}
