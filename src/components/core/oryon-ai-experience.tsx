'use client';

import { useEffect, useState } from 'react';
import { Activity, Bot, CalendarDays, FileText, FolderKanban, MessageSquare, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { OryonAIResponse, OryonBadge, OryonButton, OryonCard, OryonEntityHeader, OryonPanel } from '@/components/oryon-ui';

const scopes = [
  { key: 'operations', label: 'Operations', icon: Activity, agent: 'analyst', prefix: '' },
  { key: 'projects', label: 'Projects', icon: FolderKanban, agent: 'analyst', prefix: 'Project context: ' },
  { key: 'meetings', label: 'Meetings', icon: CalendarDays, agent: 'analyst', prefix: 'Meeting context: ' },
  { key: 'knowledge', label: 'Knowledge', icon: FileText, agent: 'knowledge', prefix: '' },
  { key: 'reports', label: 'Reports', icon: MessageSquare, agent: 'report-builder', prefix: '' },
  { key: 'automation', label: 'Automation', icon: Workflow, agent: 'workflow-builder', prefix: '' },
] as const;

type AgentResult = { answer?: string; plan?: unknown[]; toolResults?: unknown[]; sources?: string[]; confidence?: number; createdWorkflow?: boolean; createdReport?: boolean };

type RiskResult = { risks?: unknown[]; predictions?: unknown[] };

export default function OryonAIExperience() {
  const [scope, setScope] = useState<(typeof scopes)[number]['key']>('operations');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [risk, setRisk] = useState<RiskResult | null>(null);

  useEffect(() => {
    fetch('/api/ai/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ agent: 'risk', horizonDays: 7 }),
    }).then((response) => response.json()).then(setRisk).catch(() => setRisk(null));
  }, []);

  const ask = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const selected = scopes.find((item) => item.key === scope) ?? scopes[0];
      const contextualPrompt = `${selected.prefix}${prompt.trim()}`;
      const body = { agent: selected.agent, prompt: contextualPrompt, execute: false };
      const response = await fetch('/api/ai/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'AI_AGENT_FAILED');
      setResult(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao executar OryonAI');
    } finally {
      setBusy(false);
    }
  };

  const selectedScope = scopes.find((item) => item.key === scope) ?? scopes[0];

  return (
    <div className="grid gap-6">
      <OryonEntityHeader
        title="Ask Oryon"
        subtitle="Descreva o que precisa. O sistema escolhe internamente o agente e as ferramentas adequados, sempre respeitando a autorização do servidor."
        meta={<OryonBadge tone="accent"><Sparkles className="mr-1 h-3 w-3" />Oryon Intelligence</OryonBadge>}
        actions={<div className="flex items-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Tools autorizadas</div>}
      />

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <OryonPanel className="p-3">
          <p className="px-2 py-2 text-label">Context</p>
          {scopes.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={scope === key}
              onClick={() => { setScope(key); setResult(null); setError(null); }}
              className={`flex min-h-10 w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[12px] transition-colors ${scope === key ? 'bg-primary/[0.08] text-primary' : 'text-muted-foreground hover:bg-surface-1'}`}
            >
              <Icon aria-hidden className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </OryonPanel>

        <div className="grid gap-4">
          <OryonPanel elevated className="p-5">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary/10 text-primary"><Bot aria-hidden className="h-4 w-4" /></div>
              <div><p className="text-[12px] font-semibold">What do you need?</p><p className="text-[11px] text-muted-foreground">Context: {selectedScope.label}</p></div>
            </div>
            <textarea
              aria-label="Pergunta para o OryonAI"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ex.: Resume o trabalho em risco e sugere as três decisões mais importantes."
              className="mt-5 min-h-32 w-full resize-y rounded-[10px] border border-border bg-surface-1 p-3 text-[13px] leading-5 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[10px] text-muted-foreground">O utilizador trabalha com intenção, contexto e resultado. A orquestração de agentes permanece interna.</p>
              <OryonButton onClick={() => void ask()} disabled={busy || !prompt.trim()} aria-busy={busy}>
                <Sparkles aria-hidden className="h-3.5 w-3.5" />
                {busy ? 'A analisar…' : 'Ask Oryon'}
              </OryonButton>
            </div>
          </OryonPanel>

          {error ? (
            <OryonCard role="alert" className="border-[hsl(var(--status-danger)/0.35)] bg-[hsl(var(--status-danger)/0.06)] p-4 text-sm text-[hsl(var(--status-danger))]">
              <div className="flex items-center justify-between gap-3"><span>{error}</span><OryonButton size="sm" variant="outline" onClick={() => void ask()} disabled={busy || !prompt.trim()}>Tentar novamente</OryonButton></div>
            </OryonCard>
          ) : null}

          {result ? (
            <OryonAIResponse
              status="ready"
              answer={result.answer ?? 'Resposta recebida.'}
              evidence={result.plan?.length ? `${result.plan.length} passos no plano.` : (result.toolResults?.length ? `${result.toolResults.length} ferramentas utilizadas.` : undefined)}
              sources={Array.isArray(result.sources) ? result.sources.join(' · ') : undefined}
              confidence={typeof result.confidence === 'number' ? result.confidence : undefined}
              nextStep={result.createdWorkflow ? 'Workflow criado no control plane.' : (result.createdReport ? 'Relatório criado.' : 'Reveja a resposta e continue a partir do contexto apresentado.')}
            />
          ) : null}

          <OryonPanel className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-label text-primary">Risk Engine</p><p className="mt-1 text-[12px] text-muted-foreground">Sinais operacionais, separados da pergunta principal.</p></div>
              <OryonBadge>{Array.isArray(risk?.risks) ? risk.risks.length : (Array.isArray(risk?.predictions) ? risk.predictions.length : 0)} sinais</OryonBadge>
            </div>
          </OryonPanel>
        </div>
      </div>
    </div>
  );
}
