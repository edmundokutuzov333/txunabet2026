
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { campaigns as initialCampaigns } from '@/lib/data';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { users } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';

const campaignStatuses = ['Ideação', 'Design & Copy', 'Implementação', 'Ativa', 'Análise', 'Concluída'];

const statusStyles: { [key: string]: string } = {
  'Ideação': 'border-slate-500',
  'Design & Copy': 'border-blue-500',
  'Implementação': 'border-purple-500',
  'Ativa': 'border-green-500 animate-pulse',
  'Análise': 'border-yellow-500',
  'Concluída': 'border-gray-600 opacity-70',
};


const CampaignCard = ({ campaign }: { campaign: typeof initialCampaigns[0] }) => {
  const { toast } = useToast();
  const spentPercentage = (campaign.spent / campaign.budget) * 100;
  const assignedUsers = campaign.members.map(userId => users.find(u => u.id === userId)).filter(Boolean);

  return (
    <Link href={`/dashboard/campaigns/${campaign.id}`}>
        <Card className="gradient-surface border-0 rounded-2xl mb-4 hover:shadow-primary/20 hover:-translate-y-1 transition-all cursor-pointer">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">{campaign.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}</p>

                <div className="text-sm space-y-2 mb-4">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Adesões:</span>
                        <span className="font-bold text-foreground">{campaign.kpis.signups.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">CPA:</span>
                        <span className="font-bold text-foreground">€{campaign.kpis.cpa.toFixed(2)}</span>
                    </div>
                </div>
                
                <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Orçamento</span>
                        <span>€{campaign.spent.toLocaleString()} / €{campaign.budget.toLocaleString()}</span>
                    </div>
                    <Progress value={spentPercentage} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between mt-4">
                    <div className="flex -space-x-2">
                         {assignedUsers.slice(0, 3).map(user => {
                            if (!user) return null;
                            const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${user.id}`)?.imageUrl;
                            return (
                                <Avatar key={user.id} className="h-6 w-6 border-2 border-background" title={user.name}>
                                    <AvatarImage src={avatar} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            );
                        })}
                        {assignedUsers.length > 3 && (
                             <Avatar className="h-6 w-6 border-2 border-background">
                                <AvatarFallback className="text-xs">+{assignedUsers.length - 3}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className={`capitalize ${campaign.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-primary/10 text-primary/90'}`}>{campaign.status}</Badge>
                </div>
            </CardContent>
        </Card>
    </Link>
  );
};


const CampaignColumn = ({ title, campaigns }: { title: string, campaigns: typeof initialCampaigns }) => {
    return (
        <div className="flex flex-col h-full bg-card/30 rounded-lg">
            <div className={`flex-shrink-0 p-3 border-l-4 ${statusStyles[title] || 'border-gray-400'}`}>
                <h2 className="text-base font-semibold text-foreground">{title} <span className="text-sm text-muted-foreground font-normal">({campaigns.length})</span></h2>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto custom-scrollbar p-3">
                {campaigns.map(campaign => <CampaignCard key={campaign.id} campaign={campaign} />)}
                {campaigns.length === 0 && <div className="text-sm text-muted-foreground text-center pt-10 px-4">Nenhuma campanha nesta fase.</div>}
            </div>
        </div>
    )
}

export default function CampaignsPage() {
    const { toast } = useToast();

    const handleNewCampaign = () => {
        toast({
            title: "Funcionalidade em desenvolvimento",
            description: "A criação de novas campanhas estará disponível em breve.",
        });
    }

    const campaignsByStatus = campaignStatuses.map(status => ({
        title: status,
        campaigns: initialCampaigns.filter(c => c.status.toLowerCase().replace(/ /g, '_') === status.toLowerCase().replace(/ & /g, '_and_').replace(/ /g, '_'))
    }));

    return (
        <div className="p-6 fade-in h-full flex flex-col">
            <div className="flex justify-between items-center mb-8 flex-shrink-0">
                <h1 className="text-3xl font-bold text-foreground">Gestão de Campanhas</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 flex-grow overflow-hidden">
                {campaignsByStatus.map(group => (
                    <CampaignColumn key={group.title} title={group.title} campaigns={group.campaigns} />
                ))}
            </div>
        </div>
    );
}
