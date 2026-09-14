'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, Clock3, Inbox, ListTodo, MessageSquare, ShieldAlert, Sparkles, Target, Video, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getDailyBriefing } from '@/ai/flows/get-daily-briefing';

interface CenterData {
  identity: { role: string; companyId: string; uid: string };
  surfaces: string[];
  today: { tasks: any[]; meetings: any[]; messages: any[]; approvals: any[]; deadlines: any[]; alerts: any[] };
  pulse: Array<{ label: string; value: number; href: string }>;
  attention: { critical: any[]; needsAction: any[]; atRisk: any[]; blocked: any[]; waiting: any[] };
  briefing: { changed: any[]; failed: any[]; completed: any[]; atRisk: any[]; summary: string };
  inbox: { items: any[]; counts: { totalUnread: number; critical: number; today: number; informational: number } };
  activityFeed: any[];
  offline: { decisions: any[]; messages: any[]; tasks: any[]; approvals: any[]; projectsAtRisk: any[] };
}

const labelFor = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (match) => match.toUpperCase());

function Item({ item, icon: Icon, href = '/dashboard/inbox' }: { item: any; icon: React.ElementType; href?: string }) {
  return <Link href={href} className="block"><div className="rounded-xl border border-border/60 bg-card/30 p-3 hover:bg-muted/40 transition-colors"><div className="flex gap-3 items-start"><Icon className="h-4 w-4 text-primary mt-1 shrink-0" /><div className="min-w-0"><p className="font-medium text-sm truncate">{String(item.title ?? item.name ?? item.body ?? item.eventName ?? 'Atividade')}</p><p className="text-xs text-muted-foreground line-clamp-2">{String(item.body ?? item.description ?? item.message ?? item.summary ?? '')}</p></div></div></div></Link>;
}

