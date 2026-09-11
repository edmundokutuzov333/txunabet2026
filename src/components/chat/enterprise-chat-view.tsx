'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Paperclip, Pin, Search, Send, Trash2, Pencil, Wifi, WifiOff, Sparkles, ListTodo, BriefcaseBusiness, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { useEnterpriseChat, type EnterpriseConversation, type EnterpriseMessage } from '@/features/chat/use-enterprise-chat';

export type DirectoryMember = { uid: string; displayName: string; email: string | null; photoURL?: string | null; role: string; departmentIds: string[] };
type Props = { conversation: EnterpriseConversation; title: string; subtitle?: string };
type ChatAIAction = 'summarize' | 'decisions' | 'tasks' | 'briefing' | 'pending';

function displayTime(value: EnterpriseMessage['createdAt']) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : 'toDate' in value && typeof value.toDate === 'function' ? value.toDate() : null;
  return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

const aiLabels: Record<ChatAIAction, string> = { summarize: 'Resumir', decisions: 'Decisões', tasks: 'Tarefas', briefing: 'Briefing', pending: 'Pendências' };

export default function EnterpriseChatView({ conversation, title, subtitle }: Props) {
  const { user } = useUser();
  const { messages, loading, loadingOlder, hasMore, typingUserIds, loadOlder, sendMessage, markRead, editMessage, deleteMessage, reactToMessage } = useEnterpriseChat(conversation.id);
  const { toast } = useToast();
  const [directory, setDirectory] = useState<DirectoryMember[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<EnterpriseMessage | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<EnterpriseMessage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<ChatAIAction | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetch('/api/users/directory', { credentials: 'include', cache: 'no-store' }).then((r) => r.json()).then((payload) => setDirectory(payload.members ?? payload.users ?? [])).catch(() => setDirectory([])); }, []);
  useEffect(() => {
    if (!user) return;
    const heartbeat = () => fetch('/api/chat/presence', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: document.visibilityState === 'visible' ? 'online' : 'away' }) }).then(() => setOnline(true)).catch(() => setOnline(false));
    heartbeat(); const timer = window.setInterval(heartbeat, 45_000); document.addEventListener('visibilitychange', heartbeat);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', heartbeat); };
  }, [user]);
  useEffect(() => { const last = messages[messages.length - 1]; if (last && last.senderId !== user?.uid && !last.id.startsWith('optimistic_')) markRead(last.id).catch(() => undefined); }, [markRead, messages, user?.uid]);
  useEffect(() => { const node = scrollRef.current; if (node && messages.length) node.scrollTop = node.scrollHeight; }, [conversation.id, messages.length]);

  const directoryById = useMemo(() => new Map(directory.map((item) => [item.uid, item])), [directory]);
  const mentionCandidates = useMemo(() => directory.filter((member) => member.uid !== user?.uid && text.includes('@') && member.displayName.toLowerCase().includes(text.slice(text.lastIndexOf('@') + 1).toLowerCase())), [directory, text, user?.uid]);

  const updateTyping = (next: boolean) => { if (typing === next) return; setTyping(next); fetch(`/api/chat/typing/${conversation.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ typing: next }) }).catch(() => undefined); };
  const handleTextChange = (value: string) => { setText(value); updateTyping(Boolean(value.trim())); if (typingTimer.current) clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => updateTyping(false), 2500); };
  const extractMentions = (value: string) => directory.filter((member) => new RegExp(`@${escapeRegExp(member.displayName)}(\\s|$)`, 'i').test(value)).map((member) => member.uid);
  const handleSend = async () => { if (!text.trim() && !file) return; try { await sendMessage({ body: text.trim() || file?.name || 'Anexo', replyToMessageId: replyTo?.id ?? null, mentions: extractMentions(text), attachments: file ? [file] : [] }); setText(''); setFile(null); setReplyTo(null); updateTyping(false); } catch (error) { toast({ title: 'Não foi possível enviar', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }); } };
  const runSearch = async () => { if (search.trim().length < 2) return setResults([]); setSearching(true); try { const response = await fetch(`/api/chat/search?q=${encodeURIComponent(search)}&conversationId=${encodeURIComponent(conversation.id)}`, { credentials: 'include' }); const payload = await response.json(); setResults(payload.results ?? []); } finally { setSearching(false); } };
  const runChatAI = async (action: ChatAIAction) => { setAiBusy(action); try { const response = await fetch(`/api/chat/conversations/${encodeURIComponent(conversation.id)}/ai`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? 'AI_REQUEST_FAILED'); setSummary(payload.suggestion ?? ''); } catch (error) { toast({ title: `OryonAI · ${aiLabels[action]}`, description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }); } finally { setAiBusy(null); } };

  return <div className="flex h-full min-h-0 flex-col p-6 gap-4">
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">{title}</h1><p className="text-sm text-muted-foreground">{subtitle ?? 'Comunicação empresarial em tempo real.'}</p></div><div className="flex flex-wrap items-center justify-end gap-2"><Button variant="outline" size="sm" onClick={() => void runChatAI('summarize')} disabled={!!aiBusy}>{aiBusy === 'summarize' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Resumo</Button><Button variant="outline" size="sm" onClick={() => void runChatAI('decisions')} disabled={!!aiBusy}><BriefcaseBusiness className="mr-2 h-4 w-4" />Decisões</Button><Button variant="outline" size="sm" onClick={() => void runChatAI('tasks')} disabled={!!aiBusy}><ListTodo className="mr-2 h-4 w-4" />Tarefas</Button><Button variant="outline" size="sm" onClick={() => void runChatAI('briefing')} disabled={!!aiBusy}>Briefing</Button><Button variant="outline" size="sm" onClick={() => void runChatAI('pending')} disabled={!!aiBusy}><AlertCircle className="mr-2 h-4 w-4" />Pendências</Button><div className="flex items-center gap-2 text-xs text-muted-foreground">{online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4 text-destructive" />}{online ? 'Ligado' : 'Sem ligação'}</div></div></div>
    <div className="flex gap-2"><Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch()} placeholder="Pesquisar nesta conversa..." /><Button variant="outline" onClick={runSearch} disabled={searching}><Search className="h-4 w-4" /></Button></div>
    {results.length > 0 && <div className="rounded-xl border bg-card p-3 text-sm space-y-1 max-h-40 overflow-auto">{results.slice(0, 20).map((result) => <button key={result.id} className="block w-full text-left p-2 rounded hover:bg-muted">{result.body}</button>)}</div>}
    {summary && <div className="rounded-xl border bg-primary/5 p-4 text-sm"><div className="font-semibold mb-1">OryonAI · resultado</div><p className="whitespace-pre-wrap text-muted-foreground">{summary}</p></div>}
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto rounded-2xl border bg-muted/20 p-4 space-y-3">
      {hasMore && <div className="flex justify-center"><Button variant="outline" size="sm" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Carregar mensagens anteriores</Button></div>}
      {loading && messages.length === 0 && <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
      {!loading && messages.length === 0 && <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Ainda não existem mensagens nesta conversa.</div>}
      {messages.map((message) => { const sender = directoryById.get(message.senderId); const self = message.senderId === user?.uid; const deleted = Boolean(message.deletedAt); return <div key={message.id} className={`group flex gap-3 ${self ? 'justify-end' : ''}`}>{!self && <Avatar><AvatarFallback>{(sender?.displayName ?? '?').slice(0, 1)}</AvatarFallback></Avatar>}<div className="max-w-[78%]"><div className="text-xs text-muted-foreground mb-1">{sender?.displayName ?? message.senderId}</div>{message.replyToMessageId && <Badge variant="outline" className="mb-1 text-xs">Resposta a {message.replyToMessageId.slice(0, 8)}</Badge>}<div className={`rounded-2xl px-4 py-3 ${self ? 'bg-primary text-primary-foreground' : 'bg-card border'} ${deleted ? 'opacity-70 italic' : ''}`}>{editingId === message.id ? <div className="space-y-2"><Textarea value={editText} onChange={(e) => setEditText(e.target.value)} /><div className="flex gap-2"><Button size="sm" onClick={async () => { await editMessage(message.id, editText); setEditingId(null); }}>Guardar</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button></div></div> : <><p className="whitespace-pre-wrap text-sm">{message.body}</p>{message.attachments?.map((attachment) => <a key={attachment.storagePath} href={attachment.downloadUrl ?? '#'} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-lg border p-2 text-xs underline"><Paperclip className="h-4 w-4" />{attachment.name}</a>)}</>}</div><div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><span>{displayTime(message.createdAt)}</span>{message.editedAt && <span>editada</span>}{!deleted && <><button onClick={() => setReplyTo(message)} className="hover:text-foreground">Responder</button><button onClick={() => reactToMessage(message.id, '👍', (message.reactions?.['👍'] ?? []).includes(user?.uid ?? '') ? 'remove' : 'add')} className="hover:text-foreground">👍 {(message.reactions?.['👍'] ?? []).length || ''}</button>{self && <><button onClick={() => { setEditingId(message.id); setEditText(message.body); }} className="hover:text-foreground"><Pencil className="h-3 w-3" /></button><button onClick={() => deleteMessage(message.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button></>}</>}</div></div></div>; })}
    </div>
    {typingUserIds.length > 0 && <div className="text-xs text-muted-foreground">{typingUserIds.map((id) => directoryById.get(id)?.displayName ?? id).join(', ')} a escrever...</div>}
    {replyTo && <div className="rounded-lg border bg-card p-3 text-sm flex items-center justify-between"><div><span className="font-semibold">A responder a</span><p className="truncate max-w-xl text-muted-foreground">{replyTo.body}</p></div><Button size="icon" variant="ghost" onClick={() => setReplyTo(null)}>×</Button></div>}
    {mentionCandidates.length > 0 && <div className="rounded-lg border bg-card p-2 text-sm space-y-1">{mentionCandidates.slice(0, 5).map((member) => <button key={member.uid} className="block w-full text-left p-2 rounded hover:bg-muted" onClick={() => { const index = text.lastIndexOf('@'); setText(`${text.slice(0, index)}@${member.displayName} `); }}>{member.displayName}</button>)}</div>}
    <div className="flex gap-2 items-end"><label className="cursor-pointer"><input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><Button type="button" variant="outline" asChild><span><Paperclip className="h-4 w-4" /></span></Button></label><Textarea value={text} onChange={(e) => handleTextChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }} placeholder="Escreva uma mensagem..." className="min-h-11" /><Button onClick={() => void handleSend()} disabled={!text.trim() && !file}><Send className="h-4 w-4" /></Button></div>
    {file && <div className="text-xs text-muted-foreground">Anexo: {file.name}</div>}
  </div>;
}

function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
