'use client';

import Link from 'next/link';
import { BookOpen, FileText, Network, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OryonBadge, OryonButton, OryonCard, OryonDataGrid, OryonEntityHeader, OryonInput, OryonPanel } from '@/components/oryon-ui';

type Row = Record<string, unknown> & { id: string };

async function readJson(path: string): Promise<Record<string, unknown>> {
  const response = await fetch(path, { cache: 'no-store', credentials: 'include', headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `Falha ao carregar ${path}.`);
  return payload as Record<string, unknown>;
}

async function fetchModule(module: string, query = ''): Promise<Row[]> {
  const payload = await readJson(`/api/modules/${module}${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  return Array.isArray(payload.data) ? payload.data as Row[] : [];
}

async function fetchDocuments(query = ''): Promise<Row[]> {
  const payload = await readJson(`/api/documents${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  return Array.isArray(payload.documents) ? payload.documents as Row[] : [];
}

export default function KnowledgeHubExperience() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Row[]>([]);
  const [docs, setDocs] = useState<Row[]>([]);
  const [files, setFiles] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchDocuments(), fetchModule('cloud')])
      .then(([documents, cloud]) => {
        if (cancelled) return;
        setDocs(documents);
        setFiles(cloud);
        setError(null);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Falha ao carregar o conhecimento.');
      });
    return () => { cancelled = true; };
  }, []);

  const search = async () => {
    if (!q.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [kb, documents, cloud] = await Promise.all([
        fetchModule('knowledge-base', q),
        fetchDocuments(q),
        fetchModule('cloud', q),
      ]);
      setResults([...kb, ...documents, ...cloud].slice(0, 50));
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
            placeholder="Pesquisar em todo o conhecimento…"
            aria-label="Pesquisar conhecimento"
          />
          <OryonButton onClick={() => void search()} disabled={loading}>
            <Search className="h-3.5 w-3.5" />
            {loading ? 'A pesquisar…' : 'Search'}
          </OryonButton>
        </div>
      </OryonPanel>
      {error && <OryonCard className="p-4 text-sm text-[hsl(var(--status-danger))]">{error}</OryonCard>}
      <div className="grid gap-4 lg:grid-cols-3">
        <OryonCard className="p-5">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="mt-3 text-h2">Search</h2>
          <p className="mt-1 text-body-small text-muted-foreground">Pesquisa transversal sobre conteúdo operacional.</p>
          <OryonBadge className="mt-4">{results.length} resultados</OryonBadge>
        </OryonCard>
        <Link href="/dashboard/documents">
          <OryonCard className="h-full p-5 hover:bg-surface-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-h2">Docs</h2>
            <p className="mt-1 text-body-small text-muted-foreground">{docs.length} documentos disponíveis no backend.</p>
          </OryonCard>
        </Link>
        <Link href="/dashboard/cloud">
          <OryonCard className="h-full p-5 hover:bg-surface-2">
            <Network className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-h2">Files</h2>
            <p className="mt-1 text-body-small text-muted-foreground">{files.length} recursos persistidos.</p>
          </OryonCard>
        </Link>
      </div>
      {results.length > 0 && (
        <OryonPanel className="p-4">
          <p className="text-label">Resultados</p>
          <div className="mt-3">
            <OryonDataGrid
              headers={['Título', 'Tipo', 'Contexto']}
              rows={results.map((row) => [
                String(row.title ?? row.name ?? row.id),
                String(row.type ?? row.mimeType ?? 'knowledge'),
                String(row.category ?? row.department ?? 'Knowledge'),
              ])}
            />
          </div>
        </OryonPanel>
      )}
    </div>
  );
}
