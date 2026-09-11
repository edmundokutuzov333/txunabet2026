
'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { getCurrentUser, messages as initialMessages, users, departments as allDepartments } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Paperclip, Send, Smile, MoreHorizontal, Pin, Reply, Trash2, Forward, UserCheck, Keyboard, X, Eye, Users, Check, Search, MessageSquare, CornerDownLeft, Delete } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useParams } from "next/navigation";

type Message = (typeof initialMessages.geral)[0] & { replyTo?: Message, isDeleted?: boolean };
type ForwardRecipient = { type: 'user' | 'department'; id: number | string; name: string };

const currentUser = getCurrentUser();

const emojis = ['👍', '❤️', '😂', '🎉', '😢', '🙏', '🔥', '👏'];

export default function DirectMessageChatPage() {
    const params = useParams();
    const otherUserId = Number(params.userId);
    const otherUser = users.find(u => u.id === otherUserId);
    
    const { toast } = useToast();
    
    const initialChannelMessages = useMemo(() => {
        const channelId = [currentUser.id, otherUserId].sort().join('-');
        return ((initialMessages as any)[channelId] || []).map((m: any) => ({...m, isDeleted: false}));
    }, [otherUserId]);

    const [inputValue, setInputValue] = useState('');
    const [mentionQuery, setMentionQuery] = useState('');
    const [isMentionPopoverOpen, setMentionPopoverOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [channelMessages, setChannelMessages] = useState<Message[]>(initialChannelMessages);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [viewingDetails, setViewingDetails] = useState<Message | null>(null);
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    
    const allOtherUsers = useMemo(() => users.filter(m => m.id !== currentUser.id), []);

    const handleSendMessage = () => {
        if(inputValue.trim()){
            const newMessage: Message = {
                id: channelMessages.length + 100, // temp id
                userId: currentUser.id,
                content: inputValue,
                timestamp: new Date().toISOString(),
                reactions: [],
                ...(replyingTo && { replyTo: replyingTo }),
            };
            setChannelMessages(prev => [...prev, newMessage]);
            setInputValue('');
            setReplyingTo(null);
        }
    }

    const handleDeleteMessage = (messageId: number, type: 'me' | 'all') => {
        if (type === 'me') {
            setChannelMessages(prev => prev.filter(msg => msg.id !== messageId));
        } else {
            setChannelMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, content: 'Esta mensagem foi apagada', isDeleted: true, attachments: [] } : msg
            ));
        }
        toast({ title: "Mensagem apagada.", variant: "destructive" });
    };

    const handleReply = (message: Message) => {
        setReplyingTo(message);
        inputRef.current?.focus();
    };
        
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        
        const lastAt = value.lastIndexOf('@');
        if (lastAt !== -1 && !/\s/.test(value.substring(lastAt))) {
            const query = value.substring(lastAt + 1);
            setMentionQuery(query);
            setMentionPopoverOpen(true);
        } else {
            setMentionPopoverOpen(false);
        }
    }
    
    const handleMentionSelect = (name: string) => {
        const lastAt = inputValue.lastIndexOf('@');
        const newValue = `${inputValue.substring(0, lastAt)}@${name} `;
        setInputValue(newValue);
        setMentionPopoverOpen(false);
        inputRef.current?.focus();
    }
    
    const filteredMembers = useMemo(() => {
        if (!mentionQuery) return allOtherUsers;
        return allOtherUsers.filter(m => 
            m.name.toLowerCase().includes(mentionQuery.toLowerCase())
        );
    }, [mentionQuery, allOtherUsers]);
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            toast({
                title: 'Anexo adicionado',
                description: `O ficheiro "${e.target.files[0].name}" está pronto para ser enviado.`,
            });
        }
    };
    
    const handleEmojiSelect = (emoji: string) => {
        setInputValue(prev => prev + emoji);
        inputRef.current?.focus();
    };

    const handleVirtualKeyboardKeyPress = (key: string) => {
        if (key === 'backspace') {
            setInputValue(prev => prev.slice(0, -1));
        } else if (key === 'enter') {
            handleSendMessage();
        } else {
            setInputValue(prev => prev + key);
        }
        inputRef.current?.focus();
    };

    if (!otherUser) {
        return (
            <div className="p-6 fade-in h-full flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground">Utilizador não encontrado</h1>
                    <p className="text-muted-foreground">O utilizador que procura não existe ou não está disponível.</p>
                </div>
            </div>
        );
    }
    
    const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${otherUser.id}`)?.imageUrl;

    return (
        <>
            <div className="p-6 fade-in h-full flex flex-col">
                <div className="flex-shrink-0 mb-6">
                    <div className="flex items-center gap-4">
                         <Avatar className="w-12 h-12">
                            <AvatarImage src={avatar} alt={otherUser.name} data-ai-hint="person portrait" />
                            <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Conversa com {otherUser.name}</h1>
                            <p className="text-muted-foreground text-sm">{otherUser.role} • {otherUser.department}</p>
                        </div>
                    </div>
                </div>

                <div id="chat-messages" className="flex-grow gradient-surface p-6 rounded-2xl overflow-y-auto custom-scrollbar flex flex-col gap-2">
                    {channelMessages.length === 0 && (
                        <div className="flex-grow flex items-center justify-center">
                            <p className="text-muted-foreground">Ainda não há mensagens. Comece a conversa!</p>
                        </div>
                    )}
                    {channelMessages.map(msg => {
                        const user = users.find(u => u.id === msg.userId);
                        const isSelf = msg.userId === currentUser.id;
                        const userAvatar = PlaceHolderImages.find(p => p.id === `user-avatar-${user?.id}`)?.imageUrl;
                        const replyToUser = msg.replyTo ? users.find(u => u.id === msg.replyTo?.userId) : null;
                        const userDept = allDepartments.find(d => d.name === user?.department);

                        return (
                            <div key={msg.id} className={`group flex items-start gap-4 ${isSelf ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={userAvatar} alt={user?.name} data-ai-hint="person portrait" />
                                    <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className={`flex items-end gap-2 ${isSelf ? 'flex-row-reverse' : ''}`}>
                                    <div className="max-w-md md:max-w-xl">
                                        {msg.replyTo && replyToUser && !msg.isDeleted && (
                                            <div className={`text-xs text-muted-foreground mb-1 ml-2 ${isSelf ? 'text-right' : ''}`}>
                                                <span className="font-normal">Responder a</span> <span className="font-semibold">{isSelf && msg.replyTo.userId === currentUser.id ? "si mesmo" : replyToUser.name}</span>
                                                <div className={`p-2 rounded-md mt-1 text-sm text-foreground/80 truncate ${isSelf ? 'bg-primary/20' : 'bg-card/50'}`}>{msg.replyTo.content}</div>
                                            </div>
                                        )}
                                        <div className={`relative p-3 rounded-xl ${isSelf ? 'bg-primary text-primary-foreground rounded-br-none' : `bg-card rounded-bl-none ${userDept ? `department-${userDept.slug} bg-dept-light`: ''}`}`}>
                                            {!isSelf && <div className={`font-bold text-sm mb-1 ${userDept ? 'text-dept' : ''}`}>{user?.name}</div>}
                                            <p className={`text-sm ${isSelf ? 'text-primary-foreground/90' : 'text-foreground/90'} ${msg.isDeleted ? 'italic text-muted-foreground' : ''}`}>{msg.content}</p>
                                            
                                            <div className={`text-xs mt-1.5 text-right ${isSelf ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                    {!msg.isDeleted && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-56 p-2">
                                            <div className="space-y-1 text-sm">
                                                <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => handleReply(msg)}>
                                                    <Reply className="mr-2 h-4 w-4"/> Responder
                                                </Button>
                                                <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setForwardingMessage(msg)}>
                                                    <Forward className="mr-2 h-4 w-4"/> Reencaminhar
                                                </Button>
                                                <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setViewingDetails(msg)}>
                                                    <UserCheck className="mr-2 h-4 w-4"/> Ver Detalhes
                                                </Button>
                                                {isSelf && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive gap-2">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Apagar
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Apagar Mensagem?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta ação não pode ser desfeita. Escolha como pretende apagar a mensagem.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="sm:justify-center flex-col sm:flex-col sm:space-x-0 gap-2">
                                                                <AlertDialogAction onClick={() => handleDeleteMessage(msg.id, 'all')} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">Apagar para todos</AlertDialogAction>
                                                                <AlertDialogAction onClick={() => handleDeleteMessage(msg.id, 'me')} className="w-full">Apagar para mim</AlertDialogAction>
                                                                <AlertDialogCancel className="w-full mt-2 sm:mt-2">Cancelar</AlertDialogCancel>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="flex-shrink-0 mt-4">
                    <Popover open={isMentionPopoverOpen} onOpenChange={setMentionPopoverOpen}>
                        <PopoverAnchor asChild>
                            <div className="relative">
                                {replyingTo && (
                                    <div className="bg-card/80 p-2 rounded-t-xl border-b border-border flex justify-between items-center text-sm">
                                        <div className="text-muted-foreground">
                                            A responder a <span className="font-semibold text-foreground">{users.find(u => u.id === replyingTo.userId)?.name}</span>: 
                                            <span className="italic ml-2 truncate">"{replyingTo.content}"</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}>
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                )}
                                <div className="relative">
                                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                                    <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => fileInputRef.current?.click()}><Paperclip /></Button>
                                    <Input 
                                        ref={inputRef}
                                        type="text" 
                                        placeholder={`Enviar mensagem para ${otherUser.name}...`}
                                        className={`w-full h-auto p-4 pl-14 pr-36 bg-card border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary ${replyingTo ? 'rounded-b-xl rounded-t-none' : 'rounded-xl'}`}
                                        value={inputValue}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground"><Smile /></Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-2 border-border bg-card" side="top" align="end">
                                                <div className="grid grid-cols-4 gap-2">
                                                    {emojis.map(emoji => (
                                                        <Button key={emoji} variant="ghost" size="icon" onClick={() => handleEmojiSelect(emoji)} className="text-xl">
                                                            {emoji}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setIsKeyboardVisible(!isKeyboardVisible)}><Keyboard /></Button>
                                        <Button 
                                            className="btn-primary-gradient px-4 py-2 text-primary-foreground font-semibold rounded-lg h-auto"
                                            onClick={handleSendMessage}
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </PopoverAnchor>
                        <PopoverContent className="w-[calc(100%-48px)] lg:w-[400px] bg-card border-border p-2 mb-2" align="start" side="top">
                        <div className="text-sm font-bold p-2 text-foreground">Mencionar Membro</div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredMembers.length > 0 ? filteredMembers.map(member => {
                                const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${member.id}`)?.imageUrl;
                                return (
                                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer" onClick={() => handleMentionSelect(member.name)}>
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={avatar} alt={member.name} data-ai-hint="person portrait" />
                                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-foreground text-sm">{member.name}</p>
                                            <p className="text-xs text-muted-foreground">{member.role}</p>
                                        </div>
                                    </div>
                                )
                            }) : (
                                <p className="p-4 text-center text-sm text-muted-foreground">Nenhum membro encontrado.</p>
                            )}
                        </div>
                        </PopoverContent>
                    </Popover>
                     {isKeyboardVisible && (
                        <VirtualKeyboard onKeyPress={handleVirtualKeyboardKeyPress} />
                    )}
                </div>
            </div>
            
            <Dialog open={!!viewingDetails} onOpenChange={() => setViewingDetails(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalhes da Mensagem</DialogTitle>
                        <DialogDescription>
                            Informação sobre quem viu a mensagem.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar -mr-4 pr-4 mt-4">
                        <div className="text-sm text-muted-foreground mb-4">
                            Enviada por <span className="font-bold text-foreground">{users.find(u => u.id === viewingDetails?.userId)?.name}</span>
                        </div>
                        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Eye className="w-4 h-4 text-primary"/> Visto por</h3>
                        <div className="space-y-3">
                            {[currentUser, otherUser].map(member => {
                                const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${member.id}`)?.imageUrl;
                                return (
                                <div key={member.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={avatar} alt={member.name} data-ai-hint="person portrait" />
                                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-foreground text-sm">{member.name}</p>
                                            <p className="text-xs text-muted-foreground">{member.role}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(viewingDetails?.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )})}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ForwardMessageDialog 
                message={forwardingMessage} 
                isOpen={!!forwardingMessage}
                onOpenChange={(isOpen) => !isOpen && setForwardingMessage(null)}
            />
        </>
    );
}


function ForwardMessageDialog({ message, isOpen, onOpenChange }: { message: Message | null, isOpen: boolean, onOpenChange: (isOpen: boolean) => void }) {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState<ForwardRecipient[]>([]);

    const availableRecipients = useMemo(() => {
        const userRecipients: ForwardRecipient[] = users.map(u => ({ type: 'user', id: u.id, name: u.name }));
        const departmentRecipients: ForwardRecipient[] = allDepartments.map(d => ({ type: 'department', id: d.slug, name: `Dep: ${d.name}`}));
        return [...userRecipients, ...departmentRecipients];
    }, []);

    const filteredRecipients = useMemo(() => 
        availableRecipients.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    , [searchQuery, availableRecipients]);

    const toggleSelection = (recipient: ForwardRecipient) => {
        setSelected(prev => 
            prev.find(s => s.id === recipient.id)
                ? prev.filter(s => s.id !== recipient.id)
                : [...prev, recipient]
        );
    };
    
    const handleForward = () => {
        if(selected.length === 0){
            toast({ title: "Nenhum destinatário selecionado", variant: 'destructive'});
            return;
        }
        toast({ title: `Mensagem reencaminhada para ${selected.length} conversa(s).` });
        onOpenChange(false);
        setSelected([]);
        setSearchQuery('');
    };

    if (!message) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Reencaminhar Mensagem</DialogTitle>
                    <DialogDescription>Selecione para quem pretende reencaminhar esta mensagem.</DialogDescription>
                </DialogHeader>
                <div className="my-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-semibold">{users.find(u => u.id === message.userId)?.name}</p>
                    <p className="text-muted-foreground truncate">{message.content}</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Pesquisar pessoas ou canais..."
                        className="pl-10 bg-card border-border"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar -mr-4 pr-3 mt-2 space-y-1">
                   {filteredRecipients.map(recipient => (
                       <div key={`${recipient.type}-${recipient.id}`} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg" >
                            <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                    {recipient.type === 'user' && <AvatarImage src={PlaceHolderImages.find(p => p.id === `user-avatar-${recipient.id}`)?.imageUrl} />}
                                    <AvatarFallback>{recipient.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{recipient.name}</span>
                            </div>
                           <Checkbox 
                                checked={selected.some(s => s.id === recipient.id)}
                                onCheckedChange={() => toggleSelection(recipient)}
                           />
                       </div>
                   ))}
                </div>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleForward} disabled={selected.length === 0} className="btn-primary-gradient">
                        <Send className="mr-2 h-4 w-4"/>
                        Reencaminhar ({selected.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function VirtualKeyboard({ onKeyPress }: { onKeyPress: (key: string) => void }) {
    const keyboardLayout = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
    ];

    return (
        <div className="p-4 bg-muted rounded-xl mt-2">
            <div className="space-y-2">
                {keyboardLayout.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex justify-center gap-2">
                        {row.map(key => (
                            <Button
                                key={key}
                                variant="outline"
                                className="h-10 w-10 p-0 text-lg bg-card"
                                onClick={() => onKeyPress(key)}
                            >
                                {key}
                            </Button>
                        ))}
                    </div>
                ))}
                <div className="flex justify-center gap-2">
                     <Button variant="outline" className="h-10 flex-grow bg-card" onClick={() => onKeyPress(' ')}>
                        Barra de Espaço
                    </Button>
                    <Button variant="outline" className="h-10 w-10 p-0 bg-card" onClick={() => onKeyPress('backspace')}>
                        <Delete />
                    </Button>
                     <Button variant="outline" className="h-10 px-4 bg-card" onClick={() => onKeyPress('enter')}>
                        <CornerDownLeft className="w-5 h-5"/>
                    </Button>
                </div>
            </div>
        </div>
    );
}
