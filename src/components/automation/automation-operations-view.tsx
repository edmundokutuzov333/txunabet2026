'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock3, Loader2, Play, Plus, RefreshCw, Save, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'workflows' | 'automations';
type Step = { id: string; type: 'log' | 'http' | 'module.create' | 'module.update' | 'module.delete' | 'condition'; name?: string; config: Record<string, unknown> };
type Workflow = { id: string; name: string; description?: string; active: boolean; version?: number; steps: Step[] };
type Automation = { id: string; name: string; description?: string; active: boolean; workflowId: string; trigger: Record<string, unknown> };
type Job = { id: string; automationId?: string; workflowId?: string; trigger?: string; status: string; attempts?: number; error?: string; createdAt?: string; updatedAt?: string };

const SAMPLE_STEPS: Step[] = [{ id: 'log-1', type: 'log', name: 'Registar execução', config: { message: 'Workflow executado para {{payload.reference}}' } }];

export function AutomationOperationsView({ mode }: { mode: ViewMode }) {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [stepsJson, setStepsJson] = useState(JSON.stringify(SAMPLE_STEPS, null, 2));
  const [workflowId, setWorkflowId] = useState('');
  const [triggerType, setTriggerType] = useState<'manual' | 'cron' | 'event'>('manual');
  const [cron, setCron] = useState('0 9 * * 1-5');
  const [timezone, setTimezone] = useState('Africa/Maputo');
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [workflowResponse, automationResponse, jobsResponse] = await Promise.all([
        fetch('/api/automation-engine?resource=workflows', { cache: 'no-store' }),
        fetch('/api/automation-engine?resource=automations', { cache: 'no-store' }),
        fetch('/api/automation-engine?resource=jobs', { cache: 'no-store' }),
      ]);
      const workflowPayload = await workflowResponse.json();
      const automationPayload = await automationResponse.json();
      const jobsPayload = await jobsResponse.json();
      if (!workflowResponse.ok) throw new Error(workflowPayload.error ?? 'Falha ao carregar workflows');
      if (!automationResponse.ok) throw new Error(automationPayload.error ?? 'Falha ao carregar automações');
      if (!jobsResponse.ok) throw new Error(jobsPayload.error ?? 'Falha ao carregar execuções');
      setWorkflows(Array.isArray(workflowPayload.data) ? workflowPayload.data : []);
      setAutomations(Array.isArray(automationPayload.data) ? automationPayload.data : []);
      setJobs(Array.isArray(jobsPayload.data) ? jobsPayload.data : []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Falha ao carregar dados' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const reset = () => {
    setSelectedWorkflow(null);
    setSelectedAutomation(null);
    setName('');
    setDescription('');
    setActive(true);
    setStepsJson(JSON.stringify(SAMPLE_STEPS, null, 2));
    setWorkflowId(workflows[0]?.id ?? '');
    setTriggerType('manual');
    setCron('0 9 * * 1-5');
    setTimezone('Africa/Maputo');
    setEventName('');
  };

  const save = async () => {
    setSaving(true);
    try {
      if (mode === 'workflows') {
        let steps: unknown;
        try { steps = JSON.parse(stepsJson); } catch { throw new Error('JSON de steps inválido.'); }
        const data = { name, description, active, steps };
        const action = selectedWorkflow ? 'update_workflow' : 'create_workflow';
        const response = await fetch('/api/automation-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id: selectedWorkflow?.id, data }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'Falha ao guardar workflow');
      } else {
        const trigger = triggerType === 'cron' ? { type: 'cron', cron, timezone } : triggerType === 'event' ? { type: 'event', eventName } : { type: 'manual' };
        const data = { name, description, active, workflowId, trigger };
        const action = selectedAutomation ? 'update_automation' : 'create_automation';
        const response = await fetch('/api/automation-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id: selectedAutomation?.id, data }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'Falha ao guardar automação');
      }
      toast({ title: 'Guardado', description: 'A configuração foi persistida no backend.' });
      await load();
      reset();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Não foi possível guardar', description: error instanceof Error ? error.message : 'Falha ao guardar' });
    } finally { setSaving(false); }
  };

  const run = async (id: string) => {
    try {
      const response = await fetch('/api/automation-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'run', id, payload: { source: 'control-panel', reference: `manual-${Date.now()}` } }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Falha ao colocar na fila');
      toast({ title: 'Colocado na fila', description: `Job ${payload.data.jobId} criado.` });
      await load();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Execução falhou', description: error instanceof Error ? error.message : 'Falha ao executar' });
    }
  };

  const retry = async (id: string) => {
    const response = await fetch('/api/automation-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'retry', id }) });
    const payload = await response.json();
    if (!response.ok) toast({ variant: 'destructive', title: 'Retry falhou', description: payload.error ?? 'Falha ao reenfileirar' });
    else { toast({ title: 'Retry agendado' }); await load(); }
  };

  const editWorkflow = (item: Workflow) => {
    setSelectedWorkflow(item); setSelectedAutomation(null); setName(item.name); setDescription(item.description ?? ''); setActive(item.active); setStepsJson(JSON.stringify(item.steps, null, 2));
  };
  const editAutomation = (item: Automation) => {
    const trigger = item.trigger ?? {};
    setSelectedAutomation(item); setSelectedWorkflow(null); setName(item.name); setDescription(item.description ?? ''); setActive(item.active); setWorkflowId(item.workflowId);
    setTriggerType(trigger.type === 'cron' || trigger.type === 'event' ? trigger.type : 'manual'); setCron(String(trigger.cron ?? '0 9 * * 1-5')); setTimezone(String(trigger.timezone ?? 'Africa/Maputo')); setEventName(String(trigger.eventName ?? ''));
  };

  const visibleJobs = useMemo(() => jobs.filter((job) => mode === 'workflows' ? workflows.some((item) => item.id === job.workflowId) : automations.some((item) => item.id === job.automationId)).slice(0, 20), [jobs, mode, workflows, automations]);
  const records = mode === 'workflows' ? workflows : automations;

  return <div className="p-6 space-y-6 fade-in">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h1 className="text-3xl font-bold">{mode === 'workflows' ? 'Workflows' : 'Automações'}</h1><p className="text-muted-foreground">Motor real com persistência, fila, worker, cron, retries e histórico.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar</Button><Button className="btn-primary-gradient" onClick={reset}><Plus className="mr-2 h-4 w-4"/>Novo</Button></div></div>

    <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle>{mode === 'workflows' ? 'Definição do workflow' : 'Definição da automação'}</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium">Nome</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === 'workflows' ? 'Ex.: Fecho diário' : 'Ex.: Fecho diário às 09:00'} /></div><div className="space-y-2"><label className="text-sm font-medium">Estado</label><select className="h-10 rounded-md border bg-background px-3 text-sm" value={active ? 'active' : 'inactive'} onChange={(e) => setActive(e.target.value === 'active')}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div></div>
      <div className="space-y-2"><label className="text-sm font-medium">Descrição</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      {mode === 'workflows' ? <div className="space-y-2"><label className="text-sm font-medium">Steps JSON</label><Textarea className="min-h-[280px] font-mono text-xs" value={stepsJson} onChange={(e) => setStepsJson(e.target.value)} /><p className="text-xs text-muted-foreground">Tipos suportados: log, condition, http, module.create, module.update, module.delete.</p></div> : <>
        <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium">Workflow</label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={workflowId} onChange={(e) => setWorkflowId(e.target.value)}>{workflows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="space-y-2"><label className="text-sm font-medium">Trigger</label><select className="h-10 rounded-md border bg-background px-3 text-sm" value={triggerType} onChange={(e) => setTriggerType(e.target.value as 'manual' | 'cron' | 'event')}><option value="manual">Manual</option><option value="cron">Cron</option><option value="event">Evento</option></select></div></div>
        {triggerType === 'cron' && <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium">Cron</label><Input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 9 * * 1-5" /></div><div className="space-y-2"><label className="text-sm font-medium">Timezone</label><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} /></div></div>}
        {triggerType === 'event' && <div className="space-y-2"><label className="text-sm font-medium">Nome do evento</label><Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="task.completed" /></div>}
      </>}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={reset}>Limpar</Button><Button className="btn-primary-gradient" onClick={() => void save()} disabled={saving || !name.trim() || (mode === 'automations' && !workflowId)}><Save className="mr-2 h-4 w-4"/>{saving ? 'A guardar...' : selectedWorkflow || selectedAutomation ? 'Actualizar' : 'Criar'}</Button></div>
    </CardContent></Card>

    <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle>{records.length} {mode === 'workflows' ? 'workflows' : 'automações'} persistentes</CardTitle></CardHeader><CardContent>{loading ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin"/></div> : records.length === 0 ? <div className="py-12 text-center text-muted-foreground">Nenhum registo.</div> : <div className="space-y-3">{records.map((item) => { const workflow = item as Workflow; const automation = item as Automation; const isActive = mode === 'workflows' ? workflow.active : automation.active; return <div key={String(item.id)} className="rounded-xl border border-border/60 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{item.name}</h3><Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Activo' : 'Inactivo'}</Badge></div><p className="text-xs text-muted-foreground mt-1">ID: {item.id}</p>{mode === 'automations' && <p className="text-sm text-muted-foreground mt-1">Workflow: {automation.workflowId} · Trigger: {String(automation.trigger?.type ?? 'manual')}</p>}{mode === 'workflows' && <p className="text-sm text-muted-foreground mt-1">{workflow.steps?.length ?? 0} steps · v{workflow.version ?? 1}</p>}</div><div className="flex gap-2"><Button variant="outline" onClick={() => mode === 'workflows' ? editWorkflow(workflow) : editAutomation(automation)}><Activity className="mr-2 h-4 w-4"/>Editar</Button>{mode === 'automations' && <Button onClick={() => void run(automation.id)} disabled={!automation.active}><Play className="mr-2 h-4 w-4"/>Executar</Button>}</div></div>; })}</div>}</CardContent></Card>

    <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle>Fila e histórico de execução</CardTitle></CardHeader><CardContent>{visibleJobs.length === 0 ? <div className="py-12 text-center text-muted-foreground">Ainda não existem execuções.</div> : <div className="space-y-2">{visibleJobs.map((job) => <div key={job.id} className="rounded-lg border border-border/60 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><Badge variant={job.status === 'succeeded' ? 'default' : job.status === 'dead' ? 'destructive' : 'secondary'}>{job.status}</Badge><span className="text-xs text-muted-foreground truncate">{job.id}</span></div><div className="text-xs text-muted-foreground mt-1">Tentativas: {job.attempts ?? 0} · Trigger: {job.trigger ?? 'manual'}</div>{job.error && <div className="text-xs text-destructive mt-1 truncate">{job.error}</div>}</div><div className="flex gap-2">{['dead', 'failed'].includes(job.status) && <Button variant="outline" size="sm" onClick={() => void retry(job.id)}><Clock3 className="mr-2 h-4 w-4"/>Retry</Button>}{job.status === 'succeeded' ? <CheckCircle2 className="h-5 w-5 text-green-400"/> : job.status === 'dead' ? <XCircle className="h-5 w-5 text-destructive"/> : <Loader2 className="h-5 w-5 animate-spin text-primary"/>}</div></div>)}</div>}</CardContent></Card>

    {mode === 'automations' && <div className="text-xs text-muted-foreground">O worker do backend verifica cron a cada minuto, reclama jobs com lease transaccional, executa steps idempotentes e aplica backoff determinístico: 30s, 60s, 120s, 240s, até 15 min, com dead-letter após 5 tentativas.</div>}
  </div>;
}
