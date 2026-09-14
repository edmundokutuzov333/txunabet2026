'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, MessageSquare, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DirectoryMember = {
  uid: string;
  displayName: string;
  email?: string | null;
  photoURL?: string | null;
  role?: string;
  departmentIds?: string[];
};

const roleRank: Record<string, number> = { owner: 0, admin: 1, manager: 2, member: 3, viewer: 4 };
const departmentLabels: Record<string, string> = { 'responsible-gaming':'Responsible Gaming', 'crm-vip':'CRM & VIP', 'customer-support':'Customer Support', 'data-bi':'Data & BI' };

export default function TeamPage() {
  const searchParams = useSearchParams();
  const department = searchParams.get('department') ?? '';
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch('/api/users/directory', { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `Não foi possível carregar a equipa (${response.status}).`);
        const nextMembers = Array.isArray(payload.members) ? payload.members as DirectoryMember[] : [];
        if (!cancelled) setMembers(nextMembers);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a equipa.');
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const contextMembers = useMemo(() => department ? members.filter((member) => member.departmentIds?.includes(department)) : members, [department, members]);
  const sortedMembers = useMemo(() => [...contextMembers].sort((a, b) => { const rankA = roleRank[(a.role ?? 'member').toLowerCase()] ?? 99; const rankB = roleRank[(b.role ?? 'member').toLowerCase()] ?? 99; return rankA !== rankB ? rankA - rankB : a.displayName.localeCompare(b.displayName); }), [contextMembers]);
  const contextLabel = departmentLabels[department] ?? department;

  return <div className="p-6 fade-in"><div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.12em] text-primary">People</p><h1 className="text-3xl font-bold text-foreground">A Nossa Equipa</h1><p className="mt-1 text-sm text-muted-foreground">Colaboradores activos da empresa, carregados directamente do backend.</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/dashboard/team">Todos</Link></Button>{department ? <Button variant="secondary" disabled>{contextLabel}</Button> : null}<div className="rounded-full border border-border/70 bg-card/40 px-3 py-2 text-xs text-muted-foreground">{contextMembers.length} colaboradores</div></div></div>
    {loading ? <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">{Array.from({ length: 8 }).map((_, index) => <Card key={index} className="gradient-surface border-0 rounded-2xl p-6"><div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-muted/40"/><div className="mx-auto mt-5 h-5 w-32 animate-pulse rounded bg-muted/40"/><div className="mx-auto mt-3 h-4 w-24 animate-pulse rounded bg-muted/30"/><div className="mx-auto mt-6 h-4 w-44 animate-pulse rounded bg-muted/25"/></Card>)}</div>
    : error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-6 text-sm text-destructive" role="alert">{error}</CardContent></Card>
    : sortedMembers.length === 0 ? <Card className="gradient-surface border-0 rounded-2xl"><CardContent className="p-10 text-center text-sm text-muted-foreground">Não existem colaboradores para este contexto.</CardContent></Card>
    : <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{sortedMembers.map((member) => { const fallback = member.displayName?.trim().charAt(0).toUpperCase() || '?'; const departmentLabel = member.departmentIds?.length ? member.departmentIds.join(', ') : 'Sem departamento'; return <Card key={member.uid} className="gradient-surface border-0 rounded-2xl text-center flex flex-col items-center p-6 transition-all hover:-translate-y-1 hover:shadow-2xl"><CardHeader className="p-0 items-center"><div className="relative mb-4"><Avatar className="h-24 w-24 border-4 border-background"><AvatarImage src={member.photoURL ?? undefined} alt={member.displayName}/><AvatarFallback>{fallback}</AvatarFallback></Avatar><span className="absolute bottom-1 right-1 block h-4 w-4 rounded-full bg-slate-500 ring-4 ring-background" title="Estado indisponível"/></div><CardTitle className="text-lg font-bold text-foreground">{member.displayName}</CardTitle><p className="text-sm font-medium text-primary">{member.role ?? 'Colaborador'}</p></CardHeader><CardContent className="mt-4 w-full space-y-2 break-words p-0 text-center text-sm text-muted-foreground"><div className="flex items-center justify-center gap-2"><Mail className="h-4 w-4 shrink-0"/><span>{member.email ?? 'Sem email disponível'}</span></div><p className="text-xs text-muted-foreground/80">{departmentLabel}</p></CardContent><div className="mt-6 flex gap-3"><Link href={`/dashboard/chat/direct/${member.uid}`}><Button variant="outline" size="icon" className="h-11 w-11 rounded-full bg-card/50"><MessageSquare className="h-4 w-4"/><span className="sr-only">Enviar mensagem</span></Button></Link><Link href={`/dashboard/call/${member.uid}?type=video`}><Button variant="outline" size="icon" className="h-11 w-11 rounded-full bg-card/50"><Video className="h-4 w-4"/><span className="sr-only">Iniciar chamada</span></Button></Link></div></Card>)})}</div>}
  </div>;
}
