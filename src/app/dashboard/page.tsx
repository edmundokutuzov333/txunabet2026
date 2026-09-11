'use client';
import { Activity, ListTodo, Video, Users, Shield, BarChart, Target, Bot, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTasksForUser, feedItems, meetings as legacyMeetings } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getDailyBriefing } from '@/ai/flows/get-daily-briefing';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useUser } from '@/firebase';
import { ROLES } from '@/config/roles';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';
import type { LegacyMeeting } from '@/lib/data';

type DashboardUser = { uid: string; displayName: string; email: string | null; role: string; companyId: string };

const AdminPanel = () => {
  const [open, setOpen] = useState(false);
  const systemAlerts = [
    { id: 'alert01', severity: 'high', message: 'Atividade suspeita detectada e encaminhada para revisão.' },
    { id: 'alert02', severity: 'medium', message: 'Integração de pagamentos com latência elevada.' },
    { id: 'alert03', severity: 'low', message: 'Carga elevada numa instância de jogos.' },
    { id: 'alert04', severity: 'high', message: 'Falha num job operacional requer revisão.' },
  ];
  return <>
    <Card className="gradient-surface border-0 rounded-2xl mb-8"><CardHeader><CardTitle className="flex items-center gap-2 text-xl font-bold"><Shield className="text-primary" />Painel de Administrador</CardTitle></CardHeader><CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <Link href="/dashboard/team"><div className="flex items-center gap-3 p-4 rounded-xl hover:bg-muted/50 transition-colors"><div className="p-3 rounded-xl bg-green-500/20 text-green-400"><Users /></div><div><p className="text-2xl font-bold">Admin</p><p className="text-sm text-muted-foreground">Gestão de utilizadores</p></div></div></Link>
      <Link href="/dashboard/analytics"><div className="flex items-center gap-3 p-4 rounded-xl hover:bg-muted/50 transition-colors"><div className="p-3 rounded-xl bg-primary/20 text-primary"><BarChart /></div><div><p className="text-2xl font-bold">Analytics</p><p className="text-sm text-muted-foreground">Indicadores empresariais</p></div></div></Link>
      <button onClick={() => setOpen(true)} className="flex items-center gap-3 p-4 rounded-xl hover:bg-muted/50 transition-colors text-left"><div className="p-3 rounded-xl bg-destructive/20 text-destructive"><Activity /></div><div><p className="text-2xl font-bold">4</p><p className="text-sm text-muted-foreground">Alertas de Sistema</p></div></button>
      <Link href="/dashboard/settings" className="flex items-center justify-center p-4 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-semibold">Gerir Sistema</Link>
    </CardContent></Card>
    <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" />Alertas do Sistema</AlertDialogTitle><AlertDialogDescription>Alertas agregados pela plataforma.</AlertDialogDescription></AlertDialogHeader><div className="max-h-80 overflow-y-auto space-y-3 mt-4">{systemAlerts.map((alert) => <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${alert.severity === 'high' ? 'bg-red-500/10 border-red-500' : alert.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500' : 'bg-blue-500/10 border-blue-500'}`}>{alert.message}</div>)}</div><AlertDialogFooter><AlertDialogCancel>Fechar</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
};

const DailyBriefing = ({ user }: { user: DashboardUser }) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchBriefing = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tasks = getTasksForUser(user.uid).filter((task) => task.status !== 'done').map((task) => ({ id: task.id, title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.dueDate }));
        const meetings = legacyMeetings.filter((meeting) => meeting.participants.includes(user.uid)).map((meeting) => ({ id: meeting.id, title: meeting.title, description: meeting.description, date: meeting.date, time: meeting.time, duration: meeting.duration }));
        const result = await getDailyBriefing({ userName: user.displayName || user.email || 'utilizador', tasks, meetings });
        setBriefing(result.briefing);
      } catch (err) {
        console.error('Erro ao gerar resumo diário:', err);
        setError('Não foi possível carregar o resumo diário neste momento.');
      } finally {
        setIsLoading(false);
      }
    };
    void fetchBriefing();
  }, [user]);
  return <Card className="gradient-surface border-0 rounded-2xl mb-8"><CardContent className="p-6"><div className="flex items-start gap-4"><Bot className="w-8 h-8 text-primary flex-shrink-0 mt-1" /><div className="w-full"><h3 className="font-bold text-lg text-foreground">O seu Resumo Diário da OryonAI</h3>{isLoading ? <div className="flex items-center gap-2 mt-2 text-muted-foreground"><Loader2 className="animate-spin h-5 w-5" /><p>A preparar o resumo...</p></div> : error ? <p className="text-destructive mt-2" role="alert">{error}</p> : <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{briefing}</p>}</div></div></CardContent></Card>;
};

const TaskPreviewCard = ({ task }: { task: ReturnType<typeof getTasksForUser>[0] }) => <Link href="/dashboard/tasks"><div className="p-4 rounded-xl bg-card/5 hover:bg-card/10 transition-colors cursor-pointer"><div className="flex justify-between items-start mb-2"><h3 className="font-semibold text-foreground text-sm">{task.title}</h3><Badge variant="outline" className="text-xs">{task.priority}</Badge></div><p className="text-muted-foreground text-sm mb-3 line-clamp-2">{task.description}</p><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Vence: {new Date(task.dueDate).toLocaleDateString('pt-PT')}</span><span className="capitalize">{task.status === 'completed' || task.status === 'done' ? 'Concluído' : task.status === 'in-progress' ? 'Em Progresso' : 'Pendente'}</span></div></div></Link>;
const MeetingPreviewCard = ({ meeting }: { meeting: LegacyMeeting }) => <Link href="/dashboard/meetings"><div className="p-4 rounded-xl bg-card/5 hover:bg-card/10 transition-colors cursor-pointer"><div className="flex justify-between items-start mb-2"><h3 className="font-semibold text-foreground text-sm">{meeting.title}</h3><Button size="icon" variant="ghost" className="h-8 w-8 bg-green-500/20 text-green-400 hover:bg-green-500/30" aria-label="Abrir chamada"><Video className="h-4 w-4" /></Button></div><p className="text-muted-foreground text-sm mb-3 line-clamp-2">{meeting.description}</p><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{new Date(`${meeting.date}T${meeting.time}`).toLocaleString('pt-PT')}</span><span>{meeting.duration} min</span></div></div></Link>;

