import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requireIdentity } from '@/server/authorization';
import { getAdminDb } from '@/server/firebase/admin';

const COLLECTIONS = {
  sportsbook: 'trading_events',
  players: 'players',
  payments: 'payments',
  risk: 'risks',
  'responsible-gaming': 'responsible_gaming_cases',
  vip: 'vip_accounts',
  affiliates: 'affiliates',
  support: 'support_tickets',
} as const;
type Resource = keyof typeof COLLECTIONS;

function resource(value: string): Resource {
  if (!(value in COLLECTIONS)) throw new Error('RESOURCE_NOT_FOUND');
  return value as Resource;
}

export async function GET(request: NextRequest) {
  try {
    const identity = await requireIdentity();
    const key = resource(request.nextUrl.searchParams.get('resource') ?? 'sportsbook');
    const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? '';
    const snapshot = await getAdminDb().collection(COLLECTIONS[key]).where('companyId', '==', identity.companyId).limit(250).get();
    let rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (q) rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
    rows.sort((a, b) => String(b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.updatedAt ?? a.createdAt ?? '')));

    const metrics = key === 'sportsbook' ? {
      handle: rows.reduce((sum, row) => sum + Number(row.handle ?? 0), 0),
      liability: rows.reduce((sum, row) => sum + Number(row.liability ?? 0), 0),
      averageHold: rows.length ? Number((rows.reduce((sum, row) => sum + Number(row.hold ?? 0), 0) / rows.length).toFixed(2)) : 0,
      suspended: rows.filter((row) => row.status === 'suspended').length,
    } : key === 'players' ? {
      active: rows.filter((row) => row.status === 'active').length,
      vip: rows.filter((row) => row.segment === 'VIP').length,
      kycReview: rows.filter((row) => row.kycStatus === 'review').length,
      ltv: rows.reduce((sum, row) => sum + Number(row.lifetimeValue ?? 0), 0),
    } : key === 'payments' ? {
      processed: rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
      completed: rows.filter((row) => row.status === 'completed').length,
      failed: rows.filter((row) => row.status === 'failed').length,
      review: rows.filter((row) => row.status === 'review').length,
    } : { total: rows.length, open: rows.filter((row) => ['open', 'investigating', 'pending', 'escalated'].includes(String(row.status))).length, high: rows.filter((row) => ['high', 'critical', 'urgent'].includes(String(row.severity ?? row.priority))).length };

    return NextResponse.json({ resource: key, rows, metrics });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'BETTING_OPS_FAILED';
    return NextResponse.json({ error: code }, { status: code === 'UNAUTHENTICATED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await requireIdentity();
    const body = await request.json() as Record<string, unknown>;
    const key = resource(String(body.resource ?? 'sportsbook'));
    const input = typeof body.data === 'object' && body.data ? body.data as Record<string, unknown> : {};
    const ref = getAdminDb().collection(COLLECTIONS[key]).doc();
    await ref.create({ ...input, id: ref.id, companyId: identity.companyId, createdBy: identity.uid, updatedBy: identity.uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), status: input.status ?? 'open', version: 1 });
    return NextResponse.json({ data: { id: ref.id, ...input, companyId: identity.companyId } }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'BETTING_OPS_CREATE_FAILED';
    return NextResponse.json({ error: code }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const identity = await requireIdentity();
    const body = await request.json() as Record<string, unknown>;
    const key = resource(String(body.resource ?? 'sportsbook'));
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    const input = typeof body.data === 'object' && body.data ? body.data as Record<string, unknown> : {};
    const ref = getAdminDb().collection(COLLECTIONS[key]).doc(id);
    const current = await ref.get();
    if (!current.exists || current.data()?.companyId !== identity.companyId) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    await ref.update({ ...input, updatedBy: identity.uid, updatedAt: FieldValue.serverTimestamp(), version: Number(current.data()?.version ?? 1) + 1 });
    return NextResponse.json({ data: { id, ...current.data(), ...input } });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'BETTING_OPS_UPDATE_FAILED';
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
