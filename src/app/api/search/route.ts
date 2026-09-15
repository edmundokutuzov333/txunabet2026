import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationError } from '@/server/authorization';
import { enterpriseSearch, getKnowledgeGraph, type ContextType, type SearchScope } from '@/server/services/enterprise-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const q = params.get('q') ?? '';
    if (params.get('resource') === 'graph') {
      const type = params.get('type') as ContextType;
      const id = params.get('id') ?? '';
      if (!type || !id) return NextResponse.json({ error: 'INVALID_GRAPH_QUERY' }, { status: 400 });
      return NextResponse.json({ data: await getKnowledgeGraph(type, id, Math.min(Math.max(Number(params.get('depth') ?? 1), 1), 2)) });
    }
    const data = await enterpriseSearch({
      q,
      scope: (params.get('scope') as SearchScope | null) ?? 'all',
      type: (params.get('type') as ContextType | null) ?? undefined,
      workspaceId: params.get('workspaceId') ?? undefined,
      personId: params.get('personId') ?? undefined,
      limit: Number(params.get('limit') ?? 30),
      semantic: params.get('semantic') !== 'false',
    });
    return NextResponse.json({ data });
  } catch (error) {
    if (isAuthorizationError(error)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'INTERNAL_ERROR' }, { status: 500 });
  }
}