const PulseFeedSnippet = () => <Card className="gradient-surface border-0 rounded-2xl"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xl font-bold">Pulse da Empresa</CardTitle><Link href="/dashboard/pulse" className="text-primary/80 hover:text-primary transition-colors text-sm">Ver feed</Link></CardHeader><CardContent><div className="space-y-4">{feedItems.slice(0, 3).map((item) => <Link href="/dashboard/pulse" key={item.item_id}><div className="p-4 rounded-xl bg-card/5 hover:bg-card/10 transition-colors cursor-pointer"><p className="text-sm text-muted-foreground line-clamp-2">{item.content.text}</p></div></Link>)}</div></CardContent></Card>;

const ContextPanel = ({ user }: { user: DashboardUser }) => <aside className="p-6 h-full flex flex-col"><h2 className="text-lg font-bold text-foreground mb-4">Resumo do Dia</h2><div className="space-y-4 text-sm"><div className="flex justify-between items-center"><span className="text-muted-foreground">Tarefas:</span><span className="font-bold">{getTasksForUser(user.uid).length}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground">Acesso:</span><span className="font-bold text-primary capitalize">{user.role}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground">Empresa:</span><span className="font-bold truncate ml-4">{user.companyId}</span></div></div><h2 className="text-lg font-bold text-foreground mt-8 mb-4">Sessão</h2><div className="p-3 rounded-lg bg-card/50 text-xs text-muted-foreground break-all">UID: {user.uid}</div></aside>;

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const { identity, loading: identityLoading } = useEnterpriseIdentity();
  if (isUserLoading || identityLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="A carregar" /></div>;
  if (!user || !identity) return <div className="flex h-full items-center justify-center"><p className="text-muted-foreground">Sessão empresarial não encontrada.</p></div>;
  const dashboardUser: DashboardUser = { uid: user.uid, displayName: user.displayName || identity.email || 'Utilizador', email: identity.email, role: identity.role, companyId: identity.companyId };
  const tasks = getTasksForUser(user.uid);
  const kpis = [
    { title: 'Volume de Apostas (24h)', value: 'Dados reais', icon: BarChart, color: 'text-primary', href: '/dashboard/analytics' },
    { title: 'Utilizadores Ativos', value: 'Dados reais', icon: Users, color: 'text-green-400', href: '/dashboard/team' },
    { title: 'Minhas Tarefas', value: tasks.length, icon: ListTodo, color: 'text-yellow-400', href: '/dashboard/tasks' },
    { title: 'Perfil de Acesso', value: identity.role, icon: Target, color: 'text-primary', href: '/dashboard/settings' },
  ];
  return <div className="flex h-full"><div className="flex-grow p-6 fade-in"><div className="flex justify-between items-center mb-8"><div><h1 className="text-3xl font-bold text-foreground">Dashboard</h1><p className="text-muted-foreground mt-1">Bem-vindo de volta, {dashboardUser.displayName}</p></div></div><DailyBriefing user={dashboardUser} />{identity.role === ROLES.ADMIN && <AdminPanel />}<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">{kpis.map((kpi) => <Link href={kpi.href} key={kpi.title}><Card className="gradient-surface border-0 rounded-2xl h-full hover:bg-muted/50 transition-colors"><TooltipProvider><Tooltip><TooltipTrigger asChild><CardContent className="p-6"><div className="flex justify-between items-start"><div><p className="text-muted-foreground text-sm">{kpi.title}</p><p className="text-2xl font-bold text-foreground mt-2 capitalize">{String(kpi.value)}</p></div><div className={`p-3 rounded-xl bg-card/80 ${kpi.color}`}><kpi.icon className="h-5 w-5" /></div></div></CardContent></TooltipTrigger><TooltipContent><p>{kpi.title}</p></TooltipContent></Tooltip></TooltipProvider></Card></Link>)}</div><div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><Card className="gradient-surface border-0 rounded-2xl"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xl font-bold">Minhas Tarefas Urgentes</CardTitle><Link href="/dashboard/tasks" className="text-primary/80 hover:text-primary transition-colors text-sm">Ver todas</Link></CardHeader><CardContent><div className="space-y-4">{tasks.filter((task) => task.priority === 'high' || task.priority === 'urgent').slice(0, 3).map((task) => <TaskPreviewCard key={task.id} task={task} />)}</div></CardContent></Card><Card className="gradient-surface border-0 rounded-2xl"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xl font-bold">Próximas Reuniões</CardTitle><Link href="/dashboard/meetings" className="text-primary/80 hover:text-primary transition-colors text-sm">Ver todas</Link></CardHeader><CardContent><div className="space-y-4">{legacyMeetings.slice(0, 3).map((meeting) => <MeetingPreviewCard key={meeting.id} meeting={meeting} />)}</div></CardContent></Card></div><div className="mt-8"><PulseFeedSnippet /></div></div><div className="w-80 flex-shrink-0 gradient-surface rounded-bl-2xl border-l border-border hidden xl:block"><ContextPanel user={dashboardUser} /></div></div>;
}
