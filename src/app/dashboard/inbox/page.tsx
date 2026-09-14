'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, ChevronRight, Filter, Inbox as InboxIcon, Mail, RefreshCcw, Settings2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const categories = ['all', 'assignment', 'approval', 'mention', 'comment', 'task', 'document', 'meeting', 'workflow', 'alert', 'decision', 'request'];

export default function InboxPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const qs = filter === 'all' ? '' : `&category=${encodeURIComponent(filter)}`;
      const response = await fetch(`/api/command-center?resource=inbox&limit=100${qs}`, { cache: 'no-store', credentials: 'include' });
      if (!response.ok) throw new Error('Não foi possível carregar a Inbox.');
      const result = await response.json() as { data: any[] };
      setItems(result.data);
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro inesperado.'); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [filter]);

  const counts = useMemo(() => ({ total: items.length, critical: items.filter((item) => ['critical','high'].includes(String(item.severity))).length, today: items.filter((item) => String(item.createdAt ?? '').slice(0,10) === new Date().toISOString().slice(0,10)).length, informational: items.filter((item) => item.category === 'system').length }), [items]);
  const markAll = async () => { const ids = items.filter((item) => item.read !== true).map((item) => String(item.id)); if (!ids.length) return; await fetch('/api/command-center', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read', notificationIds: ids }) }); await load(); };

  return <div className="p-6 space-y-6"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="text-sm text-primary">WORK OS</p><h1 className="text-3xl font-bold mt-1">Oryon Inbox</h1><p className="text-muted-foreground mt-1">Tudo o que exige consciência, ação ou resposta, num só lugar.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()}><RefreshCcw className="h-4 w-4 mr-2" />Atualizar</Button><Button onClick={() => void markAll()}><CheckCheck className="h-4 w-4 mr-2" />Marcar lidos</Button></div></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Needs attention</p><p className="text-2xl font-bold">{items.filter((item) => item.read !== true).length}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Critical</p><p className="text-2xl font-bold text-destructive">{counts.critical}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Today</p><p className="text-2xl font-bold">{counts.today}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Informational</p><p className="text-2xl font-bold">{counts.informational}</p></CardContent></Card></div>
    <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((value) => <Button key={value} size="sm" variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}><Filter className="h-3.5 w-3.5 mr-1" />{value === 'all' ? 'Todas' : value}</Button>)}</div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><InboxIcon className="h-5 w-5 text-primary" />Needs your attention <Badge variant="secondary">{items.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-1">{loading ? <p className="py-10 text-center text-muted-foreground">A carregar...</p> : error ? <p className="py-10 text-center text-destructive">{error}</p> : items.length ? items.map((item) => <div key={String(item.id)} className={`p-4 rounded-xl border ${item.read === true ? 'border-border/40 opacity-70' : 'border-primary/20 bg-primary/5'}`}><div className="flex items-start gap-3"><div className="mt-1">{['critical','high'].includes(String(item.severity)) ? <ShieldAlert className="h-5 w-5 text-destructive" /> : item.category === 'mention' ? <Mail className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5 text-primary" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2 items-center"><strong>{String(item.title ?? 'Notificação')}</strong><Badge variant="outline">{String(item.category ?? 'system')}</Badge>{!item.read && <Badge>Não lida</Badge>}</div><p className="text-sm text-muted-foreground mt-1">{String(item.body ?? '')}</p><p className="text-xs text-muted-foreground mt-2">{String(item.createdAt ?? '')}</p></div><Link href={String(item.actionUrl ?? '/dashboard')}><Button variant="ghost" size="icon" aria-label="Abrir"><ChevronRight className="h-4 w-4" /></Button></Link></div></div>) : <div className="py-14 text-center"><Bell className="h-10 w-10 mx-auto text-muted-foreground" /><p className="font-medium mt-3">Inbox limpa</p><p className="text-sm text-muted-foreground">Não existem notificações nesta categoria.</p></div>}</CardContent></Card>
    <Separator />
    <div className="flex items-center justify-between text-sm"><Link href="/dashboard" className="text-primary">Voltar ao Command Center</Link><Link href="/dashboard/settings" className="text-muted-foreground flex items-center gap-2"><Settings2 className="h-4 w-4" />Preferências</Link></div>
  </div>;
}
