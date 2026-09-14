'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, List, Plus, Search, SquareKanban, Timer, X } from 'lucide-react';
import { OryonBadge, OryonButton, OryonCard, OryonDataGrid, OryonEmptyState, OryonInspector, OryonInput, OryonPanel, OryonSelect, OryonStatus, OryonTimeline } from '@/components/oryon-ui';

type Task = Record<string, any> & { id: string; title?: string; status?: string; priority?: string; dueDate?: string; description?: string; assignedTo?: string[] };
type Mode = 'list' | 'board' | 'timeline';
const buckets = [{ key: 'todo', label: 'Today' }, { key: 'upcoming', label: 'Upcoming' }, { key: 'overdue', label: 'Overdue' }, { key: 'waiting', label: 'Waiting' }, { key: 'done', label: 'Completed' }];

function classify(task: Task): string { const status = String(task.status ?? '').toLowerCase(); if (status.includes('done') || status.includes('complete')) return 'done'; if (status.includes('wait')) return 'waiting'; if (task.dueDate && new Date(task.dueDate).getTime() < Date.now() && !status.includes('done')) return 'overdue'; const day = task.dueDate ? new Date(task.dueDate).toDateString() === new Date().toDateString() : false; return day || !task.dueDate ? 'todo' : 'upcoming'; }

