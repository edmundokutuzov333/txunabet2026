'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock3, Inbox, ListTodo, MessageSquare, ShieldAlert, Sparkles, Video, XCircle } from 'lucide-react';
import { getDailyBriefing } from '@/ai/flows/get-daily-briefing';
import { OryonAIResponse, OryonBadge, OryonCard, OryonEntityHeader, OryonEmptyState, OryonPanel, OryonRiskCard, OryonSkeleton, OryonStatus, OryonButton } from '@/components/oryon-ui';

type CenterData = {
  identity: { role: string; companyId: string; uid: string };
  surfaces: string[];
  today: { tasks: any[]; meetings: any[]; messages: any[]; approvals: any[]; deadlines: any[]; alerts: any[] };
  pulse: Array<{ label: string; value: number; href: string }>;
  attention: { critical: any[]; needsAction: any[]; atRisk: any[]; blocked: any[]; waiting: any[] };
  briefing: { changed: any[]; failed: any[]; completed: any[]; atRisk: any[]; summary: string };
  inbox: { items: any[]; counts: { totalUnread: number; critical: number; today: number; informational: number } };
  activityFeed: any[];
  offline: { decisions: any[]; messages: any[]; tasks: any[]; approvals: any[]; projectsAtRisk: any[] };
};

const text = (item: any, key: string) => String(item?.[key] ?? '');

function Row({ item, icon: Icon, href = '/dashboard/inbox' }: { item: any; icon: React.ElementType; href?: string }) {
  return <Link href={href} className="group flex items-start gap-3 border-b border-border/70 py-3 last:border-b-0"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-surface-2 text-primary"><Icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium text-foreground group-hover:text-primary">{text(item, 'title') || text(item, 'name') || text(item, 'eventName') || 'Atividade'}</span><span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-muted-foreground">{text(item, 'body') || text(item, 'description') || text(item, 'message') || text(item, 'summary')}</span></span><ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-primary" /></Link>;
}

