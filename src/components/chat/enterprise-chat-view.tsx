'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Paperclip, Pin, Search, Send, Smile, Reply, MoreHorizontal, Trash2, Pencil, Wifi, WifiOff } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useEnterpriseChat, ensureConversation, type EnterpriseConversation, type EnterpriseMessage } from '@/features/chat/use-enterprise-chat';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';

export type DirectoryMember = { uid: string; displayName: string; email: string | null; photoURL?: string | null; role: string; departmentIds: string[] };

type Props = {
  conversation: EnterpriseConversation;
  title: string;
  subtitle?: string;
};

function displayTime(value: EnterpriseMessage['createdAt']) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : 'toDate' in value && typeof value.toDate === 'function' ? value.toDate() : null;
  return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

export default function EnterpriseChatView({ conversation, title, subtitle }: Props) {
  const { user } = requireUser();
  const { identity } = useEnterpriseIdentity();
  const { messages, loading, loadingOlder, hasMore, loadOlder, sendMessage, markRead, editMessage, deleteMessage, reactToMessage } = useEnterpriseChat(conversation.id);
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/users/directory', { credentials: 'include', cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => setDirectory(payload.members ?? []))
      .catch(() => setDirectory([]));
  }, []);

  useEffect(() => {
    if (!user) return;
    const heartbeat = () => fetch('/api/chat/presence', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: document.visibilityState === 'visible' ? 'online' : 'away' }) }).catch(() => setOnline(false));
    heartbeat();
    const timer = window.setInterval(heartbeat, 45_000);
    const visibility = () => heartbeat();
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [user]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.senderId !== user?.uid && !last.id.startsWith('optimistic_')) markRead(last.id).catch(() => undefined);
  }, [markRead, messages, user?.uid]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || messages.length === 0) return;
    node.scrollTop = node.scrollHeight;
  }, [conversation.id, messages.length]);

  const directoryById = useMemo(() => new Map(directory.map((item) => [item.uid, item])), [directory]);
  const filteredResults = useMemo(() => results.slice(0, 20), [results]);

  const updateTyping = (next: boolean) => {
    if (!conversation.id || typing === next) return;
    setTyping(next);
    fetch(`/api/chat/typing/${conversation.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ typing: next }) }).catch(() => undefined);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    updateTyping(Boolean(value.trim()));
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => updateTyping(false), 2500);
  };

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    try {
      await sendMessage({ body: text.trim() || file?.name || 'Anexo', replyToMessageId: replyTo?.id ?? null, attachments: file ? [file] : [] });
      setText('');
      setFile(null);
      setReplyTo(null);
      updateTyping(false);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    } catch (error) {
      toast({ title: 'Não foi possível enviar', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
    }
  };

  const runSearch = async () => {
    if (search.trim().length < 2) return setResults([]);
    setSearching(true);
    try {
      const response = await fetch(`/api/chat/search?q=${encodeURIComponent(search)}&conversationId=${encodeURIComponent(conversation.id)}`, { credentials: 'include' });
      const payload = await response.json();
      setResults(payload.results ?? []);
    } finally {
      setSearching(false);
    }
  };

  const startEdit = (message: EnterpriseMessage) => {
    setEditingId(message.id);
    setEditText(message.body);
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-6 gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle ?? 'Comunicação empresarial em tempo real.'}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4 text-destructive" />}
          {online ? 'Ligado' : 'Sem ligação'}
        </div>
      </div>

      <div className="flex gap-2">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="Pesquisar mensagens..." />
        <Button variant="outline" onClick={runSearch} disabled={searching}><Search className="h-4 w-4" /></Button>
      </div>
      {filteredResults.length > 0 && (
        <div className="rounded-xl border bg-card p-3 text-sm space-y-2 max-h-40 overflow-auto">
          {filteredResults.map((result) => <button key={result.id} className="block w-full text-left p-2 rounded hover:bg-muted" onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}>{result.body}</button>)}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto rounded-2xl border bg-muted/20 p-4 space-y-3">
        {hasMore && <div className="flex justify-center"><Button variant="outline" size="sm" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Carregar mensagens anteriores</Button></div>}
        {loading && messages.length === 0 ? <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : messages.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Ainda não existem mensagens nesta conversa.</div> : null}
        {messages.map((message) => {
          const sender = directoryById.get(message.senderId);
          const self = message.senderId === user?.uid;
          const deleted = Boolean(message.deletedAt);
          return <div key={message.id} className={`group flex gap-3 ${self ? 'justify-end' : ''}`}>
            {!self && <Avatar><AvatarFallback>{(sender?.displayName ?? '?').slice(0, 1)}</AvatarFallback></Avatar>}
            <div className={`max-w-[78%] ${self ? 'items-end' : ''}`}>
              <div className="text-xs text-muted-foreground mb-1">{sender?.displayName ?? message.senderId}</div>
              {message.replyToMessageId && <Badge variant="outline" className="mb-1 text-xs">Resposta a {message.replyToMessageId.slice(0, 8)}</Badge>}
              <div className={`rounded-2xl px-4 py-3 ${self ? 'bg-primary text-primary-foreground' : 'bg-card border'} ${deleted ? 'opacity-70 italic' : ''}`}>
                {editingId === message.id ? <div className="space-y-2"><Textarea value={editText} onChange={(e) => setEditText(e.target.value)} /><div className="flex gap-2"><Button size="sm" onClick={async () => { await editMessage(message.id, editText); setEditingId(null); }}>Guardar</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button></div></div> : <>
                  <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                  {message.attachments?.map((attachment) => <a key={attachment.storagePath} href={attachment.downloadUrl ?? '#'} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-lg border p-2 text-xs underline"><Paperclip className="h-4 w-4" /> {attachment.name}</a>)}
                </>}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{displayTime(message.createdAt)}</span>
                {message.editedAt && <span>editada</span>}
                {!deleted && <>
                  <button onClick={() => setReplyTo(message)} className="hover:text-foreground">Responder</button>
                  <button onClick={() => reactToMessage(message.id, '👍', (message.reactions?.['👍'] ?? []).includes(user?.uid ?? '') ? 'remove' : 'add')} className="hover:text-foreground">👍 {(message.reactions?.['👍'] ?? []).length || ''}</button>
                  {self && <><button onClick={() => startEdit(message)} className="hover:text-foreground"><Pencil className="h-3 w-3" /></button><button onClick={() => deleteMessage(message.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button></>}
                  <button onClick={async () => { await fetch(`/api/chat/conversations/${conversation.id}/pin`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ messageId: message.id, pinned: true }) }); }} className="hover:text-foreground"><Pin className="h-3 w-3" /></button>
                </>}
              </div>
            </div>
          </div>;
        })}
      </div>

      {replyTo && <div className="rounded-lg border bg-card p-3 text-sm flex items-center justify-between"><div><span className="font-semibold">A responder a</span><p className="truncate max-w-xl text-muted-foreground">{replyTo.body}</p></div><Button size="icon" variant="ghost" onClick={() => setReplyTo(null)}>×</Button></div>}
      <div className="flex gap-2 items-end">
        <label className="cursor-pointer"><input type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><Button type="button" variant="outline" asChild><span><Paperclip className="h-4 w-4" /></span></Button></label>
        <Textarea value={text} onChange={(event) => handleTextChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSend(); } }} placeholder="Escreva uma mensagem..." className="min-h-11" />
        <Button onClick={handleSend} disabled={!text.trim() && !file}><Send className="h-4 w-4" /></Button>
      </div>
      {file && <div className="text-xs text-muted-foreground">Anexo: {file.name}</div>}
    </div>
  );
}

function requireUser() {
  const { useUser } = require('@/firebase');
  const value = useUser();
  return value;
}
