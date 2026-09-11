
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Shield, Smartphone, Monitor, Key, LogOut } from 'lucide-react';
import { useState } from 'react';

const securityLogs = [
    { id: 1, event: "Sessão iniciada", ip: "192.168.1.10", location: "Maputo, MZ", time: "2024-11-18 14:20", device: "Chrome no Windows", status: "Success" },
    { id: 2, event: "Alteração de password", ip: "192.168.1.10", location: "Maputo, MZ", time: "2024-11-17 09:45", device: "Chrome no Windows", status: "Success" },
    { id: 3, event: "Tentativa de login falhada", ip: "203.0.113.25", location: "Lagos, NG", time: "2024-11-16 22:10", device: "Firefox no Linux", status: "Failed" },
];

const activeSessions = [
    { id: 1, device: "Windows Desktop", browser: "Chrome", location: "Maputo, MZ", ip: "192.168.1.10", lastActive: "Agora", isCurrent: true, icon: <Monitor className="w-5 h-5 text-primary"/> },
    { id: 2, device: "iPhone 15 Pro", browser: "Safari", location: "Maputo, MZ", ip: "192.168.1.15", lastActive: "há 2 horas", isCurrent: false, icon: <Smartphone className="w-5 h-5 text-primary"/> },
];

export default function SecurityPage() {
    const { toast } = useToast();
    const [is2faEnabled, setIs2faEnabled] = useState(true);

    const handleSavePassword = (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: "Password alterada com sucesso!",
            description: "A sua nova password foi definida. Use-a no próximo login.",
        });
    }

    const handleLogoutSession = (deviceId: number) => {
         toast({
            title: "Sessão terminada",
            description: "A sessão foi terminada com sucesso.",
        });
        // In a real app, you would filter out the session.
    }

    return (
        <div className="p-6 fade-in">
            <h1 className="text-3xl font-bold text-foreground mb-8">Segurança</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Column */}
                <div className="space-y-8">
                    <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Shield className="text-primary"/>Autenticação de Dois Fatores (2FA)</CardTitle>
                            <CardDescription>Adicione uma camada extra de segurança à sua conta.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg">
                                <Label htmlFor="2fa-switch" className="flex flex-col gap-1 cursor-pointer">
                                    <span>Ativar Autenticação de Dois Fatores</span>
                                    <span className="text-xs text-muted-foreground">Será solicitado um código via app autenticador.</span>
                                </Label>
                                <Switch id="2fa-switch" checked={is2faEnabled} onCheckedChange={setIs2faEnabled} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle>Sessões Ativas</CardTitle>
                            <CardDescription>Dispositivos atualmente com sessão iniciada na sua conta.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeSessions.map(session => (
                                <div key={session.id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {session.icon}
                                        <div>
                                            <p className="font-semibold text-foreground">{session.device} <span className="text-muted-foreground">({session.browser})</span></p>
                                            <p className="text-xs text-muted-foreground">{session.location} • {session.ip}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {session.isCurrent ? 
                                            <span className="text-xs font-semibold text-success-500">Sessão Atual</span> :
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive" onClick={() => handleLogoutSession(session.id)}><LogOut className="w-4 h-4"/></Button>
                                        }
                                        <p className="text-xs text-muted-foreground">{session.lastActive}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
                {/* Right Column */}
                <div className="space-y-8">
                     <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Key className="text-primary"/>Alterar Password</CardTitle>
                            <CardDescription>Para a sua segurança, use uma password forte e única.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4" onSubmit={handleSavePassword}>
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">Password Atual</Label>
                                    <Input id="current-password" type="password" placeholder="••••••••" className="bg-card border-border"/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">Nova Password</Label>
                                    <Input id="new-password" type="password" placeholder="••••••••" className="bg-card border-border"/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirmar Nova Password</Label>
                                    <Input id="confirm-password" type="password" placeholder="••••••••" className="bg-card border-border"/>
                                </div>
                                <Button type="submit" className="w-full btn-primary-gradient">Salvar Nova Password</Button>
                            </form>
                        </CardContent>
                    </Card>
                    
                    <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle>Logs de Segurança</CardTitle>
                            <CardDescription>Histórico de eventos de segurança da sua conta.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-border hover:bg-transparent">
                                        <TableHead>Evento</TableHead>
                                        <TableHead>Localização</TableHead>
                                        <TableHead className="text-right">Data</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {securityLogs.map(log => (
                                        <TableRow key={log.id} className="border-b-border/50 hover:bg-muted/50">
                                            <TableCell>
                                                <span className={`mr-2 h-2 w-2 rounded-full inline-block ${log.status === 'Success' ? 'bg-success-500' : 'bg-destructive'}`}></span>
                                                {log.event}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{log.location}</TableCell>
                                            <TableCell className="text-muted-foreground text-right">{log.time.split(' ')[1]}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
