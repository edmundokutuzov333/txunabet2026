import 'server-only';

import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity, type AuthenticatedIdentity } from '@/server/authorization';
import { enterpriseSearch, type SearchResult } from '@/server/services/enterprise-context';
import { getModuleAnalytics, listModuleRecords } from '@/server/services/legacy-modules';
import { getAIToolDefinitions, AI_TOOLS } from '@/server/services/ai-tools';
import { executeAITool, runAIGateway, type AIModelTier } from '@/server/services/ai-core';
import { createWorkflow } from '@/server/services/automation-control';
import { writeAuditEvent } from '@/server/repositories/audit';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export type AgentName = 'executive' | 'analyst' | 'project-manager' | 'meeting' | 'knowledge' | 'workflow-builder' | 'report-builder';

function compactRows(rows: SearchResult[]): SearchResult[] {
  return rows.slice(0, 40).map((row) => ({ ...row, snippet: row.snippet.slice(0, 420) }));
}

async function searchMany(queries: string[], identity: AuthenticatedIdentity): Promise<SearchResult[]> {
  const results = await Promise.all(queries.slice(0, 6).map((q) => enterpriseSearch({ q, scope: 'all', limit: 12, semantic: true })));
  const map = new Map<string, SearchResult>();
  for (const row of results.flat()) if (!map.has(`${row.type}:${row.id}`)) map.set(`${row.type}:${row.id}`, row);
  return compactRows(Array.from(map.values()).sort((a, b) => b.score - a.score));
}

function fallbackText(input: unknown): string {
  return typeof input === 'string' ? input : JSON.stringify(input);
}

async function runAgentPlan(params: {
  agent: AgentName;
  task: string;
  context: unknown;
  tier?: AIModelTier;
  execute?: boolean;
  identity: AuthenticatedIdentity;
}) {
  const definitions = getAIToolDefinitions();
  const planning = await runAIGateway({
    agent: `Oryon ${params.agent}`,
    tier: params.tier ?? 'balanced',
    outputMode: 'json',
    identity: params.identity,
    context: { ...params.context, availableTools: definitions },
    instruction: `${params.task}\nProduza JSON estrito com: answer, toolCalls[{tool,input,reason}], confidence, sources. Use apenas ferramentas disponíveis. Não execute uma ferramenta de escrita para satisfazer uma pergunta de análise. Para alterações, proponha primeiro; só inclua chamadas write/sensitive quando a intenção explícita exigir execução.`,
  });
  const parsed = planning.json as { answer?: string; toolCalls?: Array<{ tool: string; input?: Record<string, unknown>; reason?: string }>; confidence?: number; sources?: string[] };
  const toolCalls = Array.isArray(parsed.toolCalls) ? parsed.toolCalls.slice(0, 12) : [];
  const outputs: Array<{ tool: string; input: Record<string, unknown>; result?: unknown; error?: string }> = [];
  if (params.execute) {
    for (const call of toolCalls) {
      const tool = AI_TOOLS.find((item) => item.name === call.tool);
      if (!tool) { outputs.push({ tool: call.tool, input: call.input ?? {}, error: 'AI_TOOL_NOT_FOUND' }); continue; }
      if (tool.risk === 'sensitive' && params.identity.role !== 'owner' && params.identity.role !== 'admin') {
        outputs.push({ tool: tool.name, input: call.input ?? {}, error: 'SENSITIVE_TOOL_REQUIRES_ADMIN' });
        continue;
      }
      try { outputs.push({ tool: tool.name, input: call.input ?? {}, result: await executeAITool(tool, call.input ?? {}, params.identity) }); }
      catch (error) { outputs.push({ tool: tool.name, input: call.input ?? {}, error: error instanceof Error ? error.message : 'AI_TOOL_FAILED' }); }
    }
  }
  const finalContext = outputs.length ? { plan: parsed, toolResults: outputs, sourceContext: params.context } : undefined;
  const final = outputs.length
    ? await runAIGateway({ agent: `Oryon ${params.agent}`, tier: 'fast', identity: params.identity, context: finalContext, instruction: 'Reavalie o resultado das ferramentas. Responda ao pedido, indicando claramente o que foi executado, o que falhou e quais factos sustentam a conclusão. Não invente dados.' })
    : { text: fallbackText(parsed.answer ?? ''), model: planning.model, usageEstimate: planning.usageEstimate };
  return { agent: params.agent, answer: final.text ?? parsed.answer ?? '', confidence: Number(parsed.confidence ?? 0.5), sources: parsed.sources ?? [], plan: toolCalls, toolResults: outputs, model: final.model };
}

