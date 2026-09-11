'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, RefreshCw, Search, Pencil, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type ProductionModule = 'cloud' | 'calendar' | 'meetings' | 'integrations' | 'knowledge-base' | 'campaigns' | 'tasks' | 'reports' | 'workflows' | 'automations' | 'pulse' | 'workspaces';

type FieldDef = { key: string; label: string; type?: 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'list'; placeholder?: string };

const FIELD_DEFS: Record<ProductionModule, FieldDef[]> = {
  cloud: [
    { key: 'name', label: 'Nome', placeholder: 'Ficheiro' },
    { key: 'mimeType', label: 'Tipo MIME', placeholder: 'application/pdf' },
    { key: 'size', label: 'Tamanho (bytes)', type: 'number' },
    { key: 'storagePath', label: 'Caminho no Storage', placeholder: 'companies/.../files/...' },
  ],
  calendar: [
    { key: 'title', label: 'Título' }, { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'start', label: 'Início', type: 'date' }, { key: 'end', label: 'Fim', type: 'date' },
    { key: 'location', label: 'Local' }, { key: 'participants', label: 'Participantes', type: 'list', placeholder: 'uid1, uid2' },
  ],
  meetings: [
    { key: 'title', label: 'Título' }, { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'date', label: 'Data', type: 'date' }, { key: 'time', label: 'Hora' },
    { key: 'duration', label: 'Duração (min)', type: 'number' }, { key: 'participants', label: 'Participantes', type: 'list' },
    { key: 'status', label: 'Estado', placeholder: 'scheduled' },
  ],
  integrations: [
    { key: 'name', label: 'Nome' }, { key: 'type', label: 'Tipo' }, { key: 'status', label: 'Estado' },
    { key: 'connected', label: 'Ligada', type: 'boolean' }, { key: 'endpoint', label: 'Endpoint' },
  ],
  'knowledge-base': [
    { key: 'title', label: 'Título' }, { key: 'category', label: 'Categoria' },
    { key: 'content', label: 'Conteúdo', type: 'textarea' }, { key: 'tags', label: 'Tags', type: 'list' },
  ],
  campaigns: [
    { key: 'name', label: 'Nome' }, { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'status', label: 'Estado' }, { key: 'department', label: 'Departamento' },
    { key: 'budget', label: 'Orçamento', type: 'number' }, { key: 'spent', label: 'Gasto', type: 'number' },
    { key: 'startDate', label: 'Data de início', type: 'date' }, { key: 'endDate', label: 'Data de fim', type: 'date' },
  ],
  tasks: [
    { key: 'title', label: 'Título' }, { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'status', label: 'Estado', placeholder: 'todo' }, { key: 'priority', label: 'Prioridade', placeholder: 'medium' },
    { key: 'dueDate', label: 'Prazo', type: 'date' }, { key: 'assignedTo', label: 'Responsáveis', type: 'list' },
    { key: 'labels', label: 'Etiquetas', type: 'list' },
  ],
  reports: [
    { key: 'name', label: 'Nome' }, { key: 'title', label: 'Título' }, { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'type', label: 'Tipo' }, { key: 'department', label: 'Departamento' }, { key: 'status', label: 'Estado' },
  ],
  workflows: [
    { key: 'name', label: 'Nome' }, { key: 'department', label: 'Departamento' },
    { key: 'steps', label: 'Número de passos', type: 'number' }, { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'active', label: 'Activo', type: 'boolean' },
  ],
  automations: [
    { key: 'name', label: 'Nome' }, { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'active', label: 'Activa', type: 'boolean' }, { key: 'trigger', label: 'Gatilho' }, { key: 'action', label: 'Acção' },
  ],
  pulse: [
    { key: 'title', label: 'Título' }, { key: 'text', label: 'Conteúdo', type: 'textarea' },
    { key: 'item_type', label: 'Tipo', placeholder: 'post' }, { key: 'is_pinned', label: 'Fixado', type: 'boolean' },
  ],
  workspaces: [
    { key: 'name', label: 'Nome' }, { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'privacy', label: 'Privacidade', placeholder: 'private' }, { key: 'members', label: 'Membros', type: 'list' },
    { key: 'linked_tasks', label: 'Tarefas ligadas', type: 'list' }, { key: 'linked_campaigns', label: 'Campanhas ligadas', type: 'list' },
  ],
};

