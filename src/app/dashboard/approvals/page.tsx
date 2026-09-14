'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, XCircle, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ApprovalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    try {
      const response = await fetch('/api/approvals', { cache: 'no-store', credentials: 'include' });
      if (!response.ok) throw new Error('Não foi possível carregar as aprovações.');
      const result = await response.json() as { data: any[] };
      setItems(result.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro inesperado.'); }
  };
  useEffect(() => { void load(); }, []);
  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    await fetch('/api/approvals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, decision }) });
    await load();
  };
  const pending = items.filter((item) => ['pending', 'requested', 'awaiting'].includes(String(item.status ?? '')));
  return <div className="p-6 space-y-6"><div><Link href="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" />Command Center</Link><h1 className="text-3xl font-bold mt-3">Approvals</h1><p className="text-muted-foreground mt-1">Pedidos que exigem decisão ficam persistidos e entram no Event Fabric.</p></div>{error && <p className="text-destructive">{error}</p>}<Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" />Pendentes <Badge variant="secondary">{pending.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-3">{pending.length ? pending.map((item) => <div key={String(item.id)} className="rounded-xl border p-4"><div className="flex flex-col md:flex-row gap-4 md:items-center justify-between"><div className="min-w-0"><div className="flex gap-2 items-center"><strong>{String(item.title ?? 'Aprovação')}</strong><Badge variant="outline">{String(item.priority ?? 'medium')}</Badge></div><p className="text-sm text-muted-foreground mt-1">{String(item.description ?? '')}</p><p className="text-xs text-muted-foreground mt-2">Aprovador: {String(item.approverId ?? '')}</p></div><div className="flex gap-2"><Button onClick={() => void decide(String(item.id), 'approved')}><CheckCircle2 className="h-4 w-4 mr-2" />Aprovar</Button><Button variant="outline" onClick={() => void decide(String(item.id), 'rejected')}><XCircle className="h-4 w-4 mr-2" />Rejeitar</Button></div></div></div>) : <p className="py-10 text-center text-muted-foreground">Nenhuma aprovação pendente.</p>}</CardContent></Card></div>;
}
