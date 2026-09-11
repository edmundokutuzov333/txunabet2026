
'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { users } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Target, Users, Folder, TrendingUp, DollarSign, CheckCircle } from "lucide-react";
import Link from "next/link";

type Department = {
    id: number;
    name: string;
    slug: string;
    head: number;
    memberCount: number;
    budget: number;
    projects: number;
    description: string;
    goals: string[];
}

type Member = typeof users[0];
type Project = {
    id: number;
    name: string;
    progress: number;
    status: string;
};


export default function DepartmentPageLayout({ department, members, projects }: { department: Department, members: Member[], projects: Project[] }) {
    const headUser = users.find(u => u.id === department.head);

    return (
        <div className="p-6 fade-in">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{department.name}</h1>
                    <p className="text-muted-foreground mt-2 max-w-prose">{department.description}</p>
                </div>
                {headUser && (
                     <div className="text-right">
                         <p className="text-sm text-muted-foreground">Chefe de Departamento</p>
                         <p className="text-lg font-semibold text-primary">{headUser.name}</p>
                     </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Link href={`/dashboard/departments/${department.slug}/team`}>
                    <Card className="gradient-surface border-0 rounded-2xl hover:bg-muted/50 transition-colors h-full">
                        <CardHeader className="flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Membros</CardTitle>
                            <Users className="w-5 h-5 text-primary/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{department.memberCount}</div>
                        </CardContent>
                    </Card>
                </Link>
                 <Link href="/dashboard/projects">
                    <Card className="gradient-surface border-0 rounded-2xl hover:bg-muted/50 transition-colors h-full">
                        <CardHeader className="flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Projetos Ativos</CardTitle>
                            <Folder className="w-5 h-5 text-primary/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{department.projects}</div>
                        </CardContent>
                    </Card>
                </Link>
                 <Card className="gradient-surface border-0 rounded-2xl">
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Anual</CardTitle>
                        <DollarSign className="w-5 h-5 text-primary/70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{department.budget.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Folder className="text-primary"/>Projetos do Departamento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {projects.map(p => (
                                <Link href={`/dashboard/projects/${p.id}`} key={p.id}>
                                    <div className="p-4 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="font-semibold text-foreground">{p.name}</h3>
                                            <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className={p.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}>{p.status === 'active' ? 'Ativo' : 'Planeamento'}</Badge>
                                        </div>
                                        <Progress value={p.progress} className="h-2"/>
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                     <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Target className="text-primary"/>Metas para Q4 2024</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {department.goals.map((goal, i) => (
                               <div key={i} className="flex items-start gap-3">
                                   <CheckCircle className="w-5 h-5 text-green-400 mt-1 shrink-0"/>
                                   <p className="text-foreground/90">{goal}</p>
                               </div>
                           ))}
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-1">
                    <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users className="text-primary"/>Membros da Equipa</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {members.map(member => {
                                 const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${member.id}`)?.imageUrl;
                                return (
                                <Link href={`/dashboard/team/${member.id}`} key={member.id}>
                                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={avatar} alt={member.name} data-ai-hint="person portrait"/>
                                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-foreground">{member.name}</p>
                                            <p className="text-xs text-muted-foreground">{member.role}</p>
                                        </div>
                                    </div>
                                </Link>
                            )})}
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>
    )
}
