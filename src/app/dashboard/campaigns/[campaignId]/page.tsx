
'use client';
import {
  getCampaignById,
  users,
  getTasksForUser,
  getWorkspaceFiles,
} from '@/lib/data';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  DollarSign,
  File,
  Flag,
  Target,
  Users,
  AlertTriangle
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo } from 'react';

const TaskCard = ({ task }: { task: ReturnType<typeof getTasksForUser>[0] }) => (
    <div className="p-4 bg-card/50 rounded-lg hover:bg-card/80 transition-colors">
        <h4 className="font-semibold text-foreground">{task.title}</h4>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Prazo: {new Date(task.dueDate).toLocaleDateString()}</span>
            <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'secondary' : 'outline'} className="capitalize">{task.priority}</Badge>
        </div>
    </div>
);

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const campaign = getCampaignById(campaignId);

  const campaignMembers = useMemo(
    () => (campaign ? users.filter((u) => campaign.members.includes(u.id)) : []),
    [campaign]
  );
  const campaignTasks = useMemo(
    () => getTasksForUser(1).filter(t => t.contextId === campaignId), // Mocking user 1 for now
    [campaignId]
  )

  if (!campaign) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">Campanha não encontrada</h1>
        <p className="text-muted-foreground">
          A campanha que está a tentar aceder não existe.
        </p>
        <Link href="/dashboard/campaigns">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Campanhas
          </Button>
        </Link>
      </div>
    );
  }

  const spentPercentage = (campaign.spent / campaign.budget) * 100;
  const kpis = [
      { title: 'Adesões (Signups)', value: campaign.kpis.signups.toLocaleString() },
      { title: 'Custo por Aquisição (CPA)', value: `€${campaign.kpis.cpa.toFixed(2)}` },
      { title: 'GGR Gerado', value: `€${campaign.kpis.ggr?.toLocaleString() || 'N/A'}` },
  ];

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" /> {campaign.name}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-prose">
            {campaign.description}
          </p>
        </div>
        <div className="flex items-center gap-4">
            <Badge variant="secondary" className={`capitalize text-base px-4 py-1 ${campaign.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-primary/10 text-primary/90'}`}>
                {campaign.status}
            </Badge>
        </div>
      </div>

       <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted/50">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="tasks">Tarefas ({campaignTasks.length})</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="files">Ficheiros</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="gradient-surface border-0 rounded-2xl">
                             <CardHeader><CardTitle>Performance da Campanha (KPIs)</CardTitle></CardHeader>
                             <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {kpis.map(kpi => (
                                    <div key={kpi.title} className="p-4 bg-card/50 rounded-lg">
                                        <p className="text-sm text-muted-foreground">{kpi.title}</p>
                                        <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                                    </div>
                                ))}
                             </CardContent>
                        </Card>
                        <Card className="gradient-surface border-0 rounded-2xl">
                             <CardHeader><CardTitle>Riscos Associados</CardTitle></CardHeader>
                             <CardContent>
                                <div className="flex items-start gap-3 text-amber-400 p-4 bg-amber-500/10 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 mt-1 shrink-0"/>
                                    <p className="text-foreground/90">{campaign.risks}</p>
                                </div>
                             </CardContent>
                        </Card>
                    </div>
                    {/* Right Column */}
                    <div className="space-y-6">
                         <Card className="gradient-surface border-0 rounded-2xl">
                            <CardHeader><CardTitle>Detalhes da Campanha</CardTitle></CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4"/> Período</span>
                                    <span className="font-medium">{new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}</span>
                                </div>
                                 <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span className="flex items-center gap-2"><DollarSign className="w-4 h-4"/> Orçamento</span>
                                        <span>€{campaign.spent.toLocaleString()} / €{campaign.budget.toLocaleString()}</span>
                                    </div>
                                    <Progress value={spentPercentage} className="h-2"/>
                                </div>
                            </CardContent>
                         </Card>
                        <Card className="gradient-surface border-0 rounded-2xl">
                            <CardHeader><CardTitle>Equipa Responsável</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {campaignMembers.map(member => (
                                <div key={member.id} className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                    <AvatarImage src={PlaceHolderImages.find(p => p.id === `user-avatar-${member.id}`)?.imageUrl} />
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                    <p className="font-semibold text-foreground">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">{member.role}</p>
                                    </div>
                                </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                 </div>
            </TabsContent>
             <TabsContent value="tasks">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaignTasks.length > 0 ? (
                        campaignTasks.map(task => <TaskCard key={task.id} task={task}/>)
                    ) : (
                        <p className="col-span-full text-center text-muted-foreground py-10">Nenhuma tarefa associada a esta campanha.</p>
                    )}
                 </div>
             </TabsContent>
            <TabsContent value="analytics">
                <Card className="gradient-surface border-0 rounded-2xl">
                    <CardHeader><CardTitle>Análise de Performance (Em Breve)</CardTitle></CardHeader>
                    <CardContent className="h-80 flex items-center justify-center">
                        <p className="text-muted-foreground">Gráficos de performance da campanha aparecerão aqui.</p>
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="files">
                <Card className="gradient-surface border-0 rounded-2xl">
                    <CardHeader><CardTitle>Ficheiros da Campanha (Em Breve)</CardTitle></CardHeader>
                    <CardContent className="h-80 flex items-center justify-center">
                        <p className="text-muted-foreground">Ficheiros e criativos associados à campanha aparecerão aqui.</p>
                    </CardContent>
                </Card>
            </TabsContent>
       </Tabs>
    </div>
  );
}
