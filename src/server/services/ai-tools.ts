import 'server-only';

import { getAdminDb } from '@/server/firebase/admin';
import { PERMISSIONS } from '@/server/authorization/permissions';
import type { AuthenticatedIdentity } from '@/server/authorization';
import { enterpriseSearch, getKnowledgeGraph, type ContextType } from '@/server/services/enterprise-context';
import { createModuleRecord, getModuleRecord, listModuleRecords, updateModuleRecord } from '@/server/services/legacy-modules';
import { createApprovalRequest } from '@/server/services/approval-engine';
import { enqueueManualAutomation } from '@/server/services/automation-control';
import { writeAuditEvent } from '@/server/repositories/audit';
import { AIToolDefinition, RegisteredAITool } from '@/server/services/ai-core';

const ID = /^[A-Za-z0-9_-]{1,180}$/;

function requiredString(input: Record<string, unknown>, key: string, max = 240): string {
  const value = String(input[key] ?? '').trim();
  if (!value || value.length > max) throw new Error(`AI_TOOL_INPUT_${key.toUpperCase()}`);
  return value;
}

function optionalString(input: Record<string, unknown>, key: string, max = 5000): string | undefined {
  const value = String(input[key] ?? '').trim();
  return value ? value.slice(0, max) : undefined;
}

function idInput(input: Record<string, unknown>): string {
  const id = requiredString(input, 'id');
  if (!ID.test(id)) throw new Error('INVALID_ID');
  return id;
}

function publicCompact(data: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set(['embedding', 'token', 'secret', 'apiKey', 'cookie', 'authorization']);
  return Object.fromEntries(Object.entries(data).filter(([key]) => !blocked.has(key)).map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 5000) : value]));
}

const definitions: AIToolDefinition[] = [
  { name: 'searchOryon', description: 'Pesquisa conteúdo empresarial autorizado com filtros e relevância.', risk: 'read' },
  { name: 'getProject', description: 'Obtém um projeto autorizado.', risk: 'read', permission: PERMISSIONS.OPERATIONS_READ },
  { name: 'getTask', description: 'Obtém uma tarefa autorizada.', risk: 'read', permission: PERMISSIONS.OPERATIONS_READ },
  { name: 'getCampaign', description: 'Obtém uma campanha autorizada.', risk: 'read', permission: PERMISSIONS.MARKETING_READ },
  { name: 'getMeetings', description: 'Lista reuniões autorizadas.', risk: 'read', permission: PERMISSIONS.OPERATIONS_READ },
  { name: 'getMeeting', description: 'Obtém uma reunião autorizada.', risk: 'read', permission: PERMISSIONS.OPERATIONS_READ },
  { name: 'getGoals', description: 'Consulta metas internas da empresa.', risk: 'read', permission: PERMISSIONS.OPERATIONS_READ },
  { name: 'getKnowledgeGraph', description: 'Navega relações autorizadas entre entidades empresariais.', risk: 'read' },
  { name: 'createTask', description: 'Cria uma tarefa empresarial.', risk: 'write', permission: PERMISSIONS.OPERATIONS_MANAGE },
  { name: 'reassignTask', description: 'Altera o responsável de uma tarefa.', risk: 'sensitive', permission: PERMISSIONS.OPERATIONS_MANAGE },
  { name: 'createReport', description: 'Cria um relatório estruturado.', risk: 'write', permission: PERMISSIONS.REPORTING_MANAGE },
  { name: 'requestApproval', description: 'Abre um pedido formal de aprovação.', risk: 'write', permission: PERMISSIONS.APPROVALS_MANAGE },
  { name: 'runWorkflow', description: 'Coloca uma automação/workflow autorizado em execução.', risk: 'sensitive', permission: PERMISSIONS.AUTOMATION_MANAGE },
];

export function getAIToolDefinitions(): AIToolDefinition[] { return definitions; }

