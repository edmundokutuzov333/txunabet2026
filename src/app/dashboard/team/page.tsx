
'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { users } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Mail, MapPin, Phone, MessageSquare, Video } from "lucide-react";
import { useMemo } from "react";
import Link from 'next/link';

const statusClasses: { [key: string]: { bg: string, text: string } } = {
  online: { bg: 'bg-success-500', text: 'text-success-500' },
  away: { bg: 'bg-yellow-500', text: 'text-yellow-500' },
  busy: { bg: 'bg-red-500', text: 'text-red-500' },
  dnd: { bg: 'bg-purple-500', text: 'text-purple-500' },
  offline: { bg: 'bg-slate-500', text: 'text-slate-400' },
};

const roleHierarchy = [
    "Diretor de Operações (COO)", "Diretora Financeira (CFO)", "Conselheiro Geral", "Chefe de Estratégia",
    "Administrador", "Chefe de Compliance", "Chefe de Operações", "Chefe de Dept.",
    "Controller", "Tesoureira", "Gestora de RH", "Especialista em Cibersegurança",
    "Engenheiro de DevOps", "Administradora de Sistemas", "Gestora de Projetos de Operações",
    "Oficial de Compliance Sénior", "Engenheiro de Software Sénior", "Lead Designer",
    "Especialista de Recrutamento", "Assistente Executiva", "Auditor de Compliance",
    "Analista de Risco", "Analista Financeiro", "Analista de Contabilidade",
    "Especialista em Prevenção à Lavagem de Dinheiro", "Analista Regulatório", "Analista de KYC",
    "Gestor de Conteúdo", "Analista de Marketing Digital", "Analista de Processos",
    "Gestor de Logística", "Técnica de RH", "Analista de Segurança SOC",
    "Analista de Qualidade", "Especialista em Melhoria Contínua", "Coordenador de Turno",
    "Engenheiro de Software Júnior",
];

const sortUsers = (usersToSort: typeof users) => {
    return [...usersToSort].sort((a, b) => {
        const roleAIndex = roleHierarchy.indexOf(a.role);
        const roleBIndex = roleHierarchy.indexOf(b.role);

        const effectiveRoleAIndex = roleAIndex === -1 ? Infinity : roleAIndex;
        const effectiveRoleBIndex = roleBIndex === -1 ? Infinity : roleBIndex;

        if (effectiveRoleAIndex !== effectiveRoleBIndex) {
            return effectiveRoleAIndex - effectiveRoleBIndex;
        }
        return a.name.localeCompare(b.name);
    });
};

export default function TeamPage() {
    const teamByDept = useMemo(() => {
        const grouped: { [key: string]: typeof users } = {};
        users.forEach(user => {
            if (!grouped[user.department]) {
                grouped[user.department] = [];
            }
            grouped[user.department].push(user);
        });
        
        for (const dept in grouped) {
            grouped[dept] = sortUsers(grouped[dept]);
        }

        return Object.entries(grouped).sort(([deptA], [deptB]) => {
            if (deptA === 'Administração') return -1;
            if (deptB === 'Administração') return 1;
            return deptA.localeCompare(deptB);
        });
    }, []);

  return (
    <div className="p-6 fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-8">A Nossa Equipa</h1>
        {teamByDept.map(([department, members]) => (
            <div key={department} className="mb-12">
                <h2 className="text-2xl font-semibold text-foreground mb-6 border-b-2 border-primary/20 pb-2">{department}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {members.map(user => {
                        const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${user.id}`)?.imageUrl;
                        const statusStyle = statusClasses[user.status];

                        return (
                            <Card key={user.id} className="gradient-surface border-0 rounded-2xl text-center flex flex-col items-center p-6 transition-all hover:shadow-primary/20 hover:shadow-2xl hover:-translate-y-1">
                                <CardHeader className="p-0 items-center">
                                    <div className="relative mb-4">
                                        <Avatar className="w-24 h-24 border-4 border-background">
                                            <AvatarImage src={avatar} alt={user.name} data-ai-hint="person portrait" />
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className={`absolute bottom-1 right-1 block h-4 w-4 rounded-full ${statusStyle.bg} ring-4 ring-background`}></span>
                                    </div>
                                    <CardTitle className="text-lg font-bold text-foreground">{user.name}</CardTitle>
                                    <p className={`text-sm font-medium ${statusStyle.text}`}>{user.role}</p>
                                </CardHeader>
                                <CardContent className="p-0 mt-4 text-center text-sm text-muted-foreground space-y-2 w-full break-words">
                                    <div className="flex items-center justify-center gap-2">
                                        <Mail className="w-4 h-4 text-muted-foreground/80 shrink-0" />
                                        <span>{user.email}</span>
                                    </div>
                                </CardContent>
                                <div className="mt-6 flex space-x-3">
                                    <Link href={`/dashboard/chat/direct/${user.id}`}>
                                        <Button variant="outline" size="icon" className="bg-card/50 border-border hover:bg-card rounded-full h-11 w-11">
                                            <MessageSquare />
                                        </Button>
                                    </Link>
                                     <Link href={`/dashboard/call/${user.id}?type=video`}>
                                        <Button variant="outline" size="icon" className="bg-card/50 border-border hover:bg-card rounded-full h-11 w-11">
                                            <Video />
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </div>
        ))}
    </div>
  );
}
