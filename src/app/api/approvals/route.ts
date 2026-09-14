import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationError } from '@/server/authorization';
import { createApproval, decideApproval, listApprovals } from '@/server/services/approvals';

function errorResponse(error: unknown) {
  if (isAuthorizationError(error) || (error instanceof Error && error.message === 'FORBIDDEN')) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
  if (error instanceof Error && ['INVALID_APPROVAL', 'INVALID_APPROVAL_DECISION', 'APPROVER_NOT_FOUND', 'APPROVAL_NOT_PENDING', 'INVALID_ID', 'NOT_FOUND'].includes(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ error: error instanceof Error ? error.message : 'INTERNAL_ERROR' }, { status: 500 });
}

export async function GET() {
  try { return NextResponse.json({ data: await listApprovals() }); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try { return NextResponse.json({ data: await createApproval(await request.json()) }, { status: 201 }); }
  catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as { id?: string; decision?: 'approved' | 'rejected'; comment?: string };
    if (!body.id) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
    return NextResponse.json({ data: await decideApproval(body.id, { decision: body.decision, comment: body.comment ?? '' }) });
  } catch (error) { return errorResponse(error); }
}
