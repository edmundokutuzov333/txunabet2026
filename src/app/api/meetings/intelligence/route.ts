import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationError } from '@/server/authorization';
import { analyzeMeeting, createMeetingActions, ingestMeetingTranscript, updateMeetingIntelligence } from '@/server/services/meeting-intelligence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { action?: string; id?: string; input?: Record<string, unknown>; transcript?: string; source?: string };
    if (!body.id) return NextResponse.json({ error: 'MEETING_ID_REQUIRED' }, { status: 400 });
    if (body.action === 'analyze') return NextResponse.json({ data: await analyzeMeeting(body.id) });
    if (body.action === 'actions') return NextResponse.json({ data: await createMeetingActions(body.id) });
    if (body.action === 'transcript') return NextResponse.json({ data: await ingestMeetingTranscript(body.id, String(body.transcript ?? ''), String(body.source ?? 'manual')) });
    if (body.action === 'update') return NextResponse.json({ data: await updateMeetingIntelligence(body.id, (body.input ?? {}) as Parameters<typeof updateMeetingIntelligence>[1]) });
    return NextResponse.json({ error: 'UNKNOWN_ACTION' }, { status: 400 });
  } catch (error) {
    if (isAuthorizationError(error)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'INTERNAL_ERROR' }, { status: 500 });
  }
}
