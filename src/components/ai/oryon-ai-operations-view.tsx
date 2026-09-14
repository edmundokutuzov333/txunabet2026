'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Bot, Brain, CalendarCheck, CheckCircle2, Loader2, Play, Search, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type ResponseState = { answer?: string; confidence?: number; sources?: string[]; plan?: unknown[]; toolResults?: unknown[]; risks?: unknown[]; predictions?: unknown[]; predictionStatus?: string; createdReport?: unknown; createdWorkflow?: unknown };

const agents = [
  ['executive', 'Executive Agent', 'O que aconteceu enquanto estive offline?'],
  ['analyst', 'Oryon Analyst', 'Porque é que Marketing caiu esta semana?'],
  ['project-manager', 'Project Manager', 'Acompanhar e preparar o status de um projeto.'],
  ['meeting', 'Meeting Agent', 'Preparar e analisar uma reunião.'],
  ['knowledge', 'Knowledge Agent', 'Como funciona o processo de aprovação de uma campanha?'],
  ['workflow-builder', 'AI Workflow Builder', 'Quando uma campanha for aprovada, cria tarefas, notifica o manager e agenda revisão.'],
  ['report-builder', 'AI Report Builder', 'Cria um relatório semanal de Marketing.'],
] as const;

export function OryonAIOperationsView() {
  const { toast } = useToast();
  const [agent, setAgent] = useState<(typeof agents)[number][0]>('executive');
  const [prompt, setPrompt] = useState('');
  const [entityId, setEntityId] = useState('');
  const [execute, setExecute] = useState(false);
  const [loading, setLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [result, setResult] = useState<ResponseState | null>(null);
  const [risk, setRisk] = useState<ResponseState | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent, prompt: prompt || undefined, entityId: entityId || undefined, execute }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'AI_AGENT_FAILED');
      setResult(payload);
    } catch (error) { toast({ title: 'Oryon AI', description: error instanceof Error ? error.message : 'Falha do agente.', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const scanRisk = async (predictive = false) => {
    setRiskLoading(true);
    try {
      const response = await fetch('/api/ai/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent: predictive ? 'predictive' : 'risk', horizonDays: 7 }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'RISK_ENGINE_FAILED');
      setRisk(payload);
    } catch (error) { toast({ title: 'Risk Engine', description: error instanceof Error ? error.message : 'Falha ao avaliar risco.', variant: 'destructive' }); }
    finally { setRiskLoading(false); }
  };

  useEffect(() => { void scanRisk(false); }, []);

  const selected = agents.find(([id]) => id === agent);
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-3"><Sparkles className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">Oryon AI</h1></div><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Sistema de intelligence + action. Os agentes recuperam contexto autorizado, raciocinam sobre evidência e só alteram dados através de ferramentas com permissões do servidor.</p></div><div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs"><ShieldCheck className="h-4 w-4 text-primary" />Tools autorizadas + auditoria</div></div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="gradient-surface rounded-2xl border-0"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot className="h-5 w-5 text-primary" />Agentes</CardTitle></CardHeader><CardContent className="space-y-2">{agents.map(([id, label]) => <button key={id} onClick={() => setAgent(id)} className={`w-full rounded-xl border p-3 text-left transition ${agent === id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40'}`}><div className="text-sm font-medium">{label}</div><div className="mt-1 text-xs text-muted-foreground">{agents.find((item) => item[0] === id)?.[2]}</div></button>)}</CardContent></Card>
        <Card className="gradient-surface rounded-2xl border-0"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Brain className="h-5 w-5 text-primary" />{selected?.[1]}</CardTitle></CardHeader><CardContent className="space-y-4"><Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={selected?.[2]} className="min-h-28" maxLength={12000} />{['project-manager','meeting'].includes(agent) && <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="ID da entidade" maxLength={180} />}<div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={execute} onChange={(e) => setExecute(e.target.checked)} />Permitir execução de ações propostas</label><Button onClick={() => void run()} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Executar agente</Button></div>{result && <div className="space-y-4 rounded-xl border border-primary/20 bg-background/50 p-5"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">confidence {Math.round((result.confidence ?? 0) * 100)}%</Badge>{result.toolResults?.length ? <Badge variant="outline">{result.toolResults.length} tool calls</Badge> : null}</div><div className="whitespace-pre-wrap text-sm leading-7">{result.answer}</div>{result.sources?.length ? <div className="text-xs text-muted-foreground">Fontes: {result.sources.join(', ')}</div> : null}{result.createdWorkflow ? <div className="rounded-lg border border-primary/20 p-3 text-xs">Workflow criado no control plane.</div> : null}{result.createdReport ? <div className="rounded-lg border border-primary/20 p-3 text-xs">Report criado.</div> : null}</div>}</CardContent></Card>
      </div>
      <Card className="gradient-surface rounded-2xl border-0"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-primary" />Risk Engine & Predictive Operations</CardTitle></CardHeader><CardContent><div className="mb-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => void scanRisk(false)} disabled={riskLoading}><Search className="mr-2 h-4 w-4" />Scan operacional</Button><Button variant="outline" onClick={() => void scanRisk(true)} disabled={riskLoading}><CalendarCheck className="mr-2 h-4 w-4" />Avaliar sinais preditivos</Button></div>{risk ? <div className="grid gap-3 md:grid-cols-2">{((risk.risks ?? risk.predictions ?? []) as Array<Record<string, unknown>>).map((item, index) => <div key={index} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between gap-2"><span className="font-medium">{String(item.type ?? 'risk')}</span><Badge variant={String(item.impact) === 'high' ? 'destructive' : 'outline'}>{String(item.impact ?? 'unknown')}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{String(item.reason ?? '')}</p><p className="mt-2 text-xs">Probabilidade: {Math.round(Number(item.probability ?? 0) * 100)}%</p><p className="mt-1 text-xs text-muted-foreground">Acção: {String(item.recommendedAction ?? '')}</p></div>)}</div> : <div className="text-sm text-muted-foreground">Sem sinais calculados.</div>}{risk?.predictionStatus && <div className="mt-4 text-xs text-muted-foreground">Estado preditivo: {risk.predictionStatus}. O sistema não transforma sinais insuficientes em previsões estatísticas.</div>}</CardContent></Card>
    </div>
  );
}
