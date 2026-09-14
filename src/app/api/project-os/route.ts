import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationError } from '@/server/authorization';
import {
  createAllocation,
  createGoal,
  createKeyResult,
  createProject,
  createTimeEntry,
  createWorkspace,
  getCapacity,
  getProjectOs,
  listWorkspaces,
  startTimer,
  stopTimer,
  updateGoalProgress,
  updateProjectBudget,
} from '@/server/services/project-os';
import { getWorkspaceOperationalMap } from '@/server/services/workspace-os';

function errorResponse(error: unknown) {
  if (isAuthorizationError(error)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
  const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
  const badRequest = ['INVALID_WORKSPACE','INVALID_PROJECT','INVALID_GOAL','INVALID_KEY_RESULT','INVALID_ALLOCATION','INVALID_TIME_ENTRY','TIME_ENTRY_DURATION_REQUIRED','TIMER_ALREADY_RUNNING','TIMER_NOT_RUNNING','INVALID_BUDGET'];
  const notFound = ['WORKSPACE_NOT_FOUND','PROJECT_NOT_FOUND','GOAL_NOT_FOUND','PARENT_GOAL_NOT_FOUND','MEMBER_NOT_FOUND'];
  return NextResponse.json({ error: code }, { status: badRequest.includes(code) ? 400 : notFound.includes(code) ? 404 : 500 });
}

export async function GET(request: NextRequest) {
  try {
    const resource = request.nextUrl.searchParams.get('resource') ?? 'workspaces';
    if (resource === 'workspaces') return NextResponse.json({ data: await listWorkspaces() });
    if (resource === 'workspace-map') return NextResponse.json({ data: await getWorkspaceOperationalMap() });
    if (resource === 'capacity') return NextResponse.json({ data: await getCapacity(request.nextUrl.searchParams.get('weekStart') ?? undefined) });
    if (resource === 'project') {
      const projectId = request.nextUrl.searchParams.get('projectId');
      if (!projectId) return NextResponse.json({ error: 'PROJECT_ID_REQUIRED' }, { status: 400 });
      return NextResponse.json({ data: await getProjectOs(projectId) });
    }
    return NextResponse.json({ error: 'RESOURCE_NOT_FOUND' }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? '');
    if (action === 'workspace.create') return NextResponse.json({ data: await createWorkspace(body.input) }, { status: 201 });
    if (action === 'project.create') return NextResponse.json({ data: await createProject(body.input) }, { status: 201 });
    if (action === 'goal.create') return NextResponse.json({ data: await createGoal(body.input) }, { status: 201 });
    if (action === 'key-result.create') return NextResponse.json({ data: await createKeyResult(body.input) }, { status: 201 });
    if (action === 'capacity.allocate') return NextResponse.json({ data: await createAllocation(body.input) }, { status: 201 });
    if (action === 'time.create') return NextResponse.json({ data: await createTimeEntry(body.input) }, { status: 201 });
    if (action === 'timer.start') return NextResponse.json({ data: await startTimer(String(body.projectId ?? ''), body.taskId ? String(body.taskId) : undefined) }, { status: 201 });
    if (action === 'timer.stop') return NextResponse.json({ data: await stopTimer(String(body.note ?? '')) });
    return NextResponse.json({ error: 'ACTION_NOT_FOUND' }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? '');
    if (action === 'goal.progress') return NextResponse.json({ data: await updateGoalProgress(String(body.goalId ?? ''), Number(body.current ?? 0)) });
    if (action === 'project.budget') return NextResponse.json({ data: await updateProjectBudget(String(body.projectId ?? ''), body.input) });
    return NextResponse.json({ error: 'ACTION_NOT_FOUND' }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}