export async function executiveBriefing(options: { days?: number; execute?: boolean } = {}) {
  const identity = await requireIdentity();
  const days = Math.min(Math.max(options.days ?? 1, 1), 7);
  const queries = ['atividade recente mensagens decisões', 'tarefas atrasadas próximas entregas', 'reuniões recentes decisões action items', 'projetos riscos atrasos progresso', 'goals metas progresso', 'incidentes falhas workflows reports'];
  const [search, analytics] = await Promise.all([searchMany(queries, identity), getModuleAnalytics()]);
  return runAgentPlan({ agent: 'executive', execute: Boolean(options.execute), identity, tier: 'balanced', task: `Crie o briefing executivo dos últimos ${days} dia(s). Responda: o que aconteceu enquanto o utilizador esteve offline, o que exige atenção, principais decisões, atrasos, riscos e próximas ações. Use apenas evidência fornecida.`, context: { days, analytics, search } });
}

export async function analyzeBusinessQuestion(question: string, options: { execute?: boolean } = {}) {
  const identity = await requireIdentity();
  const search = await searchMany([question, `${question} campanhas`, `${question} tarefas`, `${question} workload`, `${question} projetos`, `${question} decisões incidentes`], identity);
  const [campaigns, tasks, analytics] = await Promise.all([
    listModuleRecords('campaigns', { limit: 120 }),
    listModuleRecords('tasks', { limit: 200 }),
    getModuleAnalytics(),
  ]);
  return runAgentPlan({ agent: 'analyst', execute: Boolean(options.execute), identity, tier: 'deep', task: `Analise a pergunta: ${question}. Compare períodos quando os dados permitirem. Explique causalidade apenas como hipótese, separando facto de inferência, e cite evidência.`, context: { question, analytics, campaigns: campaigns.slice(0, 120), tasks: tasks.slice(0, 200), search } });
}

export async function manageProject(projectId: string, options: { execute?: boolean } = {}) {
  const identity = await requireIdentity();
  const [search, tasks, projects] = await Promise.all([
    enterpriseSearch({ q: projectId, scope: 'all', limit: 20, semantic: true }),
    listModuleRecords('tasks', { limit: 200 }),
    listModuleRecords('workspaces', { limit: 100 }),
  ]);
  const project = projects.find((item) => String(item.id) === projectId) ?? null;
  const projectTasks = tasks.filter((item) => String(item.projectId ?? item.contextId ?? '') === projectId).slice(0, 100);
  return runAgentPlan({ agent: 'project-manager', execute: Boolean(options.execute), identity, tier: 'balanced', task: `Acompanhe o projeto ${projectId}. Detete atrasos e congestionamento, resuma progresso, proponha correções, prepare status report e só reatribua tarefas quando autorizado pela execução.`, context: { project, projectTasks, relatedSearch: search } });
}

export async function analyzeMeeting(meetingId: string, instruction = 'Prepare e execute a análise pós-reunião.') {
  const identity = await requireIdentity();
  const search = await enterpriseSearch({ q: meetingId, scope: 'meetings', limit: 10, semantic: true });
  return runAgentPlan({ agent: 'meeting', execute: true, identity, tier: 'balanced', task: `${instruction} Para a reunião ${meetingId}, gere agenda se estiver ausente, identifique decisões, action items, responsáveis e próximos passos. Crie tasks apenas quando houver action items suficientemente explícitos.`, context: { meetingId, search } });
}

export async function answerKnowledgeQuestion(question: string) {
  const identity = await requireIdentity();
  const search = await searchMany([question, `processo ${question}`, `política ${question}`, `procedimento ${question}`], identity);
  return runAgentPlan({ agent: 'knowledge', execute: false, identity, tier: 'balanced', task: `Responda à pergunta de conhecimento: ${question}. Cite fontes pelo tipo e id do resultado. Quando a evidência for insuficiente, diga isso explicitamente.`, context: { question, sources: search } });
}

