'use client';

import Link from 'next/link';
import { BookOpen, FileText, Network, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OryonBadge, OryonButton, OryonCard, OryonDataGrid, OryonEntityHeader, OryonInput, OryonPanel } from '@/components/oryon-ui';

type Row = Record<string, unknown> & { id: string; type?: string; title?: string; snippet?: string; score?: number; metadata?: Record<string, unknown> };

async function readJson(path: string): Promise<Record<string, unknown>> {
  const response = await fetch(path, { cache: 'no-store', credentials: 'include', headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `Falha ao carregar ${path}.`);
  return payload as Record<string, unknown>;
}

async function fetchModule(module: string): Promise<Row[]> {
  const payload = await readJson(`/api/modules/${module}`);
  return Array.isArray(payload.data) ? payload.data as Row[] : [];
}

async function fetchDocuments(): Promise<Row[]> {
  const payload = await readJson('/api/documents');
  return Array.isArray(payload.documents) ? payload.documents as Row[] : [];
}

async function fetchEnterpriseSearch(query: string): Promise<Row[]> {
  const payload = await readJson(`/api/search?q=${encodeURIComponent(query)}&scope=all&semantic=true&limit=50`);
  return Array.isArray(payload.data) ? payload.data as Row[] : [];
}

function resultHref(row: Row): string {
  const type = String(row.type ?? '');
  if (type === 'documents') return `/dashboard/document-editor?id=${encodeURIComponent(row.id)}`;
  if (type === 'projects') return `/dashboard/projects?id=${encodeURIComponent(row.id)}`;
  if (type === 'tasks') return `/dashboard/tasks?id=${encodeURIComponent(row.id)}`;
  if (type === 'meetings') return `/dashboard/meetings?id=${encodeURIComponent(row.id)}`;
  if (type === 'people') return `/dashboard/team?person=${encodeURIComponent(row.id)}`;
  if (type === 'files') return '/dashboard/cloud';
  if (type === 'knowledge') return '/dashboard/knowledge-base';
  return '/dashboard';
}

export default function KnowledgeHubExperience() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Row[]>([]);
  const [docs, setDocs] = useState<Row[]>([]);
  const [files, setFiles] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchDocuments(), fetchModule('cloud')])
      .then(([documents, cloud]) => {
        if (cancelled) return;
        setDocs(documents);
        setFiles(cloud);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Falha ao carregar o conhecimento.');
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const search = async () => {
    const query = q.trim();
    if (!query) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResults(await fetchEnterpriseSearch(query));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao pesquisar o conhecimento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <OryonEntityHeader title="Knowledge" subtitle="Search, Docs, Files e contexto de conhecimento num único espaço." />
      <OryonPanel className="p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <OryonInput
            className="flex-1"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void search()}
            placeholder="Pesquisar pessoas, tarefas, projectos, documentos…"
            aria-label="Pesquisar em todo o conhecimento"
          />
          <OryonButton onClick={() => void search()} disabled={loading}>
            <Search className="h-3.5 w-3.5" />
            {loading ? 'A pesquisar…' : 'Pesquisar'}
          </OryonButton>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Pesquisa lexical + semântica, limitada aos recursos a que a sua conta tem acesso.</p>
      </OryonPanel>
      {error && <OryonCard className="p-4 text-sm text-[hsl(var(--status-danger))]">{error}</OryonCard>}
      <div className="grid gap-4 lg:grid-cols-3">
        <OryonCard className="p-5">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="mt-3 text-h2">Search</h2>
          <p className="mt-1 text-body-small text-muted-foreground">Pesquisa transversal sobre conteúdo operacional e contexto empresarial.</p>
          <OryonBadge className="mt-4">{results.length} resultados</OryonBadge>
        </OryonCard>
        <Link href="/dashboard/documents">
          <OryonCard className="h-full p-5 hover:bg-surface-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-h2">Docs</h2>
            <p className="mt-1 text-body-small text-muted-foreground">{initialLoading ? 'A carregar…' : `${docs.length} documentos disponíveis.`}</p>
          </OryonCard>
        </Link>
        <Link href="/dashboard/cloud">
          <OryonCard className="h-full p-5 hover:bg-surface-2">
            <Network className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-h2">Files</h2>
            <p className="mt-1 text-body-small text-muted-foreground">{initialLoading ? 'A carregar…' : `${files.length} recursos persistidos.`}</p>
          </OryonCard>
        </Link>
      </div>
      {results.length > 0 && (
        <OryonPanel className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-label">Resultados</p>
              <p className="mt-1 text-xs text-muted-foreground">Ordenados por relevância e contexto.</p>
            </div>
            <OryonBadge tone="accent">Enterprise Search</OryonBadge>
          </div>
          <div className="mt-3">
            <OryonDataGrid
              headers={['Título', 'Tipo', 'Relevância']}
              rows={results.map((row) => [
                <Link key={`${row.id}-title`} href={resultHref(row)} className="font-medium text-foreground hover:text-primary">{String(row.title ?? row.id)}</Link>,
                String(row.type ?? 'knowledge'),
                typeof row.score === 'number' ? `${Math.round(row.score * 100)}%` : '—',
              ])}
            />
          </div>
        </OryonPanel>
      )}
    </div>
  );
}
