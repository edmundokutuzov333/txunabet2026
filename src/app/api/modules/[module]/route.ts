import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationError } from '@/server/authorization';
import { createModuleRecord, deleteModuleRecord, getModuleRecord, listModuleRecords, updateModuleRecord, type ModuleName } from '@/server/services/legacy-modules';

const allowedModules = new Set<ModuleName>([
  'cloud', 'calendar', 'meetings', 'integrations', 'knowledge-base', 'campaigns', 'tasks',
  'reports', 'workflows', 'automations', 'pulse', 'workspaces',
]);

function parseModule(value: string): ModuleName {
  if (!allowedModules.has(value as ModuleName)) throw new Error('MODULE_NOT_FOUND');
  return value as ModuleName;
}

function errorResponse(error: unknown) {
  if (isAuthorizationError(error)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
  const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
  const status = ['MODULE_NOT_FOUND', 'INVALID_ID', 'INVALID_PAYLOAD'].includes(code) ? 400 : code === 'NOT_FOUND' ? 404 : 500;
  return NextResponse.json({ error: code }, { status });
}

export async function GET(request: NextRequest, context: { params: Promise<{ module: string }> }) {
  try {
    const { module: moduleParam } = await context.params;
    const module = parseModule(moduleParam);
    const id = request.nextUrl.searchParams.get('id');
    if (id) return NextResponse.json({ data: await getModuleRecord(module, id) });
    const q = request.nextUrl.searchParams.get('q') ?? undefined;
    return NextResponse.json({ data: await listModuleRecords(module, { q }) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ module: string }> }) {
  try {
    const { module: moduleParam } = await context.params;
    const module = parseModule(moduleParam);
    return NextResponse.json({ data: await createModuleRecord(module, await request.json()) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ module: string }> }) {
  try {
    const { module: moduleParam } = await context.params;
    const module = parseModule(moduleParam);
    const id = request.nextUrl.searchParams.get('id');
    if (!id) throw new Error('INVALID_ID');
    return NextResponse.json({ data: await updateModuleRecord(module, id, await request.json()) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ module: string }> }) {
  try {
    const { module: moduleParam } = await context.params;
    const module = parseModule(moduleParam);
    const id = request.nextUrl.searchParams.get('id');
    if (!id) throw new Error('INVALID_ID');
    await deleteModuleRecord(module, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
