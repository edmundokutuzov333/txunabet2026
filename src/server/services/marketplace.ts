import 'server-only';
import { requirePermission } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { getAdminDb } from '@/server/firebase/admin';
import { createAutomation, createWorkflow } from '@/server/services/automation-control';

export type MarketplaceTemplate={id:string;name:string;description:string;category:string;steps:Array<{id:string;type:'log'|'http'|'module.create'|'module.update'|'module.delete'|'condition'|'action';name:string;config:Record<string,unknown>}>;trigger:{type:'manual'|'event'|'cron';eventName?:string;cron?:string;timezone?:string;filter?:Record<string,unknown>}};

const templates:MarketplaceTemplate[]=[
 ['campaign-approval','Campaign Approval','Aprovação de campanha antes de publicação.','marketing',[['validate','action','Validar campanha',{}],['notify','action','Notificar Marketing',{}]]],
 ['employee-onboarding','Employee Onboarding','Coordena tarefas de onboarding.','people',[['create-task','module.create','Criar checklist',{}],['notify','action','Notificar RH',{}]]],
 ['purchase-approval','Purchase Approval','Fluxo de aprovação de compras.','finance',[['approval','action','Solicitar aprovação',{}],['log','log','Registar decisão',{}]]],
 ['weekly-report','Weekly Report','Gera relatório semanal operacional.','reporting',[['report','action','Gerar relatório',{}],['notify','action','Notificar liderança',{}]]],
 ['meeting-follow-up','Meeting Follow-up','Converte follow-up de reunião em ações.','meetings',[['tasks','action','Criar tarefas',{}],['notify','action','Notificar participantes',{}]]],
 ['incident-escalation','Incident Escalation','Escala incidentes críticos.','security',[['condition','condition','Avaliar severidade',{}],['notify','action','Escalar para manager',{}]]],
 ['document-approval','Document Approval','Aprovação formal de documentos.','documents',[['approval','action','Solicitar aprovação',{}],['notify','action','Notificar autor',{}]]],
 ['task-escalation','Task Escalation','Escala tarefas atrasadas.','operations',[['condition','condition','Detectar atraso',{}],['notify','action','Escalar responsável',{}]]],
 ['leave-request','Leave Request','Fluxo de pedido de ausência.','people',[['approval','action','Solicitar aprovação',{}],['notify','action','Notificar RH',{}]]],
 ['access-request','Access Request','Pedido de acesso com aprovação.','security',[['approval','action','Solicitar aprovação',{}],['log','log','Auditar concessão',{}]]],
].map(([id,name,description,category,steps])=>({id:String(id),name:String(name),description:String(description),category:String(category),trigger:{type:'manual'},steps:(steps as Array<[string,string,string,Record<string,unknown>]>).map(([sid,type,sname,config])=>({id:sid,type:type as MarketplaceTemplate['steps'][number]['type'],name:sname,config}))}));

export function listMarketplaceTemplates():MarketplaceTemplate[]{return templates.map(t=>JSON.parse(JSON.stringify(t)) as MarketplaceTemplate);}
export async function installMarketplaceTemplate(templateId:string){const identity=await requirePermission(PERMISSIONS.AUTOMATION_MANAGE);const template=templates.find(t=>t.id===templateId);if(!template)throw new Error('TEMPLATE_NOT_FOUND');const workflow=await createWorkflow({name:template.name,description:template.description,active:true,executionTimeoutMs:120000,retryPolicy:{maxAttempts:5,backoffMs:30000},graph:{source:'marketplace',templateId},steps:template.steps});const automation=await createAutomation({name:`Automation: ${template.name}`,description:template.description,active:true,workflowId:workflow.id,trigger:template.trigger,concurrencyLimit:5,rateLimitPerMinute:60});const ref=getAdminDb().collection('marketplace_installations').doc();await ref.create({id:ref.id,companyId:identity.companyId,templateId,workflowId:workflow.id,automationId:automation.id,installedBy:identity.uid,createdAt:new Date().toISOString()});return{installationId:ref.id,workflowId:workflow.id,automationId:automation.id};}
