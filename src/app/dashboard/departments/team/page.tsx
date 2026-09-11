
'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDepartment, getDepartmentMembers } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Mail, MapPin, Phone, MessageSquare, Video } from "lucide-react";
import { useParams } from "next/navigation";
import Link from 'next/link';

const statusClasses: { [key: string]: { bg: string, text: string } } = {
  online: { bg: 'bg-success-500', text: 'text-success-500' },
  away: { bg: 'bg-yellow-500', text: 'text-yellow-500' },
  busy: { bg: 'bg-red-500', text: 'text-red-500' },
  dnd: { bg: 'bg-purple-500', text: 'text-purple-400' },
  offline: { bg: 'bg-slate-500', text: 'text-slate-400' },
};

export default function DepartmentTeamPage() {
    const params = useParams();
    const departmentSlug = params.department as string;
    const department = getDepartment(departmentSlug);
    const teamMembers = getDepartmentMembers(department?.name || "").sort((a, b) => {
        const statusOrder = { online: 1, away: 2, busy: 3, dnd: 4, offline: 5 };
        return statusOrder[a.status] - statusOrder[b.status];
    });

  if (!department) {
    return (
        <div className="p-6 fade-in">
            <h1 className="text-3xl font-bold text-foreground mb-8">Departamento não encontrado</h1>
             <Card className="gradient-surface border-0 rounded-2xl p-6">
                <p className="text-muted-foreground">O departamento que procura não existe.</p>
            </Card>
        </div>
    )
  }

  return (
    <div className="p-6 fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-8">Equipa de {department.name}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {teamMembers.map(user => {
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
                            <Badge variant="secondary" className="mt-2 bg-primary/10 text-primary/90">{user.department}</Badge>
                        </CardHeader>
                        <CardContent className="p-0 mt-4 text-left text-sm text-muted-foreground space-y-2 w-full">
                            <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-muted-foreground/80 shrink-0 mt-1" />
                                <span className="truncate">{user.email}</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-muted-foreground/80 shrink-0 mt-1" />
                                <span>{user.phone}</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-muted-foreground/80 shrink-0 mt-1" />
                                <span>{user.location}</span>
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
  );
}
