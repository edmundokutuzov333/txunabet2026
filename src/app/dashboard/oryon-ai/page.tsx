'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Loader2, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Option { id: string; label: string; }

const actions = [
  ['ask', 'Perguntar'], ['summarize', 'Resumir'], ['correct', 'Explicar'], ['rewrite', 'Transformar'],
  ['write', 'Criar'], ['extractTasks', 'Extrair'], ['structure', 'Organizar'],
] as const;

export default function OryonAIPage() {
  const { toast } = useToast();
  const [action, setAction] = useState('ask');
  const [prompt, setPrompt] = useState('');
  const [contextType, setContextType] = useState<'none' | 'document' | 'conversation' | 'campaign' | 'task'>('none');
  const [contextId, setContextId] = useState('');
  const [documents, setDocuments] = useState<Option[]>([]);
  const [conversations, setConversations] = useState<Option[]>([]);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/documents', { cache: 'no-store' }).then((r) => r.ok ? r.json() : { documents: [] }),
      fetch('/api/chat/conversations', { cache: 'no-store' }).then((r) => r.ok ? r.json() : { conversations: [] }),
    ]).then(([documentPayload, conversationPayload]) => {
      setDocuments((documentPayload.documents ?? []).map((item: { id: string; title: string }) => ({ id: item.id, label: item.title })));
      setConversations((conversationPayload.conversations ?? []).map((item: { id: string; name?: string; type: string }) => ({ id: item.id, label: item.name || item.type })));
    }).catch(() => undefined);
  }, []);

  const options = useMemo(() => contextType === 'document' ? documents : contextType === 'conversation' ? conversations : [], [contextType, documents, conversations]);

  const run = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, prompt: prompt.trim(), contextType, contextId: contextId || undefined }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'AI_REQUEST_FAILED');
      setResult(payload.suggestion ?? '');
    } catch (error) {
      toast({ title: 'OryonAI', description: error instanceof Error ? error.message : 'Não foi possível contactar a IA.', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 fade-in">
      <div><h1 className="flex items-center gap-3 text-3xl font-bold"><Sparkles className="h-7 w-7 text-primary" />OryonAI</h1><p className="mt-2 text-sm text-muted-foreground">Assistente global com contexto autorizado. A IA só recebe os dados explicitamente seleccionados nesta sessão.</p></div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" />Contexto e operação</CardTitle></CardHeader><CardContent className="space-y-4"><Select value={action} onValueChange={setAction}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{actions.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select><Select value={contextType} onValueChange={(value) => { setContextType(value as typeof contextType); setContextId(''); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem contexto</SelectItem><SelectItem value="document">Documento</SelectItem><SelectItem value="conversation">Conversa</SelectItem><SelectItem value="campaign">Campanha</SelectItem><SelectItem value="task">Tarefa</SelectItem></SelectContent></Select>{options.length > 0 ? <Select value={contextId} onValueChange={setContextId}><SelectTrigger><SelectValue placeholder="Escolher contexto" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select> : contextType !== 'none' ? <Input value={contextId} onChange={(event) => setContextId(event.target.value)} placeholder="ID do contexto" /> : null}<div className="rounded-xl border border-border/70 bg-background/50 p-3 text-xs text-muted-foreground">OryonAI não executa alterações automaticamente. A IA devolve resultados para revisão humana.</div></CardContent></Card>
        <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot className="h-5 w-5 text-primary" />Pedido</CardTitle></CardHeader><CardContent className="space-y-4"><Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void run(); }} placeholder="Ex.: Resume os principais riscos desta campanha e separa-os por prioridade." className="min-h-36" maxLength={12000} /><div className="flex justify-end"><Button className="btn-primary-gradient" onClick={() => void run()} disabled={loading || !prompt.trim()}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Executar</Button></div>{result && <div className="rounded-xl border border-primary/20 bg-background/60 p-5"><div className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">Resultado para revisão</div><div className="whitespace-pre-wrap text-sm leading-7">{result}</div></div>}</CardContent></Card>
      </div>
    </div>
  );
}