const TITLES: Record<ProductionModule, { title: string; description: string }> = {
  cloud: { title: 'Minha Nuvem', description: 'Ficheiros empresariais persistidos no backend.' },
  calendar: { title: 'Calendário', description: 'Eventos reais da empresa, guardados no Firestore.' },
  meetings: { title: 'Reuniões', description: 'Reuniões e participantes ligados ao backend.' },
  integrations: { title: 'Integrações', description: 'Configurações e estado das integrações empresariais.' },
  'knowledge-base': { title: 'Base de Conhecimento', description: 'Conteúdo operacional persistente e pesquisável.' },
  campaigns: { title: 'Campanhas', description: 'Campanhas de marketing com orçamento e estado persistidos.' },
  tasks: { title: 'Tarefas', description: 'Tarefas operacionais com responsáveis e prazos.' },
  reports: { title: 'Relatórios', description: 'Catálogo de relatórios persistido no backend.' },
  workflows: { title: 'Workflows', description: 'Fluxos operacionais configuráveis e persistentes.' },
  automations: { title: 'Automações', description: 'Automações persistidas, activáveis e auditáveis.' },
  pulse: { title: 'Pulse', description: 'Feed interno persistido no backend.' },
  workspaces: { title: 'Workspaces', description: 'Espaços de trabalho e ligações entre recursos.' },
};

function displayValue(value: unknown): string {
  if (value == null) return '∅';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function initialForm(fields: FieldDef[], record?: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(fields.map((field) => {
    const value = record?.[field.key];
    if (field.type === 'list') return [field.key, Array.isArray(value) ? value.join(', ') : ''];
    return [field.key, value == null ? '' : String(value)];
  }));
}

function formPayload(fields: FieldDef[], form: Record<string, string>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = form[field.key] ?? '';
    if (!raw.trim()) continue;
    if (field.type === 'number') payload[field.key] = Number(raw);
    else if (field.type === 'boolean') payload[field.key] = raw === 'true';
    else if (field.type === 'list') payload[field.key] = raw.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 200);
    else payload[field.key] = raw.trim();
  }
  return payload;
}