export default function TasksExperience() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [q, setQ] = useState('');
  const [bucket, setBucket] = useState('todo');
  const [mode, setMode] = useState<Mode>('list');
  const [selected, setSelected] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/modules/tasks${q ? `?q=${encodeURIComponent(q)}` : ''}`, { cache: 'no-store', credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Não foi possível carregar as tarefas.');
      setTasks(Array.isArray(payload.data) ? payload.data : []);
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : 'Não foi possível carregar as tarefas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTask.title.trim()) return;
    setCreateError(null);
    try {
      const response = await fetch('/api/modules/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          priority: newTask.priority,
          status: 'todo',
          dueDate: newTask.dueDate || undefined,
          assignedTo: [],
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Não foi possível criar a tarefa.');
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
      setCreating(false);
      await load();
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : 'Não foi possível criar a tarefa.');
    }
  };

  const grouped = useMemo(() => Object.fromEntries(buckets.map((item) => [item.key, tasks.filter((task) => classify(task) === item.key)])), [tasks]);
  const visible = useMemo(() => (grouped[bucket] as Task[] ?? []).filter((task) => filter === 'all' || String(task.priority ?? 'medium').toLowerCase() === filter), [bucket, grouped, filter]);

  return <div className="grid gap-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-label">Work</p><h1 className="mt-1 text-h1">My Work</h1><p className="mt-1 text-body-small text-muted-foreground">Uma fila pessoal para decidir, executar e terminar trabalho.</p></div><div className="flex flex-wrap gap-2"><OryonButton variant="outline" size="sm" onClick={() => void load()}><Timer className="h-3.5 w-3.5" />Actualizar</OryonButton><OryonButton size="sm" onClick={() => { setCreating(true); setCreateError(null); }}><Plus className="h-3.5 w-3.5" />Nova tarefa</OryonButton></div></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{buckets.map((item) => <button key={item.key} type="button" onClick={() => setBucket(item.key)} className={`rounded-[8px] border p-3 text-left transition-colors duration-150 ${bucket === item.key ? 'border-primary/50 bg-primary/[0.06]' : 'border-border bg-surface-1 hover:bg-surface-2'}`}><span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{item.label}</span><span className="mt-1 block text-xl font-semibold tabular-nums text-foreground">{(grouped[item.key] as Task[]).length}</span></button>)}</div>
    <OryonPanel className="p-3"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><OryonInput className="pl-9" aria-label="Pesquisar tarefas" placeholder="Pesquisar trabalho…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void load()} /></div><div className="flex items-center gap-2"><OryonSelect aria-label="Prioridade" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Todas as prioridades</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></OryonSelect><div className="flex rounded-[8px] border border-border p-0.5"><button className={`rounded-[6px] p-2 ${mode==='list'?'bg-surface-2 text-primary':'text-muted-foreground'}`} onClick={() => setMode('list')} aria-label="Lista"><List className="h-4 w-4"/></button><button className={`rounded-[6px] p-2 ${mode==='board'?'bg-surface-2 text-primary':'text-muted-foreground'}`} onClick={() => setMode('board')} aria-label="Board"><SquareKanban className="h-4 w-4"/></button><button className={`rounded-[6px] p-2 ${mode==='timeline'?'bg-surface-2 text-primary':'text-muted-foreground'}`} onClick={() => setMode('timeline')} aria-label="Timeline"><Clock3 className="h-4 w-4"/></button></div></div></div></OryonPanel>

    {createError && <OryonCard className="border border-[hsl(var(--status-danger))] p-4 text-sm text-[hsl(var(--status-danger))]" role="alert">{createError}</OryonCard>}
    {loading ? <OryonCard className="p-8 text-sm text-muted-foreground">A carregar trabalho…</OryonCard> : !visible.length ? <OryonEmptyState icon={<Check className="h-5 w-5" />} title={`Sem trabalho em ${buckets.find((x) => x.key === bucket)?.label ?? bucket}`} description="A fila está limpa para este contexto." /> : mode === 'timeline' ? <OryonPanel className="p-5"><OryonTimeline items={visible.map((task) => ({ title: task.title ?? 'Tarefa', meta: task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-PT') : 'Sem prazo', description: task.description, status: classify(task) === 'done' ? 'done' : classify(task) === 'todo' ? 'current' : 'pending' }))} /></OryonPanel> : mode === 'board' ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{['todo','in_progress','blocked','done'].map((status) => <OryonPanel key={status} className="p-3"><div className="mb-2 flex items-center justify-between"><span className="text-label capitalize">{status.replace('_',' ')}</span><OryonBadge>{tasks.filter((task) => String(task.status ?? '').toLowerCase().includes(status.replace('_',' ')) || (status === 'todo' && !task.status)).length}</OryonBadge></div>{tasks.filter((task) => String(task.status ?? '').toLowerCase().includes(status.replace('_',' ')) || (status === 'todo' && !task.status)).slice(0,8).map((task) => <button key={task.id} onClick={() => setSelected(task)} className="mb-1.5 block w-full rounded-[8px] border border-border bg-surface-1 p-3 text-left hover:bg-surface-2"><span className="block text-[12px] font-medium text-foreground">{task.title ?? 'Tarefa'}</span><span className="mt-1 block text-[10px] text-muted-foreground">{task.priority ?? 'medium'} · {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-PT') : 'sem prazo'}</span></button>)}</OryonPanel>)}</div> : <OryonPanel className="overflow-hidden"><OryonDataGrid headers={['Task','Priority','Due','Status','Owner']} rows={visible.map((task) => [<button key={`${task.id}-title`} onClick={() => setSelected(task)} className="text-left font-medium hover:text-primary">{task.title ?? 'Tarefa'}</button>, <OryonBadge key={`${task.id}-priority`} tone={String(task.priority).toLowerCase()==='critical'?'danger':String(task.priority).toLowerCase()==='high'?'warning':'neutral'}>{task.priority ?? 'medium'}</OryonBadge>, task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-PT') : 'Sem prazo', <OryonStatus status={classify(task)==='done'?'active':classify(task)==='overdue'?'critical':'idle'} label={task.status ?? 'todo'} />, Array.isArray(task.assignedTo) ? task.assignedTo.join(', ') : String(task.assignedTo ?? 'Não atribuído')])} /></OryonPanel>}

    {creating && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="presentation" onClick={() => setCreating(false)}><div className="w-full max-w-lg rounded-2xl border border-border bg-surface-1 p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="create-task-title" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><h2 id="create-task-title" className="text-h2">Nova tarefa</h2><p className="mt-1 text-body-small text-muted-foreground">Criada directamente no workspace operacional.</p></div><button type="button" onClick={() => setCreating(false)} aria-label="Fechar"><X className="h-5 w-5" /></button></div><form className="mt-5 space-y-4" onSubmit={createTask}><div><label className="text-label" htmlFor="task-title">Título</label><OryonInput id="task-title" className="mt-1" value={newTask.title} onChange={(event) => setNewTask((value) => ({ ...value, title: event.target.value }))} placeholder="Ex.: Rever relatório semanal" required autoFocus /></div><div><label className="text-label" htmlFor="task-description">Descrição</label><textarea id="task-description" className="mt-1 min-h-28 w-full rounded-[8px] border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary" value={newTask.description} onChange={(event) => setNewTask((value) => ({ ...value, description: event.target.value }))} placeholder="Contexto e resultado esperado" /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className="text-label" htmlFor="task-priority">Prioridade</label><OryonSelect id="task-priority" className="mt-1 w-full" value={newTask.priority} onChange={(event) => setNewTask((value) => ({ ...value, priority: event.target.value }))}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></OryonSelect></div><div><label className="text-label" htmlFor="task-due">Prazo</label><OryonInput id="task-due" type="datetime-local" className="mt-1" value={newTask.dueDate} onChange={(event) => setNewTask((value) => ({ ...value, dueDate: event.target.value }))} /></div></div><div className="flex justify-end gap-2 pt-2"><OryonButton type="button" variant="ghost" onClick={() => setCreating(false)}>Cancelar</OryonButton><OryonButton type="submit"><Plus className="h-3.5 w-3.5" />Criar tarefa</OryonButton></div></form></div></div>}

    {selected ? <div className="fixed inset-0 z-50 flex justify-end bg-black/45" role="presentation" onClick={() => setSelected(null)}><div className="h-full w-[min(92vw,460px)]" onClick={(e) => e.stopPropagation()}><OryonInspector title="Task inspector"><div className="space-y-5"><div><p className="text-label">Task</p><h2 className="mt-1 text-h2">{selected.title ?? 'Tarefa'}</h2><p className="mt-1 text-body-small text-muted-foreground">{selected.description ?? 'Sem descrição.'}</p></div><div className="grid gap-3"><div className="rounded-[8px] border border-border bg-surface-1 p-3"><span className="text-label">Status</span><p className="mt-1 text-[13px]">{selected.status ?? 'todo'}</p></div><div className="rounded-[8px] border border-border bg-surface-1 p-3"><span className="text-label">Priority</span><p className="mt-1 text-[13px]">{selected.priority ?? 'medium'}</p></div><div className="rounded-[8px] border border-border bg-surface-1 p-3"><span className="text-label">Due</span><p className="mt-1 text-[13px]">{selected.dueDate ? new Date(selected.dueDate).toLocaleString('pt-PT') : 'Sem prazo'}</p></div><div className="rounded-[8px] border border-border bg-surface-1 p-3"><span className="text-label">Owner</span><p className="mt-1 text-[13px]">{Array.isArray(selected.assignedTo) ? selected.assignedTo.join(', ') : String(selected.assignedTo ?? 'Não atribuído')}</p></div></div><div className="flex gap-2"><OryonButton onClick={() => { window.location.href = `/dashboard/tasks?id=${encodeURIComponent(selected.id)}`; }}>Abrir tarefa</OryonButton><OryonButton variant="ghost" onClick={() => setSelected(null)}><X className="h-4 w-4"/>Fechar</OryonButton></div></div></OryonInspector></div></div> : null}
  </div>;
}