export async function buildWorkflowFromPrompt(prompt: string, options: { execute?: boolean } = {}) {
  const identity = await requireIdentity();
  const result = await runAgentPlan({ agent: 'workflow-builder', execute: false, identity, tier: 'deep', task: `Converta este pedido em um workflow executável: ${prompt}. Crie uma sequência clara de gatilho, ações, condições e espera. O output deve ser suficientemente estruturado para o control plane.`, context: { prompt } });
  if (!options.execute) return result;
  const parsedPlan = result.plan;
  const draft = await runAIGateway({ agent: 'Oryon workflow builder', tier: 'deep', outputMode: 'json', identity, context: { prompt, plan: parsedPlan }, instruction: 'Produza um WorkflowControl válido em JSON: name, description, active, executionTimeoutMs, retryPolicy, steps[{id,type,name,config}]. Use apenas step types log,http,module.create,module.update,module.delete,condition,action. Não inclua segredos.' });
  const created = await createWorkflow(draft.json);
  return { ...result, createdWorkflow: created };
}

export async function buildWeeklyReport(topic: string, options: { execute?: boolean } = {}) {
  const identity = await requireIdentity();
  const [analytics, campaigns, tasks, search] = await Promise.all([
    getModuleAnalytics(),
    listModuleRecords('campaigns', { limit: 150 }),
    listModuleRecords('tasks', { limit: 250 }),
    searchMany([topic, `${topic} performance`, `${topic} decisions`, `${topic} risks`], identity),
  ]);
  const context = { topic, analytics, campaigns, tasks, search };
  const result = await runAgentPlan({ agent: 'report-builder', execute: false, identity, tier: 'deep', task: `Construa um relatório semanal de ${topic}. Selecione fontes, métricas, filtros, gráficos recomendados e síntese executiva. Não invente métricas.`, context });
  if (!options.execute) return result;
  const report = await runAIGateway({ agent: 'Oryon report builder', tier: 'deep', outputMode: 'json', identity, context: { topic, result, data: context }, instruction: 'Produza JSON para createReport com name,description,summary,content,dataSources,metrics,filters,charts. Use somente dados fornecidos.' });
  const generated = await (await import('@/server/services/ai-tools')).AI_TOOLS.find((tool) => tool.name === 'createReport')!.execute(report.json as Record<string, unknown>, identity);
  return { ...result, createdReport: generated };
}