export default function CommandCenterView() {
  const [data, setData] = useState<CenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState<any | null>(null);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const lastSeen = typeof window !== 'undefined' ? localStorage.getItem('oryon:last-seen') : null;
        const response = await fetch('/api/command-center', { cache: 'no-store', credentials: 'include' });
        if (!response.ok) throw new Error('Não foi possível carregar o Command Center.');
        const result = await response.json() as { data: CenterData };
        if (!active) return;
        setData(result.data);
        if (lastSeen) setOffline(result.data.offline);
        if (typeof window !== 'undefined') localStorage.setItem('oryon:last-seen', new Date().toISOString());
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'Erro inesperado.'); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!data) return;
    let active = true;
    const run = async () => {
      try {
        const result = await getDailyBriefing({
          userName: data.identity.role,
          tasks: data.today.tasks.slice(0, 20).map((task) => ({ id: String(task.id), title: String(task.title ?? 'Tarefa'), description: String(task.description ?? ''), status: String(task.status ?? ''), priority: String(task.priority ?? 'medium'), dueDate: String(task.dueDate ?? '') })),
          meetings: data.today.meetings.slice(0, 20).map((meeting) => ({ id: String(meeting.id), title: String(meeting.title ?? meeting.name ?? 'Reunião'), description: String(meeting.description ?? ''), date: String(meeting.date ?? ''), time: String(meeting.time ?? ''), duration: Number(meeting.duration ?? 0) })),
        });
        if (active) setAiBriefing(result.briefing);
      } catch { if (active) setAiBriefing(null); }
    };
    void run();
    return () => { active = false; };
  }, [data]);

  const unread = data?.inbox.counts.totalUnread ?? 0;
  const greeting = useMemo(() => { const hour = new Date().getHours(); return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'; }, []);
  if (loading) return <div className="p-6"><div className="animate-pulse space-y-5"><div className="h-10 rounded-xl bg-muted" /><div className="grid grid-cols-1 lg:grid-cols-3 gap-5">{[1,2,3].map((i) => <div key={i} className="h-40 rounded-2xl bg-muted" />)}</div><div className="h-72 rounded-2xl bg-muted" /></div></div>;
  if (error || !data) return <div className="p-6"><Card><CardContent className="p-8"><p className="text-destructive">{error ?? 'Dados indisponíveis.'}</p></CardContent></Card></div>;

  return <div className="p-6 fade-in space-y-6">
    <div className="flex flex-col xl:flex-row justify-between gap-4"><div><p className="text-sm text-primary font-medium">{labelFor(data.identity.role)}</p><h1 className="text-3xl font-bold mt-1">{greeting}, o seu Command Center</h1><p className="text-muted-foreground mt-1">Um único lugar para trabalho, contexto e decisões.</p></div><div className="flex flex-wrap gap-2 items-center"><Badge variant="secondary"><Inbox className="h-3.5 w-3.5 mr-1" />{unread} por tratar</Badge><Button asChild variant="outline"><Link href="/dashboard/inbox">Abrir Inbox <ArrowRight className="h-4 w-4 ml-2" /></Link></Button><Button asChild variant="outline"><Link href="/dashboard/approvals">Aprovações</Link></Button></div></div>
    <div className="flex gap-2 flex-wrap">{data.surfaces.map((surface) => <Badge key={surface} variant="outline">{surface}</Badge>)}</div>
    {offline && <Card className="border-primary/30 bg-primary/5"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4 text-primary" />Enquanto esteve offline...</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm"><div><strong>{offline.decisions.length}</strong><span className="text-muted-foreground"> decisões</span></div><div><strong>{offline.messages.length}</strong><span className="text-muted-foreground"> mensagens</span></div><div><strong>{offline.tasks.length}</strong><span className="text-muted-foreground"> tarefas</span></div><div><strong>{offline.approvals.length}</strong><span className="text-muted-foreground"> aprovações</span></div><div><strong>{offline.projectsAtRisk.length}</strong><span className="text-muted-foreground"> riscos</span></div></CardContent></Card>}
    <section><div className="flex items-center justify-between mb-3"><h2 className="text-lg font-semibold">Today</h2><Link href="/dashboard/tasks" className="text-sm text-primary">Ver trabalho</Link></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"><Card><CardHeader className="pb-3"><CardTitle className="text-base flex gap-2"><ListTodo className="h-4 w-4 text-primary" />My Tasks</CardTitle></CardHeader><CardContent className="space-y-2">{data.today.tasks.length ? data.today.tasks.slice(0,4).map((item) => <Item key={String(item.id)} item={item} icon={ListTodo} href="/dashboard/tasks" />) : <p className="text-sm text-muted-foreground">Sem tarefas pendentes.</p>}</CardContent></Card><Card><CardHeader className="pb-3"><CardTitle className="text-base flex gap-2"><Video className="h-4 w-4 text-primary" />My Meetings</CardTitle></CardHeader><CardContent className="space-y-2">{data.today.meetings.length ? data.today.meetings.slice(0,4).map((item) => <Item key={String(item.id)} item={item} icon={Video} href="/dashboard/meetings" />) : <p className="text-sm text-muted-foreground">Sem reuniões próximas.</p>}</CardContent></Card><Card><CardHeader className="pb-3"><CardTitle className="text-base flex gap-2"><MessageSquare className="h-4 w-4 text-primary" />My Messages</CardTitle></CardHeader><CardContent className="space-y-2">{data.today.messages.length ? data.today.messages.slice(0,4).map((item) => <Item key={String(item.id)} item={item} icon={MessageSquare} />) : <p className="text-sm text-muted-foreground">Sem mensagens relevantes.</p>}</CardContent></Card></div></section>
    <section><div className="flex items-center justify-between mb-3"><h2 className="text-lg font-semibold">Company Pulse</h2><Link href="/dashboard/pulse" className="text-sm text-primary">Ver pulse</Link></div><div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">{data.pulse.map((item) => <Link key={item.label} href={item.href}><Card className="hover:bg-muted/40 transition-colors"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-2xl font-bold mt-1">{item.value}</p></CardContent></Card></Link>)}</div></section>
    <section><h2 className="text-lg font-semibold mb-3">Attention</h2><div className="grid grid-cols-1 lg:grid-cols-5 gap-3">{[['Critical', data.attention.critical, ShieldAlert], ['Needs action', data.attention.needsAction, ArrowRight], ['At risk', data.attention.atRisk, AlertTriangle], ['Blocked', data.attention.blocked, XCircle], ['Waiting', data.attention.waiting, Clock3]].map(([title, items, Icon]) => <Card key={String(title)}><CardHeader className="pb-3"><CardTitle className="text-sm flex justify-between">{String(title)}<Badge variant="secondary">{(items as any[]).length}</Badge></CardTitle></CardHeader><CardContent className="space-y-2">{(items as any[]).slice(0,3).map((item) => <Item key={String(item.id)} item={item} icon={Icon as any} />)}{!(items as any[]).length && <p className="text-xs text-muted-foreground">Nada a destacar.</p>}</CardContent></Card>)}</div></section>
    <section className="grid grid-cols-1 xl:grid-cols-2 gap-5"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />AI Briefing</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{aiBriefing ?? data.briefing.summary}</p><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-muted/30 p-3"><p className="text-muted-foreground">Mudou</p><strong>{data.briefing.changed.length}</strong></div><div className="rounded-xl bg-muted/30 p-3"><p className="text-muted-foreground">Correu mal</p><strong>{data.briefing.failed.length}</strong></div><div className="rounded-xl bg-muted/30 p-3"><p className="text-muted-foreground">Concluído</p><strong>{data.briefing.completed.length}</strong></div><div className="rounded-xl bg-muted/30 p-3"><p className="text-muted-foreground">Em risco</p><strong>{data.briefing.atRisk.length}</strong></div></div><Separator /><div className="space-y-2">{data.briefing.changed.slice(0,4).map((item) => <Item key={String(item.id)} item={item} icon={Bot} />)}</div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><ActivityIcon /><span>Activity Feed</span></CardTitle></CardHeader><CardContent className="space-y-2">{data.activityFeed.slice(0,8).map((item) => <Item key={String(item.id)} item={item} icon={CheckCircle2} />)}{!data.activityFeed.length && <p className="text-sm text-muted-foreground">Ainda não há atividade normalizada.</p>}</CardContent></Card></section>
  </div>;
}

function ActivityIcon() { return <Target className="h-5 w-5 text-primary" />; }
