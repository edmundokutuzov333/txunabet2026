
'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Bell, Key, Shield, User, Activity, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const currentUser = getCurrentUser();
const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${currentUser.id}`)?.imageUrl;

export default function ProfilePage() {
    const { toast } = useToast();

    const handleSave = (section: string) => {
        toast({
            title: `Alterações Salvas`,
            description: `As suas informações de ${section} foram atualizadas.`,
        });
    }

  return (
    <div className="p-6 fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-8">Meu Perfil</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Coluna Esquerda - Perfil e Segurança */}
            <div className="lg:col-span-2 space-y-8">
                <Card className="gradient-surface border-0 rounded-2xl">
                    <CardHeader className="flex flex-row items-center gap-6">
                         <div className="relative">
                            <Avatar className="h-24 w-24 border-4 border-primary">
                                <AvatarImage src={avatar} alt={currentUser.name} data-ai-hint="person portrait" />
                                <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <Button size="icon" className="absolute bottom-0 right-0 h-8 w-8 rounded-full btn-primary-gradient">
                                <Edit3 className="h-4 w-4"/>
                            </Button>
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold">{currentUser.name}</CardTitle>
                            <CardDescription className="text-muted-foreground">{currentUser.role} • {currentUser.department}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input id="name" defaultValue={currentUser.name} className="bg-card border-border"/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" defaultValue={currentUser.email} disabled className="bg-card border-border disabled:opacity-70"/>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea id="bio" defaultValue={currentUser.bio} className="bg-card border-border" rows={3}/>
                            </div>
                            <div className="flex justify-end">
                                <Button className="btn-primary-gradient" onClick={() => handleSave('perfil')}>Salvar Alterações</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="gradient-surface border-0 rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield className="text-primary"/> Segurança</CardTitle>
                        <CardDescription>Gestão da sua password e autenticação.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                           <div>
                             <h4 className="font-semibold">Alterar Password</h4>
                             <p className="text-sm text-muted-foreground">Recomenda-se a alteração periódica.</p>
                           </div>
                           <Button variant="outline" className="bg-card border-border">Alterar</Button>
                        </div>
                         <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                           <div>
                             <h4 className="font-semibold">Autenticação de 2 Fatores (2FA)</h4>
                             <p className="text-sm text-muted-foreground">Proteja a sua conta com uma camada extra de segurança.</p>
                           </div>
                           <Switch defaultChecked={currentUser.permissions.includes('2fa')} aria-label="Toggle 2FA" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Coluna Direita - Notificações e Atividade */}
            <div className="lg:col-span-1 space-y-8">
                 <Card className="gradient-surface border-0 rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bell className="text-primary"/>Notificações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="email-notifications" className="flex flex-col">
                                <span>Notificações por Email</span>
                                <span className="text-xs text-muted-foreground">Receba alertas importantes no seu email.</span>
                            </Label>
                            <Switch id="email-notifications" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="push-notifications" className="flex flex-col">
                                <span>Notificações Push</span>
                                <span className="text-xs text-muted-foreground">Alertas em tempo real no seu browser.</span>
                            </Label>
                            <Switch id="push-notifications" defaultChecked />
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="sound-notifications" className="flex flex-col">
                                <span>Sons de Notificação</span>
                                <span className="text-xs text-muted-foreground">Ativar sons para novos alertas.</span>
                            </Label>
                            <Switch id="sound-notifications" />
                        </div>
                    </CardContent>
                </Card>

                 <Card className="gradient-surface border-0 rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Activity className="text-primary"/>Atividade Recente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-start gap-3 text-sm">
                            <div className="bg-primary/20 text-primary p-2 rounded-full"><User className="w-4 h-4"/></div>
                            <p className="text-muted-foreground">Você atualizou as odds para o jogo <span className="font-semibold text-foreground">Benfica vs Porto</span>.</p>
                        </div>
                         <div className="flex items-start gap-3 text-sm">
                            <div className="bg-green-500/20 text-green-400 p-2 rounded-full"><Key className="w-4 h-4"/></div>
                            <p className="text-muted-foreground">Sessão iniciada a partir de um novo dispositivo.<span className="block text-xs text-muted-foreground">há 1 dia</span></p>
                        </div>
                         <div className="flex items-start gap-3 text-sm">
                            <div className="bg-yellow-400/20 text-yellow-400 p-2 rounded-full"><Bell className="w-4 h-4"/></div>
                            <p className="text-muted-foreground">Você foi mencionado por <span className="font-semibold text-foreground">Maria Silva</span> no canal de Marketing.<span className="block text-xs text-muted-foreground">há 3 dias</span></p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
