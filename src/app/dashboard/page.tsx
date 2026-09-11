
'use client';
import {
  Activity,
  ListTodo,
  MessagesSquare,
  Video,
  Users,
  Shield,
  TrendingUp,
  Bot,
  Loader2,
  AlertTriangle,
  BarChart,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTasksForUser, getUpcomingMeetings, users as mockUsers, feedItems, campaigns, meetings as allMeetings } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { getDailyBriefing } from '@/ai/flows/get-daily-briefing';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useUser } from '@/firebase';
import { ROLES } from '@/config/roles';


const AdminPanel = () => {
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  
  const systemAlerts = [
      { id: "alert01", severity: "high", message: "Atividade suspeita detectada na conta do utilizador 'Player123'." },
      { id: "alert02", severity: "medium", message: "API de pagamentos (Stripe) com latência elevada." },
      { id: "alert03", severity: "low", message: "Servidor de jogos de Casino a 85% de CPU." },
      { id: "alert04", severity: "high", message: "Falha na execução do job de cálculo de GGR." }
    ];

  return (
    <>
    <Card className="gradient-surface border-0 rounded-2xl mb-8">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <Shield className="text-primary"/>
                Painel de Administrador
            </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="#">
              <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="p-3 rounded-xl bg-green-500/20 text-green-400"><Users/></div>
                  <div>
                      <p className="text-2xl font-bold">1,245</p>
                      <p className="text-sm text-muted-foreground">Utilizadores Ativos</p>
                  </div>
              </div>
            </Link>
            <Link href="/dashboard/analytics">
              <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="p-3 rounded-xl bg-primary/20 text-primary"><BarChart/></div>
                  <div>
                      <p className="text-2xl font-bold">€1.2M</p>
                      <p className="text-sm text-muted-foreground">GGR (Hoje)</p>
                  </div>
              </div>
            </Link>
             <button onClick={() => setIsAlertsModalOpen(true)} className="flex items-center gap-3 p-4 rounded-xl hover:bg-muted/50 transition-colors text-left">
                  <div className="p-3 rounded-xl bg-destructive/20 text-destructive"><Activity/></div>
                  <div>
                      <p className="text-2xl font-bold">4</p>
                      <p className="text-sm text-muted-foreground">Alertas de Sistema</p>
                  </div>
              </button>
          <Link href="/dashboard/settings" className="flex items-center justify-center p-4 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-semibold">
              Gerir Sistema
          </Link>
        </CardContent>
    </Card>
     <AlertDialog open={isAlertsModalOpen} onOpenChange={setIsAlertsModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Alertas do Sistema</AlertDialogTitle>
            <AlertDialogDescription>
              Lista de alertas de sistema que requerem atenção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-80 overflow-y-auto custom-scrollbar -mr-4 pr-4 mt-4 text-sm text-foreground/90 space-y-3">
              {systemAlerts.map(alert => (
                  <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${alert.severity === 'high' ? 'bg-red-500/10 border-red-500' : alert.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500' : 'bg-blue-500/10 border-blue-500'}`}>
                      <span className="font-semibold">{alert.message}</span>
                  </div>
              ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const DailyBriefing = ({ user }: { user: any }) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUser = mockUsers.find(u => u.email === user?.email);

  useEffect(() => {
    if (!currentUser) return;

    async function fetchBriefing() {
      setIsLoading(true);
      setError(null);
      
      const tasks = getTasksForUser(currentUser.id);
      const today = new Date().toISOString().split('T')[0];
      const meetings = allMeetings.filter(m => 
          m.participants.includes(currentUser.id) && m.date === today
      );
      
      try {
        const relevantTasks = tasks
          .filter(t => t.status !== 'done')
          .map(t => ({ 
              id: t.id, 
              title: t.title, 
              description: t.description, 
              status: t.status, 
              priority: t.priority, 
              dueDate: t.dueDate 
            }));
        
        const relevantMeetings = meetings.map(m => ({ 
            id: m.id, 
            title: m.title, 
            description: m.description, 
            date: m.date, 
            time: m.time, 
            duration: m.duration 
        }));

        const response = await getDailyBriefing({
          userName: currentUser.name,
          tasks: relevantTasks,
          meetings: relevantMeetings,
        });

        setBriefing(response.briefing);

      } catch (err: any) {
        console.error("Erro ao gerar resumo diário:", err);
        if (typeof err.message === 'string' && (err.message.includes('503') || err.message.includes('overloaded'))) {
            setError("A OryonAI está com um volume elevado de pedidos. Por favor, tente novamente dentro de momentos.");
        } else {
            setError("Não foi possível carregar o seu resumo diário. A equipa de engenharia foi notificada.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchBriefing();
  }, [currentUser]);

  return (
     <Card className="gradient-surface border-0 rounded-2xl mb-8">
        <CardContent className="p-6">
           <div className="flex items-start gap-4">
            <Bot className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div className='w-full'>
              <h3 className="font-bold text-lg text-foreground">O seu Resumo Diário da OryonAI</h3>
               {isLoading ? (
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                    <Loader2 className="animate-spin h-5 w-5" /> 
                    <p>A OryonAI está a preparar o seu dia...</p>
                </div>
              ) : error ? (
                <p className="text-red-400 mt-2">{error}</p>
              ) : (
                <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{briefing}</p>
              )}
            </div>
          </div>
        </CardContent>
     </Card>
  )
}

const TaskPreviewCard = ({ task }: { task: (ReturnType<typeof getTasksForUser>)[0] }) => {
  const priorityStyles: { [key: string]: string } = {
    high: 'bg-destructive/20 text-destructive-foreground',
    medium: 'bg-accent-500/20 text-accent-500',
    low: 'bg-green-500/20 text-green-400',
    urgent: 'bg-destructive/20 text-destructive-foreground',
  };
  return (
    <Link href="/dashboard/tasks">
      <div className="p-4 rounded-xl bg-card/5 hover:bg-card/10 transition-colors cursor-pointer">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-foreground text-sm" dangerouslySetInnerHTML={{ __html: task.title }}></h3>
          <Badge variant="outline" className={`text-xs ${priorityStyles[task.priority]}`}>{task.priority}</Badge>
        </div>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2" dangerouslySetInnerHTML={{ __html: task.description }}></p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Vence: {new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
          <span className="capitalize">{task.status === 'completed' ? 'Concluído' : task.status === 'in-progress' ? 'Em Progresso' : 'Pendente'}</span>
        </div>
      </div>
    </Link>
  );
};

const MeetingPreviewCard = ({ meeting }: { meeting: (ReturnType<typeof getUpcomingMeetings>)[0] }) => (
  <Link href="/dashboard/meetings">
    <div className="p-4 rounded-xl bg-card/5 hover:bg-card/10 transition-colors cursor-pointer">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-foreground text-sm" dangerouslySetInnerHTML={{ __html: meeting.title }}></h3>
        <Button size="icon" variant="ghost" className="h-8 w-8 bg-green-500/20 text-green-400 hover:bg-green-500/30">
          <Video className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-muted-foreground text-sm mb-3 line-clamp-2" dangerouslySetInnerHTML={{ __html: meeting.description }}></p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{new Date(`${meeting.date}T${meeting.time}`).toLocaleString('pt-BR')}</span>
        <span>{meeting.duration} min</span>
      </div>
    </div>
  </Link>
);


const PulseFeedSnippet = () => {
    const feedSnippet = feedItems.slice(0, 3);
    return (
        <Card className="gradient-surface border-0 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-bold">Pulse da Empresa</CardTitle>
              <Link href="/dashboard/pulse" className="text-primary/80 hover:text-primary transition-colors text-sm">Ver feed</Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feedSnippet.map(item => {
                    const author = mockUsers.find(u => u.id === item.author_user_id)
                    return (
                        <Link href="/dashboard/pulse" key={item.item_id}>
                          <div className="p-4 rounded-xl bg-card/5 hover:bg-card/10 transition-colors cursor-pointer">
                             <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={author ? PlaceHolderImages.find(p => p.id === `user-avatar-${author.id}`)?.imageUrl : ''} />
                                    <AvatarFallback>{author?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-semibold text-foreground">{author?.name || 'Sistema'}</span>
                             </div>
                             <p className="text-sm text-muted-foreground line-clamp-2">{item.content.text.replace(/<[^>]*>?/gm, '')}</p>
                          </div>
                        </Link>
                    )
                })}
              </div>
            </CardContent>
          </Card>
    )
}

const ContextPanel = () => {
  const onlineUsers = mockUsers.filter(u => u.status === 'online');
  const { user } = useUser();
  
  if (!user) {
    return <div className="p-6 h-full flex flex-col"><Loader2 className="h-5 w-5 animate-spin"/></div>
  }

  const currentUserData = mockUsers.find(u => u.email === user.email);
  if (!currentUserData) {
      return <div className="p-6 h-full flex flex-col"><p className="text-muted-foreground">Utilizador não encontrado.</p></div>
  }

  const tasks = getTasksForUser(currentUserData.id);
  const today = new Date().toISOString().split('T')[0];
  const meetings = allMeetings.filter(m => m.participants.includes(currentUserData.id) && m.date === today);

  return (
    <div className="p-6 h-full flex flex-col">
        <h2 className="text-lg font-bold text-foreground mb-4">Resumo do Dia</h2>
        <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tarefas para hoje:</span>
                <span className="font-bold text-foreground">{tasks.filter(t => t.dueDate === today).length}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Reuniões:</span>
                <span className="font-bold text-foreground">{meetings.length}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mercados abertos:</span>
                <span className="font-bold text-primary">1,289</span>
            </div>
        </div>
        
        <h2 className="text-lg font-bold text-foreground mt-8 mb-4">Equipa Online</h2>
        <div className="space-y-3 flex-grow overflow-y-auto custom-scrollbar -mr-3 pr-3">
            {onlineUsers.map(user => {
              const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${user.id}`)?.imageUrl;
              return (
                <Link href={`/dashboard/team`} key={user.id}>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={avatar} alt={user.name} data-ai-hint="person portrait" />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-background"></span>
                      </div>
                      <div>
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.role}</p>
                      </div>
                  </div>
                </Link>
              )
            })}
        </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useUser();

  const kpis = [
      { title: 'Volume de Apostas (24h)', value: '€2.3M', icon: BarChart, color: 'text-primary', href: '/dashboard/analytics' },
      { title: 'Utilizadores Ativos', value: '1,245', icon: Users, color: 'text-green-400', href: '/dashboard/analytics' },
      { title: 'Novas Tarefas', value: 5, icon: ListTodo, color: 'text-yellow-400', href: '/dashboard/tasks' },
      { title: 'Metas do Q4', value: '78%', icon: Target, color: 'text-primary', href: '#', tooltip: 'Calculado com base no progresso dos projetos-chave.' },
  ]

  if (!user) {
      return (
        <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
        </div>
      )
  }
  
  const currentUserData = mockUsers.find(u => u.email === user.email);
  if (!currentUserData) {
      return (
        <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Utilizador não encontrado no sistema.</p>
        </div>
      )
  }

  const tasks = getTasksForUser(currentUserData.id);
  const today = new Date().toISOString().split('T')[0];
  const meetings = allMeetings.filter(m => m.participants.includes(currentUserData.id) && m.date === today);

  return (
    <div className="flex h-full">
      <div className="flex-grow p-6 fade-in">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Bem-vindo de volta, {user.displayName}</p>
          </div>
        </div>

        <DailyBriefing user={user} />
        
        {currentUserData.role === ROLES.ADMIN && <AdminPanel />}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpis.map((kpi) => (
            <Link href={kpi.href} key={kpi.title}>
              <Card className="gradient-surface border-0 rounded-2xl h-full hover:bg-muted/50 transition-colors">
                 <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-muted-foreground text-sm">{kpi.title}</p>
                            <p className="text-3xl font-bold text-foreground mt-2">{kpi.value}</p>
                          </div>
                          <div className={`p-3 rounded-xl bg-card/80 ${kpi.color}`}>
                            <kpi.icon className="h-5 w-5" />
                          </div>
                        </div>
                      </CardContent>
                    </TooltipTrigger>
                    {kpi.tooltip && <TooltipContent><p>{kpi.tooltip}</p></TooltipContent>}
                  </Tooltip>
                </TooltipProvider>
              </Card>
            </Link>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="gradient-surface border-0 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-bold">Minhas Tarefas Urgentes</CardTitle>
              <Link href="/dashboard/tasks" className="text-primary/80 hover:text-primary transition-colors text-sm">Ver todas</Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').slice(0,3).map(task => <TaskPreviewCard key={task.id} task={task} />)}
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-surface border-0 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-bold">Próximas Reuniões</CardTitle>
              <Link href="/dashboard/meetings" className="text-primary/80 hover:text-primary transition-colors text-sm">Ver todas</Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {meetings.slice(0,3).map(meeting => <MeetingPreviewCard key={meeting.id} meeting={meeting} />)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
            <PulseFeedSnippet />
        </div>

      </div>
      <aside className="w-80 flex-shrink-0 gradient-surface rounded-bl-2xl border-l border-border hidden xl:block">
        <ContextPanel />
      </aside>
    </div>
  );
}
