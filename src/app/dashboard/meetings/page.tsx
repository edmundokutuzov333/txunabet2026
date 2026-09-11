
'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { meetings, getCurrentUser, users } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Video, Calendar, Plus, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const currentUser = getCurrentUser();
const userMeetings = meetings.filter(m => m.participants.includes(currentUser.id));

export default function MeetingsPage() {
    const { toast } = useToast();

    const handleScheduleMeeting = () => {
        toast({
            title: "Funcionalidade em desenvolvimento",
            description: "Agendar novas reuniões estará disponível em breve.",
        });
    }

    const scheduledMeetings = userMeetings.filter(m => m.status === 'scheduled');
    const activeMeetings = userMeetings.filter(m => m.status === 'active');
    const completedMeetings = userMeetings.filter(m => m.status === 'completed');

    return (
        <div className="p-6 fade-in">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-foreground">Reuniões</h1>
                <Button className="btn-primary-gradient" onClick={handleScheduleMeeting}>
                    <Plus className="mr-2 h-4 w-4" /> Agendar Reunião
                </Button>
            </div>
            
            <div className="space-y-8">
                <MeetingSection title="Agendadas" meetings={scheduledMeetings} />
                <MeetingSection title="Em Andamento" meetings={activeMeetings} active />
                <MeetingSection title="Concluídas" meetings={completedMeetings} />
            </div>
        </div>
    );
}

const MeetingSection = ({ title, meetings, active = false }: { title: string, meetings: typeof userMeetings, active?: boolean }) => {
    const { toast } = useToast();
    if (meetings.length === 0) return null;

    const handleJoinMeeting = (meetingTitle: string) => {
        toast({
            title: `A entrar na reunião: ${meetingTitle}`,
            description: "A funcionalidade de videochamada está em desenvolvimento.",
        });
    }

    return (
        <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {meetings.map(meeting => (
                    <Card key={meeting.id} className={`gradient-surface border-0 rounded-2xl ${active ? 'border-primary/50' : ''}`}>
                        <CardHeader>
                             <div className="flex justify-between items-start">
                                <CardTitle className="text-lg font-bold">{meeting.title}</CardTitle>
                                {active ? (
                                     <Button size="sm" className="bg-success-500/20 text-success-500 hover:bg-success-500/30 animate-pulse" onClick={() => handleJoinMeeting(meeting.title)}>
                                        <Video className="mr-2 h-4 w-4" /> Entrar
                                    </Button>
                                ) : (
                                    <Badge variant="secondary" className="capitalize bg-primary/20 text-primary">{meeting.status}</Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground pt-2">{meeting.description}</p>
                        </CardHeader>
                        <CardContent>
                            <div className="border-t border-border pt-4 flex justify-between items-center text-sm text-muted-foreground">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> {new Date(meeting.date).toLocaleDateString('pt-PT')}</span>
                                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {meeting.time} ({meeting.duration} min)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <div className="flex -space-x-2">
                                        {meeting.participants.map(pId => {
                                            const user = users.find(u => u.id === pId);
                                            const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${user?.id}`)?.imageUrl;
                                            return user ? (
                                                <Avatar key={user.id} className="w-6 h-6 border-2 border-background">
                                                    <AvatarImage src={avatar} alt={user.name} data-ai-hint="person portrait" />
                                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            ) : null
                                        })}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    )
}
