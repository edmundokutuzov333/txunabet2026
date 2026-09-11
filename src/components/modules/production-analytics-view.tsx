'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, Activity, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type AnalyticsData = { totals: Record<string, number>; activity: { date: string; count: number }[] };

export default function ProductionAnalyticsView() {
  const { toast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analytics', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Falha ao carregar analytics');
      setData(payload.data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro de analytics', description: error instanceof Error ? error.message : 'Falha ao carregar' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const total = data ? Object.values(data.totals).reduce((sum, value) => sum + value, 0) : 0;
  const peak = data?.activity.reduce((max, item) => Math.max(max, item.count), 0) ?? 0;

  return (
    <div className="p-6 fade-in space-y-6">
      <div className="flex items-end justify-between"><div><h1 className="text-3xl font-bold">Analytics</h1><p className="text-muted-foreground mt-1">Métricas calculadas directamente dos dados reais dos módulos.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/> Actualizar</Button></div>
      {loading ? <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin"/></div> : <>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="gradient-surface border-0 rounded-2xl"><CardContent className="p-6"><Database className="h-5 w-5 text-primary mb-3"/><div className="text-sm text-muted-foreground">Registos operacionais</div><div className="text-3xl font-bold mt-1">{total}</div></CardContent></Card>
          <Card className="gradient-surface border-0 rounded-2xl"><CardContent className="p-6"><Activity className="h-5 w-5 text-primary mb-3"/><div className="text-sm text-muted-foreground">Pico diário de actividade</div><div className="text-3xl font-bold mt-1">{peak}</div></CardContent></Card>
          <Card className="gradient-surface border-0 rounded-2xl"><CardContent className="p-6"><div className="text-sm text-muted-foreground">Módulos com dados</div><div className="text-3xl font-bold mt-1">{data ? Object.values(data.totals).filter(Boolean).length : 0}</div></CardContent></Card>
        </div>
        <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle>Registos por módulo</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{Object.entries(data?.totals ?? {}).map(([module, count]) => <div key={module} className="rounded-xl border border-border/60 p-4"><div className="text-sm capitalize text-muted-foreground">{module.replaceAll('-', ' ')}</div><div className="text-2xl font-semibold mt-1">{count}</div></div>)}</div></CardContent></Card>
        <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle>Actividade diária</CardTitle></CardHeader><CardContent><div className="space-y-2">{(data?.activity ?? []).map((item) => <div key={item.date} className="flex items-center gap-3"><span className="w-24 text-xs text-muted-foreground">{item.date}</span><div className="h-2 flex-1 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${peak ? Math.max(4, item.count / peak * 100) : 0}%` }}/></div><span className="w-10 text-right text-sm font-medium">{item.count}</span></div>)}</div></CardContent></Card>
      </>}
    </div>
  );
}