export const AI_TOOLS: RegisteredAITool[] = definitions.map((definition) => ({
  ...definition,
  execute: async (input: Record<string, unknown>, identity: AuthenticatedIdentity) => {
    switch (definition.name) {
      case 'searchOryon': {
        const result = await enterpriseSearch({
          q: requiredString(input, 'q', 1000),
          scope: (String(input.scope ?? 'all') as 'all') || 'all',
          type: input.type ? String(input.type) as ContextType : undefined,
          workspaceId: optionalString(input, 'workspaceId', 180),
          personId: optionalString(input, 'personId', 180),
          limit: Math.min(Math.max(Number(input.limit ?? 10), 1), 25),
          semantic: input.semantic !== false,
        });
        return result;
      }
      case 'getProject': return publicCompact(await getModuleRecord('workspaces', idInput(input)));
      case 'getTask': return publicCompact(await getModuleRecord('tasks', idInput(input)));
      case 'getCampaign': return publicCompact(await getModuleRecord('campaigns', idInput(input)));
      case 'getMeeting': return publicCompact(await getModuleRecord('meetings', idInput(input)));
      case 'getMeetings': {
        const rows = await listModuleRecords('meetings', { q: optionalString(input, 'q', 500), limit: Math.min(Number(input.limit ?? 25), 50) });
        return rows.map(publicCompact);
      }
      case 'getGoals': {
        const snapshot = await getAdminDb().collection('goals').where('companyId', '==', identity.companyId).limit(Math.min(Number(input.limit ?? 50), 100)).get();
        return snapshot.docs.map((doc) => publicCompact({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
      }
      case 'getKnowledgeGraph': {
        const type = requiredString(input, 'type', 80) as ContextType;
        return getKnowledgeGraph(type, idInput(input), Math.min(Math.max(Number(input.depth ?? 1), 1), 2));
      }
      case 'createTask': {
        const title = requiredString(input, 'title', 240);
        const description = optionalString(input, 'description', 5000);
        const task: Record<string, unknown> = { title, description, priority: String(input.priority ?? 'medium'), status: 'todo' };
        for (const key of ['assigneeId', 'ownerId', 'projectId', 'workspaceId', 'dueDate']) if (typeof input[key] === 'string' && input[key]) task[key] = String(input[key]).slice(0, 240);
        const created = await createModuleRecord('tasks', task);
        return { created: true, task: publicCompact(created) };
      }
      case 'reassignTask': {
        const taskId = idInput(input);
        const assigneeId = requiredString(input, 'assigneeId', 180);
        const reason = optionalString(input, 'reason', 1000);
        const updated = await updateModuleRecord('tasks', taskId, { assigneeId });
        await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'ai.task.reassign', resourceType: 'task', resourceId: taskId, metadata: { assigneeId, reason } });
        return { updated: true, task: publicCompact(updated) };
      }
      case 'createReport': {
        const name = requiredString(input, 'name', 240);
        const content = optionalString(input, 'content', 20000) ?? '';
        const report = await createModuleRecord('reports', {
          name,
          title: name,
          description: optionalString(input, 'description', 5000) ?? '',
          content,
          summary: optionalString(input, 'summary', 5000) ?? '',
          dataSources: Array.isArray(input.dataSources) ? input.dataSources.slice(0, 30) : [],
          metrics: Array.isArray(input.metrics) ? input.metrics.slice(0, 30) : [],
          filters: input.filters && typeof input.filters === 'object' ? input.filters : {},
          charts: Array.isArray(input.charts) ? input.charts.slice(0, 30) : [],
        });
        return { created: true, report: publicCompact(report) };
      }
      case 'requestApproval': {
        const title = requiredString(input, 'title', 240);
        const entityType = requiredString(input, 'entityType', 80);
        const entityId = requiredString(input, 'entityId', 180);
        const approverId = requiredString(input, 'approverId', 180);
        const result = await createApprovalRequest({ title, description: optionalString(input, 'description', 5000) ?? '', entityType, entityId, steps: [{ id: 'ai_approval_step', approverId }], metadata: { source: 'oryon-ai-agent' } });
        return { created: true, approvalId: result.id };
      }
      case 'runWorkflow': {
        const workflowId = optionalString(input, 'workflowId', 180);
        const automationId = optionalString(input, 'automationId', 180);
        if (automationId) return { queued: true, ...(await enqueueManualAutomation(automationId)) };
        if (!workflowId) throw new Error('AI_TOOL_WORKFLOW_ID_REQUIRED');
        if (!ID.test(workflowId)) throw new Error('INVALID_ID');
        const matches = await getAdminDb().collection('module_automations').where('companyId', '==', identity.companyId).where('workflowId', '==', workflowId).where('active', '==', true).limit(5).get();
        if (!matches.docs.length) throw new Error('NO_ACTIVE_AUTOMATION_FOR_WORKFLOW');
        const selected = matches.docs[0].id;
        return { queued: true, automationId: selected, ...(await enqueueManualAutomation(selected, input.payload && typeof input.payload === 'object' ? input.payload as Record<string, unknown> : {})) };
      }
      default: throw new Error('AI_TOOL_NOT_FOUND');
    }
  },
}));
