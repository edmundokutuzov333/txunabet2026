'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Activity, Folder, MessageSquare, Target, Users } from 'lucide-react';

type Department = { id: string; slug: string; name: string; description?: string; budget?: number; memberCount?: number; projects?: number; goals?: string[] };
type Member = { uid: string; displayName?: string; role?: string; photoURL?: string | null; email?: string | null };
type Project = { id: string; name?: string; progress?: number; status?: string; description?: string };
type Task = { id: string; title?: string; status?: string; priority?: string; dueDate?: string };
type DepartmentPayload = { department: Department; members: Member[]; projects: Project[]; tasks: Task[]; metrics: { totalTasks: number; completedTasks: number; blockedTasks: number; highPriority: number; completionRate: number } };

export default function DepartmentPageLayout({ slug }: { slug: string }) {
  const [payload, setPayload] = useState<DepartmentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch(`/api/departments/${encodeURIComponent(slug)}`, { credentials: 'include', cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Não foi possível carregar o departamento.');
        if (!cancelled) setPayload(result as DepartmentPayload);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o departamento.');
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [slug]);
  const sortedMembers = useMemo(() => [...(payload?.members ?? [])].sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '')), [payload?.members]);
  if (loading) return <div className="grid gap-5"><div className="h-28 animate-pulse rounded-2xl bg-surface-2"/><div className="grid gap-4 md:grid-cols-3"><div className="h-28 animate-pulse rounded-2xl bg-surface-1"/><div className="h-28 animate-pulse rounded-2xl bg-surface-1"/><div className="h-28 animate-pulse rounded-2xl bg-surface-1"/></div></div>;
  if (error || !payload) return <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-8 text-sm text-destructive">{error ?? 'Departamento não encontrado.'}</CardContent></Card>;
  const { department, members, projects, tasks, metrics } = payload;
  return <div className="grid gap-6">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs uppercase tracking-[0.12em] text-primary">Department</p><h1 className="mt-1 text-3xl font-bold text-foreground">{department.name}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{department.description}</p></div><Button asChild variant="outline"><Link href={`/dashboard/team?department=${encodeURIComponent(slug)}`}><Users className="mr-2 h-4 w-4"/>Equipa</Link></Button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Membros</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{members.length}</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Projectos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{projects.length}</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Work items</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{metrics.totalTasks}</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Conclusão</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{metrics.completionRate}%</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Budget</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">MZN {Number(department.budget ?? 0).toLocaleString('pt-PT')}</p></CardContent></Card>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]"><div className="grid gap-5">
      <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Folder className="h-5 w-5 text-primary"/>Projectos activos</CardTitle></CardHeader><CardContent className="grid gap-3">{projects.map((project) => <Link key={project.id} href={`/dashboard/projects?id=${encodeURIComponent(project.id)}`} className="rounded-xl border border-border/70 p-4 hover:bg-muted/30"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{project.name}</p><p className="mt-1 text-xs text-muted-foreground">{project.description ?? 'Iniciativa operacional do departamento.'}</p></div><Badge>{project.status ?? 'active'}</Badge></div><Progress className="mt-3" value={Number(project.progress ?? 0)}/></Link>)}</CardContent></Card>
      <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary"/>Fila operacional</CardTitle></CardHeader><CardContent className="grid gap-2">{tasks.slice(0, 18).map((task) => <div key={task.id} className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{task.title}</p><p className="text-xs text-muted-foreground">{task.priority ?? 'medium'} · {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-PT') : 'sem prazo'}</p></div><Badge variant={String(task.status).includes('done') ? 'default' : 'secondary'}>{task.status ?? 'todo'}</Badge></div>)}</CardContent></Card>
    </div><div className="grid gap-5">
      <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary"/>Saúde</CardTitle></CardHeader><CardContent className="space-y-4"><div><div className="flex justify-between text-xs"><span>Conclusão</span><span>{metrics.completionRate}%</span></div><Progress className="mt-2" value={metrics.completionRate}/></div><div className="grid grid-cols-2 gap-2"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Bloqueados</p><p className="mt-1 text-xl font-semibold">{metrics.blockedTasks}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Prioridade alta</p><p className="mt-1 text-xl font-semibold">{metrics.highPriority}</p></div></div></CardContent></Card>
      <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary"/>Pessoas</CardTitle></CardHeader><CardContent className="space-y-2">{sortedMembers.slice(0, 14).map((member) => <div key={member.uid} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/30"><Avatar className="h-9 w-9"><AvatarImage src={member.photoURL ?? undefined}/><AvatarFallback>{member.displayName?.charAt(0) ?? '?'}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium">{member.displayName}</p><p className="truncate text-xs text-muted-foreground">{member.role ?? 'Colaborador'}</p></div><Link className="ml-auto" href={`/dashboard/chat/direct/${member.uid}`}><MessageSquare className="h-4 w-4 text-muted-foreground"/></Link></div>)}</CardContent></Card>
    </div></div>
  </div>;
}
