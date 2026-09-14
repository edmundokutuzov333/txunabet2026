import 'server-only';

import { getAdminDb } from '@/server/firebase/admin';
import { PERMISSIONS } from '@/server/authorization/permissions';
import type { AuthenticatedIdentity } from '@/server/authorization';
import { enterpriseSearch, getKnowledgeGraph, type ContextType } from '@/server/services/enterprise-context';
import { createModuleRecord, getModuleRecord, listModuleRecords, updateModuleRecord } from '@/server/services/legacy-modules';
import { createApprovalRequest } from '@/server/services/approval-engine';
import { enqueueManualAutomation } from '@/server/services/automation-control';
import { writeAuditEvent } from '@/server/repositories/audit';
import type { AIToolDefinition, RegisteredAITool } from '@/server/services/ai-core';

const ID = /^[A-Za-z0-9_-]{1,180}$/;
function requiredString(input: Record<string, unknown>, key: string, max = 240): string { const value = String(input[key] ?? '').trim(); if (!value || value.length > max) throw new Error(`AI_TOOL_INPUT_${key.toUpperCase()}`); return value; }
function optionalString(input: Record<string, unknown>, key: string, max = 5000): string | undefined { const value = String(input[key] ?? '').trim(); return value ? value.slice(0, max) : undefined; }
function idInput(input: Record<string, unknown>): string { const id = requiredString(input, 'id'); if (!ID.test(id)) throw new Error('INVALID_ID'); return id; }
function publicCompact(data: Record<string, unknown>): Record<string, unknown> { const blocked = new Set(['embedding','token','secret','apiKey','cookie','authorization']); return Object.fromEntries(Object.entries(data).filter(([key]) => !blocked.has(key)).map(([key,value]) => [key, typeof value === 'string' ? value.slice(0, 5000) : value])); }

const definitions: AIToolDefinition[] = [
 { name:'searchOryon', description:'Pesquisa conteúdo empresarial autorizado com filtros e relevância.', risk:'read' },
 { name:'getProject', description:'Obtém um projeto autorizado.', risk:'read', permission:PERMISSIONS.OPERATIONS_READ },
 { name:'getTask', description:'Obtém uma tarefa autorizada.', risk:'read', permission:PERMISSIONS.OPERATIONS_READ },
 { name:'getCampaign', description:'Obtém uma campanha autorizada.', risk:'read', permission:PERMISSIONS.MARKETING_READ },
 { name:'getMeetings', description:'Lista reuniões autorizadas.', risk:'read', permission:PERMISSIONS.OPERATIONS_READ },
 { name:'getMeeting', description:'Obtém uma reunião autorizada.', risk:'read', permission:PERMISSIONS.OPERATIONS_READ },
 { name:'getGoals', description:'Consulta metas internas da empresa.', risk:'read', permission:PERMISSIONS.OPERATIONS_READ },
 { name:'getKnowledgeGraph', description:'Navega relações autorizadas entre entidades empresariais.', risk:'read' },
 { name:'createTask', description:'Cria uma tarefa empresarial.', risk:'write', permission:PERMISSIONS.OPERATIONS_MANAGE },
 { name:'reassignTask', description:'Altera o responsável de uma tarefa.', risk:'sensitive', permission:PERMISSIONS.OPERATIONS_MANAGE },
 { name:'createReport', description:'Cria um relatório estruturado.', risk:'write', permission:PERMISSIONS.REPORTING_MANAGE },
 { name:'requestApproval', description:'Abre um pedido formal de aprovação.', risk:'write', permission:PERMISSIONS.APPROVALS_MANAGE },
 { name:'runWorkflow', description:'Coloca uma automação/workflow autorizado em execução.', risk:'sensitive', permission:PERMISSIONS.AUTOMATION_MANAGE },
];
export function getAIToolDefinitions(): AIToolDefinition[] { return definitions; }

