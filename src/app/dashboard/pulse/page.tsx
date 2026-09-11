
'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { feedItems, users } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import {
  MessageCircle,
  ThumbsUp,
  MoreHorizontal,
  Bookmark,
  Radio,
  Image as ImageIcon,
  Video,
  ListOrdered,
  Megaphone,
  Sparkles,
  Rocket,
  UserPlus,
  BrainCircuit,
  PartyPopper,
  Handshake,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import Image from 'next/image';

const reactionIcons = {
    like: ThumbsUp,
    celebrate: PartyPopper,
    idea: BrainCircuit,
    thanks: Handshake,
}
const eventIcons = {
    'project.created': Rocket,
    'user.joined': UserPlus,
    'project.milestone.completed': Sparkles,
    'market.opened': TrendingUp,
    'risk.alert': AlertTriangle,
}


const SystemEventCard = ({ item }: { item: any }) => {
    const eventType = item.system_event_details.event;
    const Icon = eventIcons[eventType as keyof typeof eventIcons] || Megaphone;

    return (
        <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="p-3 bg-muted rounded-full">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
                <p className="text-sm text-foreground/90" dangerouslySetInnerHTML={{ __html: item.content.text }}></p>
                <span className="text-xs text-muted-foreground/80">{new Date(item.timestamp).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    )
}

const KudosCard = ({ item }: { item: any }) => {
    return (
        <Card className="gradient-surface border-yellow-400/50 rounded-2xl overflow-hidden">
            <CardContent className="p-6 text-center">
                <PartyPopper className="w-12 h-12 text-yellow-400 mx-auto mb-4"/>
                <p className="text-lg text-foreground" dangerouslySetInnerHTML={{ __html: item.content.text }}></p>
                 <div className="mt-6 flex justify-center items-center gap-4">
                    {item.reactions.map((reaction: any, index: number) => {
                        const user = users.find(u => u.id === reaction.user_id);
                        if (!user) return null;
                        const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${user.id}`)?.imageUrl;
                        return (
                            <Avatar key={index} className="h-8 w-8">
                                <AvatarImage src={avatar} alt={user.name} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
};


const FeedItemCard = ({ item }: { item: any }) => {
  const author = users.find(u => u.id === item.author_user_id);
  const authorAvatar = author ? PlaceHolderImages.find(p => p.id === `user-avatar-${author.id}`)?.imageUrl : '';
  const feedImage = item.content.media_urls?.[0] ? PlaceHolderImages.find(p => p.id === item.content.media_urls[0].url) : null;


  if (item.item_type === 'system_event') {
      return <SystemEventCard item={item} />;
  }
   if (item.item_type === 'kudos') {
      return <KudosCard item={item} />;
  }

  return (
    <Card className="gradient-surface border-0 rounded-2xl">
      <CardHeader className="p-6">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={authorAvatar} alt={author?.name} />
            <AvatarFallback>{author?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{author?.name}</p>
            <p className="text-xs text-muted-foreground">{author?.role} • {new Date(item.timestamp).toLocaleString('pt-PT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {item.is_pinned && <Bookmark className="w-4 h-4 text-yellow-400" />}
            <Button variant="ghost" size="icon"><MoreHorizontal className="w-5 h-5"/></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="text-foreground/90 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: item.content.text.replace(/#(\w+)/g, '<span class="text-primary font-semibold">#$1</span>').replace(/@(\w+\s\w+)/g, '<span class="text-cyan-400 font-semibold">@$1</span>') }}></div>
        {feedImage && (
            <div className="mt-4 rounded-lg overflow-hidden border border-border">
                <Image 
                  src={feedImage.imageUrl}
                  alt={feedImage.description}
                  width={800} 
                  height={400} 
                  className="w-full object-cover"
                  data-ai-hint={feedImage.imageHint}
                />
            </div>
        )}
      </CardContent>
       <div className="px-6 pb-4 flex justify-between items-center border-t border-border pt-2">
            <div className="flex items-center gap-2">
                {Object.entries(reactionIcons).map(([key, Icon]) => {
                     const count = item.reactions.filter((r:any) => r.reaction_type === key).length;
                     if(count === 0 && key !== 'like') return null;

                    return (
                        <Button key={key} variant="ghost" size="sm" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                            <Icon className={cn("w-4 h-4", count > 0 && 'text-primary')}/> 
                            <span className="text-xs">{count > 0 && count}</span>
                        </Button>
                    )
                })}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                 <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-muted-foreground">
                    <MessageCircle className="w-4 h-4"/> 
                    <span>{item.comments_count} comentários</span>
                 </Button>
            </div>
       </div>
    </Card>
  );
};


export default function PulsePage() {
    const popularHashtags = ['#sportsbook', '#risco', '#marketingdigital', '#casino', '#tecnologia', '#performance'];
  return (
    <div className="p-6 fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
            <Radio className="w-8 h-8 text-primary"/>
            Oryon Pulse
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            {/* Coluna Principal */}
            <div className="lg:col-span-3 space-y-6">
                {/* Criar Publicação */}
                <Card className="gradient-surface border-0 rounded-2xl">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={PlaceHolderImages.find(p => p.id === 'user-avatar-1')?.imageUrl} alt="Admin" />
                                <AvatarFallback>A</AvatarFallback>
                            </Avatar>
                            <Input placeholder="Partilhe uma atualização, faça uma pergunta ou crie uma sondagem..." className="bg-card/50 border-border h-12 rounded-full px-6" />
                        </div>
                        <div className="flex justify-end gap-2 mt-3 pr-4">
                            <Button variant="ghost" size="sm"><ImageIcon className="w-4 h-4 mr-2"/>Imagem</Button>
                            <Button variant="ghost" size="sm"><Video className="w-4 h-4 mr-2"/>Vídeo</Button>
                            <Button variant="ghost" size="sm"><ListOrdered className="w-4 h-4 mr-2"/>Sondagem</Button>
                            <Button className="btn-primary-gradient rounded-full px-6">Publicar</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Feed */}
                {feedItems.map(item => <FeedItemCard key={item.item_id} item={item} />)}
            </div>

            {/* Coluna Lateral */}
            <div className="lg:col-span-1 space-y-6 sticky top-24">
                <Card className="gradient-surface border-0 rounded-2xl">
                    <CardHeader>
                        <CardTitle>Filtros do Feed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm">
                            <li><Button variant="ghost" className="w-full justify-start text-primary bg-primary/10">Para Si</Button></li>
                            <li><Button variant="ghost" className="w-full justify-start">Anúncios</Button></li>
                            <li><Button variant="ghost" className="w-full justify-start">Kudos & Reconhecimento</Button></li>
                            <li><Button variant="ghost" className="w-full justify-start">Engenharia</Button></li>
                            <li><Button variant="ghost" className="w-full justify-start">Design</Button></li>
                        </ul>
                    </CardContent>
                </Card>
                <Card className="gradient-surface border-0 rounded-2xl">
                    <CardHeader>
                        <CardTitle>Hashtags Populares</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {popularHashtags.map(tag => (
                            <Button key={tag} variant="outline" size="sm" className="rounded-full bg-card/50">
                                {tag}
                            </Button>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
