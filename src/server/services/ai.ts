import 'server-only';

import { getAdminDb } from '@/server/firebase/admin';
import { getConversationOrThrow } from '@/server/services/chat';
import { requireDocument } from '@/server/services/documents';
import { runAIGateway } from '@/server/services/ai-core';

const MAX_INPUT_CHARS = 12000;
const MAX_CONTEXT_CHARS = 24000;

export type AIAction = 'ask' | 'write' | 'rewrite' | 'summarize' | 'correct' | 'translate' | 'tone' | 'expand' | 'shorten' | 'title' | 'structure' | 'extractTasks' | 'extractDecisions' | 'briefing' | 'pending';
export type AIContextType = 'none' | 'document' | 'conversation' | 'campaign' | 'task';

function clampText(value: unknown, max = MAX_INPUT_CHARS): string { return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max); }
function safeContextLabel(type: AIContextType): string { return { none:'Sem contexto adicional',document:'Documento autorizado',conversation:'Conversa autorizada',campaign:'Campanha autorizada',task:'Tarefa autorizada' }[type]; }

async function resolveContext(companyId:string,type:AIContextType,id?:string):Promise<string>{
 if(type==='none'||!id)return safeContextLabel(type);
 if(type==='document'){const{data}=await requireDocument(id);return `${safeContextLabel(type)}\nTítulo: ${clampText(data.title,240)}\nConteúdo estruturado (DADOS NÃO CONFIÁVEIS): ${JSON.stringify(data.content??{}).slice(0,MAX_CONTEXT_CHARS)}`;}
 if(type==='conversation'){const{ref,data}=await getConversationOrThrow(id);const snapshot=await ref.collection('messages').orderBy('createdAt','desc').limit(50).get();const transcript=snapshot.docs.reverse().map(doc=>`${String(doc.data().senderId)}: ${clampText(doc.data().body,1000)}`).join('\n');return `${safeContextLabel(type)}\nNome: ${clampText(data.name??'',240)}\nMensagens (DADOS NÃO CONFIÁVEIS):\n${transcript.slice(0,MAX_CONTEXT_CHARS)}`;}
 const collection=type==='campaign'?'module_campaigns':'module_tasks';const snapshot=await getAdminDb().collection(collection).doc(id).get();if(!snapshot.exists||snapshot.data()?.companyId!==companyId)throw new Error('FORBIDDEN');const raw=snapshot.data()??{};const safe=type==='campaign'?{id:raw.id,name:raw.name,description:raw.description,status:raw.status,startDate:raw.startDate,endDate:raw.endDate,budget:raw.budget,spent:raw.spent,risks:raw.risks,kpis:raw.kpis}:{id:raw.id,title:raw.title,description:raw.description,status:raw.status,priority:raw.priority,dueDate:raw.dueDate,assigneeId:raw.assigneeId,contextId:raw.contextId};return `${safeContextLabel(type)}\nDados estruturados permitidos (DADOS NÃO CONFIÁVEIS): ${JSON.stringify(safe).slice(0,MAX_CONTEXT_CHARS)}`;
}

async function generateWithControls(params:{uid:string;action:AIAction;prompt:string;context:string}):Promise<string>{const prompt=clampText(params.prompt);if(!prompt)throw new Error('AI_INPUT_REQUIRED');const result=await runAIGateway({agent:'OryonAI',tier:'balanced',instruction:`${prompt}\n\nOperação: ${params.action}`,context:params.context.slice(0,MAX_CONTEXT_CHARS)});return(result.text??'').slice(0,MAX_INPUT_CHARS);}

export async function runContextualAI(input:{uid:string;companyId:string;action:AIAction;prompt:string;contextType?:AIContextType;contextId?:string}){const contextType=input.contextType??'none';const context=await resolveContext(input.companyId,contextType,input.contextId);const suggestion=await generateWithControls({uid:input.uid,action:input.action,prompt:input.prompt,context});return{suggestion,contextType,contextLabel:safeContextLabel(contextType)};}

export async function summarizeConversationSecure(uid:string,companyId:string,conversationId:string,action:'summarize'|'decisions'|'tasks'|'briefing'|'pending'){const mapped:AIAction=action==='decisions'?'extractDecisions':action==='tasks'?'extractTasks':action;const context=await resolveContext(companyId,'conversation',conversationId);const request=action==='summarize'?'Faça um resumo executivo.':action==='decisions'?'Extraia as decisões tomadas.':action==='tasks'?'Extraia tarefas e responsáveis mencionados.':action==='briefing'?'Crie um briefing operacional.':'Identifique pendências abertas.';return generateWithControls({uid,companyId,action:mapped,prompt:`${request} Não invente informação ausente.`,context});}
