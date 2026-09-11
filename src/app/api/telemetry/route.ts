import { NextResponse } from 'next/server';
import { recordMetric } from '@/server/observability/metrics';

const MAX_BODY = 4096;

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return NextResponse.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
    const payload = JSON.parse(raw) as { metric?: string; value?: number };
    if (payload.metric === 'page_load' && typeof payload.value === 'number' && Number.isFinite(payload.value)) {
      recordMetric({ name: 'request', value: Math.max(0, Math.min(payload.value, 120_000)), success: true });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