export function ProductionModuleView({ module, recordId }: { module: ProductionModule; recordId?: string }) {
  const { toast } = useToast();
  const config = TITLES[module];
  const fields = FIELD_DEFS[module];
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => initialForm(fields));
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const url = recordId ? `/api/modules/${module}?id=${encodeURIComponent(recordId)}` : `/api/modules/${module}${q ? `?q=${encodeURIComponent(q)}` : ''}`;
      const response = await fetch(url, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Falha ao carregar');
      if (recordId) {
        setSelected(payload.data);
        setForm(initialForm(fields, payload.data));
      } else setRecords(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Falha ao carregar' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [module, recordId]);

  const visibleFields = useMemo(() => fields.slice(0, 5), [fields]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = formPayload(fields, form);
      const response = await fetch(`/api/modules/${module}${selected?.id ? `?id=${encodeURIComponent(String(selected.id))}` : ''}`, {
        method: selected?.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Falha ao guardar');
      toast({ title: 'Guardado', description: 'Os dados foram persistidos no backend.' });
      setSelected(result.data);
      setForm(initialForm(fields, result.data));
      if (!recordId) await load();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao guardar', description: error instanceof Error ? error.message : 'Falha ao guardar' });
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      const response = await fetch(`/api/modules/${module}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Falha ao apagar');
      toast({ title: 'Apagado', description: 'O registo foi removido do backend.' });
      await load();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Falha ao apagar' });
    }
  };

  const newRecord = () => { setSelected(null); setForm(initialForm(fields)); };

  if (recordId && selected) {
    return (
      <div className="p-6 fade-in space-y-6">
        <Button variant="ghost" onClick={() => window.history.back()}><ArrowLeft className="mr-2 h-4 w-4"/> Voltar</Button>
        <Card className="gradient-surface border-0 rounded-2xl">
          <CardHeader><CardTitle>{config.title}: editar registo</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2 space-y-2' : 'space-y-2'}>
                <label className="text-sm font-medium" htmlFor={`${module}-${field.key}`}>{field.label}</label>
                {field.type === 'textarea' ? <Textarea id={`${module}-${field.key}`} value={form[field.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} /> :
                  <Input id={`${module}-${field.key}`} type={field.type === 'number' ? 'number' : field.type === 'boolean' ? 'text' : field.type === 'date' ? 'date' : 'text'} placeholder={field.placeholder} value={form[field.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} />}
              </div>
            ))}
            <div className="md:col-span-2 flex justify-end"><Button className="btn-primary-gradient" onClick={() => void save()} disabled={saving}><Save className="mr-2 h-4 w-4"/>{saving ? 'A guardar...' : 'Guardar alterações'}</Button></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 fade-in space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-3xl font-bold text-foreground">{config.title}</h1><p className="text-muted-foreground mt-1">{config.description}</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/> Actualizar</Button><Button className="btn-primary-gradient" onClick={newRecord}><Plus className="mr-2 h-4 w-4"/> Novo</Button></div>
      </div>
      <Card className="gradient-surface border-0 rounded-2xl"><CardContent className="pt-6"><div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Pesquisar..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void load(); }} /></div></CardContent></Card>
      <Card className="gradient-surface border-0 rounded-2xl">
        <CardHeader><CardTitle>{records.length} registos reais</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin"/></div> : records.length === 0 ? <div className="py-16 text-center text-muted-foreground">Ainda não existem registos. Crie o primeiro para persistir dados reais.</div> :
            <div className="space-y-3">{records.map((record) => <div key={String(record.id)} className="border border-border/60 rounded-xl p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="font-semibold truncate">{displayValue(record[fields[0]?.key])}</h3><Badge variant="secondary">#{String(record.id).slice(0, 8)}</Badge></div><div className="grid gap-1 mt-2 md:grid-cols-2">{visibleFields.slice(1).map((field) => <p key={field.key} className="text-sm text-muted-foreground truncate"><span className="text-foreground/70">{field.label}:</span> {displayValue(record[field.key])}</p>)}</div></div>
              <div className="flex gap-2 shrink-0"><Button variant="outline" onClick={() => { setSelected(record); setForm(initialForm(fields, record)); }}><Pencil className="mr-2 h-4 w-4"/> Editar</Button><Button variant="ghost" size="icon" onClick={() => void remove(String(record.id))} aria-label="Apagar"><Trash2 className="h-4 w-4 text-destructive"/></Button></div>
            </div>)}</div>}
        </CardContent>
      </Card>
      <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle>{selected?.id ? 'Editar registo' : 'Novo registo'}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2 space-y-2' : 'space-y-2'}><label className="text-sm font-medium" htmlFor={`${module}-form-${field.key}`}>{field.label}</label>{field.type === 'textarea' ? <Textarea id={`${module}-form-${field.key}`} value={form[field.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}/> : <Input id={`${module}-form-${field.key}`} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} placeholder={field.type === 'boolean' ? 'true ou false' : field.placeholder} value={form[field.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}/>}</div>)}
        <div className="md:col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={newRecord}>Limpar</Button><Button className="btn-primary-gradient" onClick={() => void save()} disabled={saving}><Save className="mr-2 h-4 w-4"/>{saving ? 'A guardar...' : selected?.id ? 'Actualizar' : 'Criar registo'}</Button></div>
      </CardContent></Card>
    </div>
  );
}
