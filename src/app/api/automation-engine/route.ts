import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationError } from '@/server/authorization';
import { createAutomation, createWorkflow, enqueueManualAutomation, listAutomationControls, listAutomationJobs, listWorkflowControls, retryAutomationJob, updateAutomation, updateWorkflow } from '@/server/services/automation-control';

function errorResponse(error: unknown) {
  if (isAuthorizationError(error)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
  const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
  const bad = ['INVALID_ID', 'INVALID_WORKFLOW', 'INVALID_AUTOMATION', 'JOB_NOT_RETRYABLE'];
  const status = bad.includes(code) ? 400 : code === 'NOT_FOUND' || code === 'WORKFLOW_NOT_FOUND' ? 404 : 500;
  return NextResponse.json({ error: code }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const resource = request.nextUrl.searchParams.get('resource') ?? 'jobs';
    if (resource === 'workflows') return NextResponse.json({ data: await listWorkflowControls() });
    if (resource === 'automations') return NextResponse.json({ data: await listAutomationControls() });
    if (resource === 'jobs') return NextResponse.json({ data: await listAutomationJobs({ status: request.nextUrl.searchParams.get('status') ?? undefined }) });
    return NextResponse.json({ error: 'INVALID_RESOURCE' }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? '');
    if (action === 'create_workflow') return NextResponse.json({ data: await createWorkflow(body.data) }, { status: 201 });
    if (action === 'update_workflow') return NextResponse.json({ data: await updateWorkflow(String(body.id ?? ''), body.data) });
    if (action === 'create_automation') return NextResponse.json({ data: await createAutomation(body.data) }, { status: 201 });
    if (action === 'update_automation') return NextResponse.json({ data: await updateAutomation(String(body.id ?? ''), body.data) });
    if (action === 'run') return NextResponse.json({ data: await enqueueManualAutomation(String(body.id ?? ''), (body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)) ? body.payload as Record<string, unknown> : {}) });
    if (action === 'retry') return NextResponse.json({ data: await retryAutomationJob(String(body.id ?? '')) });
    return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
