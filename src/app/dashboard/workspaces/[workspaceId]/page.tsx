
'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWorkspaceById, users, getCurrentUser, getWorkspaceTasks, getWorkspaceFiles, messages as allMessages } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ArrowLeft, Briefcase, File, Lock, MessageSquare, Plus, Send, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

const currentUser = getCurrentUser();

// Simple Task Card Component for Workspaces
const TaskCard = ({ task }: { task: ReturnType<typeof getWorkspaceTasks>[0] }) => (
    <div className="p-4 bg-card/50 rounded-lg">
        <h4 className="font-semibold text-foreground">{task.title}</h4>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Prazo: {new Date(task.dueDate).toLocaleDateString()}</span>
            <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'secondary' : 'outline'} className="capitalize">{task.priority}</Badge>
        </div>
    </div>
);

// Simple File Card Component for Workspaces
const FileCard = ({ file }: { file: ReturnType<typeof getWorkspaceFiles>[0] }) => (
    <div className="p-4 bg-card/50 rounded-lg flex items-center gap-3">
        <File className="w-5 h-5 text-primary" />
        <div>
            <h4 className="font-semibold text-foreground">{file.name}</h4>
            <p className="text-sm text-muted-foreground">{file.size}</p>
        </div>
    </div>
);

// Simple Chat Component for Workspaces
const WorkspaceChat = ({ channelId }: { channelId: string }) => {
    const initialMessages = useMemo(() => (allMessages as any)[channelId] || [], [channelId]);
    const [messages, setMessages] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState("");

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        const msg = {
            id: messages.length + 1,
            userId: currentUser.id,
            content: newMessage,
            timestamp: new Date().toISOString(),
            reactions: []
        };
        setMessages([...messages, msg]);
        setNewMessage("");
    };

    return (
        <div className="flex flex-col h-[60vh]">
            <div className="flex-grow overflow-y-auto custom-scrollbar p-1">
                {messages.map((msg: any) => {
                    const user = users.find(u => u.id === msg.userId);
                    return (
                        <div key={msg.id} className="flex items-start gap-3 my-4">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={PlaceHolderImages.find(p => p.id === `user-avatar-${user?.id}`)?.imageUrl} />
                                <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-foreground text-sm">{user?.name}</p>
                                <div className="bg-card/50 p-3 rounded-lg mt-1 text-sm text-muted-foreground">{msg.content}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 flex gap-2">
                <Input 
                    placeholder="Escreva uma mensagem no chat do workspace..."
                    className="bg-card/80 border-border"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage}><Send className="w-4 h-4" /></Button>
            </div>
        </div>
    );
};


export default function WorkspaceDetailPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    const workspace = getWorkspaceById(workspaceId);

    if (!workspace) {
        return (
            <div className="p-6 fade-in text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">Workspace não encontrado</h1>
                <p className="text-muted-foreground">O workspace que está a tentar aceder não existe ou não tem permissão para o ver.</p>
                <Link href="/dashboard/workspaces">
                    <Button variant="outline" className="mt-6">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para Workspaces
                    </Button>
                </Link>
            </div>
        );
    }
    
    const workspaceMembers = users.filter(u => workspace.members.includes(u.id));
    const workspaceTasks = getWorkspaceTasks(workspace.linked_tasks);
    const workspaceFiles = getWorkspaceFiles(workspace.linked_files);

    return (
        <div className="p-6 fade-in">
            <Card className="gradient-surface border-0 rounded-2xl mb-8">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                            <Briefcase className="w-7 h-7 text-primary" />
                            {workspace.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                             {workspace.privacy === 'private' && (
                                <Badge variant="outline" className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Privado</Badge>
                             )}
                            <Button variant="outline" size="icon"><Settings className="w-4 h-4"/></Button>
                        </div>
                    </div>
                    <CardDescription className="pt-2 text-base">{workspace.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-5 h-5"/>
                            <span className="font-semibold text-foreground">{workspace.members.length}</span> Membros
                        </div>
                        <div className="flex -space-x-2">
                            {workspaceMembers.slice(0, 5).map(member => (
                                <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                                    <AvatarImage src={PlaceHolderImages.find(p => p.id === `user-avatar-${member.id}`)?.imageUrl} />
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            ))}
                            {workspaceMembers.length > 5 && (
                                <Avatar className="w-8 h-8 border-2 border-background">
                                    <AvatarFallback>+{workspaceMembers.length - 5}</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="tasks" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50">
                    <TabsTrigger value="tasks">Tarefas ({workspaceTasks.length})</TabsTrigger>
                    <TabsTrigger value="files">Ficheiros ({workspaceFiles.length})</TabsTrigger>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                </TabsList>
                <TabsContent value="tasks">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workspaceTasks.length > 0 ? workspaceTasks.map(task => (
                            <TaskCard key={task.id} task={task} />
                        )) : <p className="text-muted-foreground col-span-full text-center py-10">Nenhuma tarefa associada a este workspace.</p>}
                    </div>
                </TabsContent>
                <TabsContent value="files">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workspaceFiles.length > 0 ? workspaceFiles.map(file => (
                            <FileCard key={file.id} file={file} />
                        )) : <p className="text-muted-foreground col-span-full text-center py-10">Nenhum ficheiro associado a este workspace.</p>}
                    </div>
                </TabsContent>
                <TabsContent value="chat">
                    <WorkspaceChat channelId={workspace.linked_chat_channel_id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