export default function CommandCenterV3() {
  const [data, setData] = useState<CenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/command-center', { cache: 'no-store', credentials: 'include' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'Não foi possível carregar o Command Center.');
        setData(payload.data as CenterData);
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro inesperado.'); }
      finally { setLoading(false); }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!data) return;
    const run = async () => {
      try {
        const result = await getDailyBriefing({
          userName: data.identity.role,
          tasks: data.today.tasks.slice(0, 20).map((task) => ({ id: String(task.id), title: String(task.title ?? 'Tarefa'), description: String(task.description ?? ''), status: String(task.status ?? ''), priority: String(task.priority ?? 'medium'), dueDate: String(task.dueDate ?? '') })),
          meetings: data.today.meetings.slice(0, 20).map((meeting) => ({ id: String(meeting.id), title: String(meeting.title ?? meeting.name ?? 'Reunião'), description: String(meeting.description ?? ''), date: String(meeting.date ?? ''), time: String(meeting.time ?? ''), duration: Number(meeting.duration ?? 0) })),
        });
        setAiBriefing(result.briefing);
      } catch { setAiBriefing(null); }
    };
    void run();
  }, [data]);

  const priorityQueue = useMemo(() => [
    ...data?.attention.critical ?? [],
    ...data?.attention.needsAction ?? [],
    ...data?.attention.atRisk ?? [],
  ].slice(0, 7), [data]);

  if (loading) return <div className="grid gap-5 p-1"><OryonSkeleton className="h-20" /><div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]"><OryonSkeleton className="h-96" /><OryonSkeleton className="h-96" /></div><OryonSkeleton className="h-56" /></div>;
  if (error || !data) return <OryonEmptyState icon={<AlertTriangle className="h-5 w-5" />} title="Command Center indisponível" description={error ?? 'Não foi possível carregar o estado operacional.'} action={<OryonButton onClick={() => window.location.reload()}>Tentar novamente</OryonButton>} />;

  const totalAttention = data.attention.critical.length + data.attention.needsAction.length + data.attention.atRisk.length + data.attention.blocked.length + data.attention.waiting.length;

  return <div className="grid gap-7">
    <OryonEntityHeader title="Good morning" subtitle="O seu contexto operacional está aqui. Comece pela fila de prioridade." meta={<div className="flex flex-wrap items-center gap-2"><OryonStatus status={totalAttention > 0 ? 'warning' : 'active'} label={totalAttention ? `${totalAttention} itens exigem atenção` : 'Operação estável'} /><OryonBadge tone="neutral">{data.identity.role}</OryonBadge></div>} actions={<div className="flex gap-2"><OryonButton variant="outline" onClick={() => window.location.href = '/dashboard/inbox'}><Inbox className="h-3.5 w-3.5" />Inbox {data.inbox.counts.totalUnread}</OryonButton><OryonButton onClick={() => window.location.href = '/dashboard/tasks'}><ListTodo className="h-3.5 w-3.5" />My Work</OryonButton></div>} />

    <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <OryonPanel elevated className="p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="text-label text-primary">Priority queue</p><h2 className="mt-1 text-h2">O que precisa de decisão?</h2></div><OryonBadge tone={priorityQueue.length ? 'warning' : 'success'}>{priorityQueue.length} itens</OryonBadge></div>
        <div className="mt-4">{priorityQueue.length ? priorityQueue.map((item, index) => <Row key={`${item.id ?? index}`} item={item} icon={index < data.attention.critical.length ? ShieldAlert : index < data.attention.critical.length + data.attention.needsAction.length ? ArrowRight : AlertTriangle} />) : <OryonEmptyState title="Fila limpa" description="Não existem itens críticos, bloqueados ou em risco neste momento." />}</div>
      </OryonPanel>
      <OryonPanel className="p-5">
        <div className="flex items-center justify-between"><div><p className="text-label">Today</p><h2 className="mt-1 text-h2">Agenda operacional</h2></div><OryonBadge tone="neutral">{data.today.tasks.length + data.today.meetings.length} itens</OryonBadge></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><Link href="/dashboard/tasks" className="rounded-[8px] border border-border bg-surface-1 p-3 hover:border-border-strong"><p className="text-[11px] text-muted-foreground">Tasks</p><p className="mt-1 text-2xl font-semibold text-foreground">{data.today.tasks.length}</p></Link><Link href="/dashboard/meetings" className="rounded-[8px] border border-border bg-surface-1 p-3 hover:border-border-strong"><p className="text-[11px] text-muted-foreground">Meetings</p><p className="mt-1 text-2xl font-semibold text-foreground">{data.today.meetings.length}</p></Link><Link href="/dashboard/inbox" className="rounded-[8px] border border-border bg-surface-1 p-3 hover:border-border-strong"><p className="text-[11px] text-muted-foreground">Messages</p><p className="mt-1 text-2xl font-semibold text-foreground">{data.inbox.counts.totalUnread}</p></Link><Link href="/dashboard/approvals" className="rounded-[8px] border border-border bg-surface-1 p-3 hover:border-border-strong"><p className="text-[11px] text-muted-foreground">Approvals</p><p className="mt-1 text-2xl font-semibold text-foreground">{data.today.approvals.length}</p></Link></div>
      </OryonPanel>
    </section>

    <section><div className="mb-3 flex items-end justify-between"><div><p className="text-label">Company Pulse</p><h2 className="mt-1 text-h2">Operational health</h2></div><Link href="/dashboard/pulse" className="text-xs font-medium text-primary">Open Pulse</Link></div><div className="grid gap-px overflow-hidden rounded-[10px] border border-border bg-border md:grid-cols-4 xl:grid-cols-8">{data.pulse.map((item) => <Link key={item.label} href={item.href} className="bg-surface-1 p-4 hover:bg-surface-2"><p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{item.value}</p></Link>)}</div></section>

    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]"><div><div className="mb-3"><p className="text-label">Work at risk</p><h2 className="mt-1 text-h2">Risks, blocked, waiting</h2></div><div className="grid gap-3 md:grid-cols-3"><OryonRiskCard title="At risk" level="high" score={Math.min(100, data.attention.atRisk.length * 18)} description={`${data.attention.atRisk.length} itens detectados.`} /><OryonRiskCard title="Blocked" level={data.attention.blocked.length ? 'critical' : 'low'} score={Math.min(100, data.attention.blocked.length * 28)} description={`${data.attention.blocked.length} itens bloqueados.`} /><OryonRiskCard title="Waiting" level={data.attention.waiting.length ? 'medium' : 'low'} score={Math.min(100, data.attention.waiting.length * 16)} description={`${data.attention.waiting.length} itens à espera.`} /></div></div><div><div className="mb-3"><p className="text-label text-primary">Oryon Intelligence</p><h2 className="mt-1 text-h2">Briefing</h2></div><OryonAIResponse status={aiBriefing ? 'ready' : 'processing'} answer={aiBriefing ?? data.briefing.summary} evidence={<span>{data.briefing.changed.length} mudanças · {data.briefing.failed.length} falhas · {data.briefing.atRisk.length} riscos</span>} confidence={aiBriefing ? 0.92 : undefined} nextStep="Comece pela priority queue e trate os itens críticos antes do restante." /></div></section>

    <section><div className="mb-3"><p className="text-label">Recent activity</p><h2 className="mt-1 text-h2">O que mudou</h2></div><OryonCard className="px-4"><div>{data.activityFeed.slice(0, 8).map((item) => <Row key={String(item.id)} item={item} icon={CheckCircle2} />)}{!data.activityFeed.length && <OryonEmptyState title="Sem actividade recente" description="Ainda não existem eventos suficientes para este feed." />}</div></OryonCard></section>
  </div>;
}