export const AI_TOOLS: RegisteredAITool[] = definitions.map((definition) => ({ ...definition, execute: async (input, identity) => {
 switch (definition.name) {
  case 'searchOryon': return enterpriseSearch({ q:requiredString(input,'q',1000), type:input.type ? String(input.type) as ContextType : undefined, workspaceId:optionalString(input,'workspaceId',180), personId:optionalString(input,'personId',180), limit:Math.min(Math.max(Number(input.limit ?? 10),1),25), semantic:input.semantic !== false });
  case 'getProject': { const id=idInput(input); const snapshot=await getAdminDb().collection('projects').doc(id).get(); if(!snapshot.exists||snapshot.data()?.companyId!==identity.companyId) throw new Error('NOT_FOUND'); return publicCompact({id:snapshot.id,...(snapshot.data() as Record<string,unknown>)}); }
  case 'getTask': return publicCompact(await getModuleRecord('tasks',idInput(input)));
  case 'getCampaign': return publicCompact(await getModuleRecord('campaigns',idInput(input)));
  case 'getMeeting': return publicCompact(await getModuleRecord('meetings',idInput(input)));
  case 'getMeetings': return (await listModuleRecords('meetings',{q:optionalString(input,'q',500),limit:Math.min(Number(input.limit ?? 25),50)})).map(publicCompact);
  case 'getGoals': { const s=await getAdminDb().collection('goals').where('companyId','==',identity.companyId).limit(Math.min(Number(input.limit ?? 50),100)).get(); return s.docs.map(doc=>publicCompact({id:doc.id,...(doc.data() as Record<string,unknown>)})); }
  case 'getKnowledgeGraph': return getKnowledgeGraph(requiredString(input,'type',80) as ContextType,idInput(input),Math.min(Math.max(Number(input.depth ?? 1),1),2));
  case 'createTask': { const task:Record<string,unknown>={title:requiredString(input,'title',240),description:optionalString(input,'description',5000),priority:String(input.priority ?? 'medium'),status:'todo'}; for(const key of ['assigneeId','ownerId','projectId','workspaceId','dueDate']) if(typeof input[key]==='string'&&input[key]) task[key]=String(input[key]).slice(0,240); return {created:true,task:publicCompact(await createModuleRecord('tasks',task))}; }
  case 'reassignTask': { const taskId=idInput(input); const assigneeId=requiredString(input,'assigneeId',180); const updated=await updateModuleRecord('tasks',taskId,{assigneeId}); await writeAuditEvent({companyId:identity.companyId,actorId:identity.uid,action:'ai.task.reassign',resourceType:'task',resourceId:taskId,metadata:{assigneeId,reason:optionalString(input,'reason',1000)}}); return {updated:true,task:publicCompact(updated)}; }
  case 'createReport': { const name=requiredString(input,'name',240); return {created:true,report:publicCompact(await createModuleRecord('reports',{name,title:name,description:optionalString(input,'description',5000)??'',content:optionalString(input,'content',20000)??'',summary:optionalString(input,'summary',5000)??'',dataSources:Array.isArray(input.dataSources)?input.dataSources.slice(0,30):[],metrics:Array.isArray(input.metrics)?input.metrics.slice(0,30):[],filters:input.filters&&typeof input.filters==='object'?input.filters:{},charts:Array.isArray(input.charts)?input.charts.slice(0,30):[]}))}; }
  case 'requestApproval': { const result=await createApprovalRequest({title:requiredString(input,'title',240),description:optionalString(input,'description',5000)??'',entityType:requiredString(input,'entityType',80),entityId:requiredString(input,'entityId',180),steps:[{id:'ai_approval_step',approverId:requiredString(input,'approverId',180)}],metadata:{source:'oryon-ai-agent'}}); return {created:true,approvalId:result.id}; }
  case 'runWorkflow': { const workflowId=optionalString(input,'workflowId',180); const automationId=optionalString(input,'automationId',180); if(automationId) return {queued:true,...(await enqueueManualAutomation(automationId))}; if(!workflowId||!ID.test(workflowId)) throw new Error('AI_TOOL_WORKFLOW_ID_REQUIRED'); const matches=await getAdminDb().collection('module_automations').where('companyId','==',identity.companyId).where('workflowId','==',workflowId).where('active','==',true).limit(5).get(); if(!matches.docs.length) throw new Error('NO_ACTIVE_AUTOMATION_FOR_WORKFLOW'); const selected=matches.docs[0].id; return {queued:true,automationId:selected,...(await enqueueManualAutomation(selected,input.payload&&typeof input.payload==='object'?input.payload as Record<string,unknown>:{}))}; }
  default: throw new Error('AI_TOOL_NOT_FOUND');
 }
}}));
