'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2, Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface DocumentItem {
  id: string;
  title: string;
  ownerId: string;
  contentVersion: number;
  currentVersion: number;
  updatedAt?: { _seconds?: number };
  sharedCompany: boolean;
  editorIds: string[];
  viewerIds: string[];
}

function dateText(value: DocumentItem['updatedAt']) {
  if (!value?._seconds) return 'agora';
  return new Date(Number(value._seconds) * 1000).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/documents', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'DOCUMENTS_LOAD_FAILED');
        if (!cancelled) setDocuments(payload.documents ?? []);
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'DOCUMENTS_LOAD_FAILED'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => documents.filter((document) => document.title.toLowerCase().includes(query.trim().toLowerCase())), [documents, query]);

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-3xl font-bold text-foreground">Documentos</h1><p className="mt-1 text-sm text-muted-foreground">Espaço documental estruturado da Oryon.</p></div>
        <Button asChild className="btn-primary-gradient"><Link href="/dashboard/document-editor"><Plus className="mr-2 h-4 w-4" />Novo documento</Link></Button>
      </div>
      <Card className="gradient-surface border-0 rounded-2xl"><CardContent className="p-4"><div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar documentos..." className="pl-10" /></div></CardContent></Card>
      {loading && <Card><CardContent className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></CardContent></Card>}
      {error && <Card className="border-destructive"><CardContent className="p-6 text-sm text-destructive">Não foi possível carregar os documentos: {error}</CardContent></Card>}
      {!loading && !error && filtered.length === 0 && <Card><CardContent className="flex flex-col items-center justify-center py-20 text-center"><FileText className="h-12 w-12 text-muted-foreground/60" /><h2 className="mt-4 text-lg font-semibold">Sem documentos</h2><p className="mt-1 max-w-md text-sm text-muted-foreground">Crie o primeiro documento e a Oryon passa a guardar conteúdo, versões, comentários e permissões no servidor.</p><Button asChild className="mt-6"><Link href="/dashboard/document-editor">Criar documento</Link></Button></CardContent></Card>}
      {!loading && !error && filtered.length > 0 && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((document) => <Link key={document.id} href={`/dashboard/document-editor?id=${encodeURIComponent(document.id)}`}><Card className="h-full transition-colors hover:border-primary/60"><CardHeader><CardTitle className="flex items-start gap-3 text-base"><FileText className="mt-0.5 h-5 w-5 text-primary" /><span className="line-clamp-2">{document.title}</span></CardTitle></CardHeader><CardContent className="space-y-3 text-xs text-muted-foreground"><div>Última alteração: {dateText(document.updatedAt)}</div><div>Versão actual: {document.currentVersion || document.contentVersion || 1}</div><div className="flex items-center gap-2">{document.sharedCompany ? 'Partilhado com a empresa' : `${document.editorIds?.length ?? 0} editores · ${document.viewerIds?.length ?? 0} visualizadores`}<Users className="ml-auto h-4 w-4" /></div></CardContent></Card></Link>)}</div>}
    </div>
  );
}
