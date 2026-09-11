
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, users } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

const statusClasses: { [key: string]: string } = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  dnd: 'bg-purple-500',
  offline: 'bg-slate-500',
};

export default function DirectMessagesPage() {
    const currentUser = getCurrentUser();
    const otherUsers = users.filter(u => u.id !== currentUser.id);

    return (
        <div className="p-6 fade-in">
            <h1 className="text-3xl font-bold text-foreground mb-8">Mensagens Diretas</h1>
            <Card className="gradient-surface border-0 rounded-2xl">
                <CardHeader>
                    <CardTitle>Iniciar uma Conversa</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {otherUsers.map(user => {
                            const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${user.id}`)?.imageUrl;
                            return (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-card/5 rounded-lg hover:bg-card/10 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <div className="relative">
                                            <Avatar>
                                                <AvatarImage src={avatar} alt={user.name} data-ai-hint="person portrait" />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${statusClasses[user.status]} ring-2 ring-background`}></span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">{user.name}</p>
                                            <p className="text-xs text-muted-foreground">{user.role}</p>
                                        </div>
                                    </div>
                                    <Link href={`/dashboard/chat/direct/${user.id}`}>
                                        <Button className="btn-primary-gradient py-1 px-4 text-sm font-semibold rounded-lg">
                                            <MessageSquare className="mr-2 h-4 w-4" /> Mensagem
                                        </Button>
                                    </Link>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
