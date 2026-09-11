
'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, getWorkspacesForUser, users } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Briefcase, Folder, Lock, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const currentUser = getCurrentUser();
const userWorkspaces = getWorkspacesForUser(currentUser.id);

export default function WorkspacesPage() {
    const { toast } = useToast();

    const handleNewWorkspace = () => {
        toast({
            title: "Funcionalidade em desenvolvimento",
            description: "A criação de novos workspaces estará disponível em breve.",
        });
    }

    return (
        <div className="p-6 fade-in">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-foreground">Workspaces</h1>
                <Button className="btn-primary-gradient" onClick={handleNewWorkspace}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Workspace
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userWorkspaces.map(ws => {
                    const owner = users.find(u => u.id === ws.owner_id);

                    return (
                        <Link href={`/dashboard/workspaces/${ws.id}`} key={ws.id}>
                            <Card className="gradient-surface border-0 rounded-2xl h-full flex flex-col hover:border-primary/50 transition-colors">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                            <Briefcase className="w-5 h-5 text-primary" />
                                            {ws.name}
                                        </CardTitle>
                                        {ws.privacy === 'private' && <Lock className="w-4 h-4 text-muted-foreground" title="Workspace Privado" />}
                                    </div>
                                    <CardDescription className="pt-2 line-clamp-2">{ws.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col justify-end">
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            <span>{ws.members.length} Membros</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Folder className="w-4 h-4" />
                                            <span>{ws.linked_campaigns.length} Campanha(s)</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={PlaceHolderImages.find(p => p.id === `user-avatar-${owner?.id}`)?.imageUrl} />
                                            <AvatarFallback>{owner?.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Proprietário</p>
                                            <p className="text-sm font-medium text-foreground">{owner?.name}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