export async function buildOperationsRisk(options: { horizonDays?: number } = {}) {
  const identity = await requireIdentity();
  const now = Date.now();
  const horizonDays = Math.min(Math.max(options.horizonDays ?? 7, 1), 30);
  const [tasks, projects, approvals, jobs, analytics] = await Promise.all([
    listModuleRecords('tasks', { limit: 400 }),
    listModuleRecords('workspaces', { limit: 200 }),
    (async () => { const snapshot = await getAdminDb().collection('approvals').where('companyId', '==', identity.companyId).limit(300).get(); return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })); })(),
    (async () => { const snapshot = await getAdminDb().collection('automation_jobs').where('companyId', '==', identity.companyId).limit(300).get(); return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })); })(),
    getModuleAnalytics(),
  ]);
  const risks: Array<Record<string, unknown>> = [];
  const dueSoon = tasks.filter((task) => { const date = Date.parse(String(task.dueDate ?? '')); return Number.isFinite(date) && date >= now && date <= now + horizonDays * 86400000 && !['done','completed','cancelled'].includes(String(task.status).toLowerCase()); });
  const overdue = tasks.filter((task) => { const date = Date.parse(String(task.dueDate ?? '')); return Number.isFinite(date) && date < now && !['done','completed','cancelled'].includes(String(task.status).toLowerCase()); });
  const congestion = new Map<string, number>();
  for (const task of tasks) { const owner = String(task.assigneeId ?? task.ownerId ?? 'unassigned'); congestion.set(owner, (congestion.get(owner) ?? 0) + 1); }
  const maxCongestion = Math.max(0, ...congestion.values());
  if (overdue.length) risks.push({ type: 'project_delay', probability: Math.min(0.95, 0.5 + overdue.length / Math.max(tasks.length, 1) * 0.5), impact: overdue.length > 10 ? 'high' : 'medium', reason: `${overdue.length} tarefas estão atrasadas.`, recommendedAction: 'Revisar dependências, responsáveis e prazos.' });
  if (dueSoon.length >= Math.max(5, tasks.length * 0.2)) risks.push({ type: 'deadline_pressure', probability: Math.min(0.9, 0.35 + dueSoon.length / Math.max(tasks.length, 1) * 0.6), impact: dueSoon.length > 15 ? 'high' : 'medium', reason: `${dueSoon.length} tarefas vencem em ${horizonDays} dias.`, recommendedAction: 'Reordenar prioridades e reservar capacidade.' });
  if (maxCongestion >= 15) risks.push({ type: 'workload', probability: Math.min(0.9, 0.4 + maxCongestion / 50), impact: maxCongestion >= 25 ? 'high' : 'medium', reason: `A maior carga atual é ${maxCongestion} tarefas por responsável.`, recommendedAction: 'Redistribuir carga apenas após validação do manager.' });
  const pendingApprovals = approvals.filter((a) => ['PENDING','IN_REVIEW','pending'].includes(String(a.state ?? a.status)));
  if (pendingApprovals.length >= 5) risks.push({ type: 'approval_delay', probability: Math.min(0.85, 0.35 + pendingApprovals.length / 50), impact: pendingApprovals.length > 15 ? 'high' : 'medium', reason: `${pendingApprovals.length} aprovações estão pendentes.`, recommendedAction: 'Rever SLAs e escalamentos de aprovação.' });
  const failedJobs = jobs.filter((job) => ['failed','dead'].includes(String(job.status).toLowerCase()));
  if (failedJobs.length >= 3) risks.push({ type: 'workflow_failure', probability: Math.min(0.9, 0.3 + failedJobs.length / 30), impact: failedJobs.length > 10 ? 'high' : 'medium', reason: `${failedJobs.length} jobs de automação falharam ou estão em dead letter.`, recommendedAction: 'Inspecionar erros, dependências e reexecutar apenas após validação.' });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'ai.risk.scan', resourceType: 'risk-engine', resourceId: identity.uid, metadata: { horizonDays, riskCount: risks.length } });
  return { generatedAt: new Date().toISOString(), horizonDays, risks, evidence: { taskCount: tasks.length, overdue: overdue.length, dueSoon: dueSoon.length, projectCount: projects.length, pendingApprovals: pendingApprovals.length, failedJobs: failedJobs.length, analytics } };
}

export async function predictiveOperations(options: { horizonDays?: number } = {}) {
  const identity = await requireIdentity();
  const horizonDays = Math.min(Math.max(options.horizonDays ?? 7, 1), 30);
  const risk = await buildOperationsRisk({ horizonDays });
  const db = getAdminDb();
  const history = await db.collection('automation_runs').where('companyId', '==', identity.companyId).limit(500).get();
  const runs = history.docs.map((d) => d.data() as Record<string, unknown>);
  const completed = runs.filter((run) => ['success','completed'].includes(String(run.status).toLowerCase())).length;
  const failed = runs.filter((run) => ['failed','dead'].includes(String(run.status).toLowerCase())).length;
  const historicalRuns = completed + failed;
  const failureRate = historicalRuns ? failed / historicalRuns : null;
  const predictions = risk.risks.map((item) => ({ ...item, basis: historicalRuns >= 20 ? 'Combinação de sinais operacionais atuais com histórico de automações.' : 'Sinais operacionais atuais; histórico insuficiente para uma previsão estatística robusta.', historicalAutomationRuns: historicalRuns, historicalAutomationFailureRate: failureRate }));
  return { ...risk, predictionStatus: historicalRuns >= 20 ? 'supported' : 'insufficient_history', predictions };
}

export async function getAIControlPlane() {
  const identity = await requireIdentity();
  return { companyId: identity.companyId, tools: getAIToolDefinitions(), modelRouting: { fast: process.env.ORYON_AI_FAST_MODEL ?? 'gemini-2.5-flash', balanced: process.env.ORYON_AI_BALANCED_MODEL ?? 'gemini-2.5-flash', deep: process.env.ORYON_AI_DEEP_MODEL ?? 'gemini-2.5-flash' }, limits: { requestsPerMinute: 20, maxContextChars: 50000 }, capabilities: ['context_retrieval','authorized_tools','guardrails','audit','rate_limits','cost_controls','risk_engine'] };
}
