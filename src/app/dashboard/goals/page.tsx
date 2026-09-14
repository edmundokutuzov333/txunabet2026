'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Flag, Plus, RefreshCw, Target } from 'lucide-react';
import { OryonBadge, OryonButton, OryonCard, OryonEmptyState, OryonEntityHeader, OryonInput, OryonPanel, OryonSelect } from '@/components/oryon-ui';

type Goal = {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  progress?: number;
  status?: string;
  dueDate?: string;
  ownerId?: string;
  updatedAt?: string;
};

const statusTone = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes('complete') || normalized === 'done') return 'success' as const;
  if (normalized.includes('risk') || normalized.includes('blocked')) return 'danger' as const;
  if (normalized.includes('progress')) return 'accent' as const;
  return 'neutral' as const;
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/goals', { cache: 'no-store', credentials: 'include' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Falha ao carregar objectivos.');
      setGoals(Array.isArray(payload.data) ? payload.data : []);
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const complete = goals.filter((goal) => Number(goal.progress ?? 0) >= 100).length;
    const risk = goals.filter((goal) => /risk|blocked/i.test(String(goal.status ?? ''))).length;
    const progress = goals.length ? Math.round(goals.reduce((sum, goal) => sum + Number(goal.progress ?? 0), 0) / goals.length) : 0;
    return { total: goals.length, complete, risk, progress };
  }, [goals]);

  const createGoal = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: title.trim(), description, status, progress: 0 }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Falha ao criar objectivo.');
      setGoals((current) => [payload.data as Goal, ...current]);
      setTitle('');
      setDescription('');
      setStatus('active');
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  };

  const updateProgress = async (goal: Goal, progress: number) => {
    const safeProgress = Math.min(100, Math.max(0, progress));
    const response = await fetch(`/api/goals?id=${encodeURIComponent(goal.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ progress: safeProgress, status: safeProgress >= 100 ? 'completed' : goal.status ?? 'active' }),
    });
    const payload = await response.json();
    if (!response.ok) return;
    setGoals((current) => current.map((item) => item.id === goal.id ? payload.data as Goal : item));
  };

  return (
    <div className="grid gap-5">
      <OryonEntityHeader
        title="Goals"
        subtitle="Objectivos operacionais ligados à execução real do Oryon."
        meta={<OryonBadge tone="accent"><Target className="mr-1 h-3 w-3" />{stats.progress}% progresso médio</OryonBadge>}
        actions={<div className="flex gap-2"><OryonButton variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />Actualizar</OryonButton><OryonButton size="sm" onClick={() => setShowCreate((value) => !value)}><Plus className="h-3.5 w-3.5" />Novo objectivo</OryonButton></div>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OryonCard className="p-4"><p className="text-label">Objectivos</p><p className="mt-2 text-2xl font-semibold text-numeric">{stats.total}</p></OryonCard>
        <OryonCard className="p-4"><p className="text-label">Concluídos</p><p className="mt-2 text-2xl font-semibold text-numeric">{stats.complete}</p></OryonCard>
        <OryonCard className="p-4"><p className="text-label">Em risco</p><p className="mt-2 text-2xl font-semibold text-numeric">{stats.risk}</p></OryonCard>
        <OryonCard className="p-4"><p className="text-label">Progresso médio</p><p className="mt-2 text-2xl font-semibold text-numeric">{stats.progress}%</p></OryonCard>
      </div>

      {showCreate ? (
        <OryonPanel elevated className="p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px_auto] lg:items-end">
            <OryonInput label="Título" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Reduzir backlog operacional" />
            <OryonInput label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Resultado esperado" />
            <OryonSelect label="Estado" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active</option><option value="in-progress">In progress</option><option value="at-risk">At risk</option></OryonSelect>
            <OryonButton onClick={() => void createGoal()} disabled={saving || !title.trim()}><Check className="h-3.5 w-3.5" />{saving ? 'A guardar…' : 'Guardar'}</OryonButton>
          </div>
        </OryonPanel>
      ) : null}

      {loading ? (
        <OryonPanel className="p-10 text-center text-sm text-muted-foreground">A carregar objectivos…</OryonPanel>
      ) : goals.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {goals.map((goal) => {
            const value = Math.min(100, Math.max(0, Number(goal.progress ?? 0)));
            const state = String(goal.status ?? 'active');
            return (
              <OryonPanel key={goal.id} className="p-4" elevated={value >= 100}>
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-primary/10 text-primary"><Flag className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13px] font-semibold text-foreground">{goal.title ?? goal.name ?? 'Objectivo'}</p><OryonBadge tone={statusTone(state)}>{state}</OryonBadge></div>
                    {goal.description ? <p className="mt-1 text-body-small text-muted-foreground">{goal.description}</p> : null}
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${value}%` }} /></div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-muted-foreground"><span>{value}% concluído</span><span>{goal.dueDate ? new Date(goal.dueDate).toLocaleDateString('pt-PT') : 'Sem prazo'}</span></div>
                    <div className="mt-3 flex flex-wrap gap-1.5"><OryonButton variant="ghost" size="sm" onClick={() => void updateProgress(goal, value + 10)} disabled={value >= 100}>+10%</OryonButton><OryonButton variant="ghost" size="sm" onClick={() => void updateProgress(goal, 100)} disabled={value >= 100}>Concluir</OryonButton></div>
                  </div>
                </div>
              </OryonPanel>
            );
          })}
        </div>
      ) : (
        <OryonEmptyState icon={<Target className="h-5 w-5" />} title="Sem objectivos" description="Crie o primeiro objectivo para começar a acompanhar progresso e estado operacional." action={<OryonButton onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5" />Criar objectivo</OryonButton>} />
      )}
    </div>
  );
}
