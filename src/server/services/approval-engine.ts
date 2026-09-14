import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireIdentity, requirePermission } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { getAdminDb } from '@/server/firebase/admin';
import { queueDomainEventTransaction } from '@/server/services/foundation';
import { writeAuditEvent } from '@/server/repositories/audit';

export const APPROVAL_STATES = ['DRAFT','PENDING','IN_REVIEW','APPROVED','REJECTED','CHANGES_REQUESTED','CANCELLED','EXPIRED'] as const;
export type ApprovalState = typeof APPROVAL_STATES[number];
export const ApprovalStepSchema=z.object({ id:z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), approverId:z.string().min(1).max(180).optional(), delegateTo:z.string().min(1).max(180).optional(), condition:z.record(z.unknown()).optional(), dueDate:z.string().datetime().optional() });
export const ApprovalCreateSchema=z.object({ title:z.string().min(1).max(240), description:z.string().max(5000).default(''), entityType:z.string().min(1).max(80), entityId:z.string().min(1).max(180), mode:z.enum(['single','sequential','parallel','conditional']).default('single'), steps:z.array(ApprovalStepSchema).min(1).max(50), dueDate:z.string().datetime().optional(), metadata:z.record(z.unknown()).default({}) });
export const ApprovalActionSchema=z.object({ decision:z.enum(['APPROVED','REJECTED','CHANGES_REQUESTED','CANCELLED']), comment:z.string().max(5000).default('') });

function idOk(id:string){return /^[A-Za-z0-9_-]{1,180}$/.test(id)}
function conditionMatches(values:Record<string,unknown>,condition:Record<string,unknown>|undefined){if(!condition)return true;return Object.entries(condition).every(([k,v])=>values[k]===v)}
async function memberActive(companyId:string,userId:string){const s=await getAdminDb().collection('companies').doc(companyId).collection('members').doc(userId).get();return s.exists&&s.data()?.status==='active'}
async function appendHistory(tx:any,approvalRef:any,entry:Record<string,unknown>){tx.create(approvalRef.collection('history').doc(),{...entry,createdAt:FieldValue.serverTimestamp()})}

export async function createApprovalRequest(input:unknown){
 const identity=await requirePermission(PERMISSIONS.APPROVALS_MANAGE); const parsed=ApprovalCreateSchema.safeParse(input); if(!parsed.success)throw new Error('INVALID_APPROVAL');
 const steps=parsed.data.steps; for(const s of steps){const userId=s.approverId??s.delegateTo; if(!userId||!(await memberActive(identity.companyId,userId)))throw new Error('APPROVER_NOT_FOUND')}
 const db=getAdminDb(); const ref=db.collection('approvals').doc();
 await db.runTransaction(async tx=>{
  tx.create(ref,{id:ref.id,companyId:identity.companyId,createdBy:identity.uid,updatedBy:identity.uid,title:parsed.data.title,description:parsed.data.description,entityType:parsed.data.entityType,entityId:parsed.data.entityId,mode:parsed.data.mode,steps:steps.map((s,i)=>({...s,status:'PENDING',index:i})),currentStep:0,state:'PENDING',status:'pending',dueDate:parsed.data.dueDate,metadata:parsed.data.metadata,version:1,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
  await appendHistory(tx,ref,{type:'created',actorId:identity.uid,state:'PENDING'});
  await queueDomainEventTransaction(tx,{eventName:'approval.requested',entityType:'approval',entityId:ref.id,payload:{title:parsed.data.title,approverId:steps[0]?.approverId,requesterId:identity.uid,mode:parsed.data.mode,entityType:parsed.data.entityType,entityId:parsed.data.entityId,dueDate:parsed.data.dueDate},metadata:{source:'approval-engine'}},{companyId:identity.companyId,actorId:identity.uid,eventId:`approval_requested_${ref.id}`});
 });
 await writeAuditEvent({companyId:identity.companyId,actorId:identity.uid,action:'approval.create',resourceType:'approval',resourceId:ref.id,metadata:{mode:parsed.data.mode,steps:steps.length}}); return {id:ref.id};
}

export async function getApproval(id:string){const identity=await requirePermission(PERMISSIONS.APPROVALS_READ);if(!idOk(id))throw new Error('INVALID_ID');const s=await getAdminDb().collection('approvals').doc(id).get();if(!s.exists||s.data()?.companyId!==identity.companyId)throw new Error('NOT_FOUND');return{id:s.id,...(s.data() as Record<string,unknown>)};}
export async function listApprovalRequests(limit=200){const identity=await requirePermission(PERMISSIONS.APPROVALS_READ);const s=await getAdminDb().collection('approvals').where('companyId','==',identity.companyId).limit(Math.min(limit,200)).get();return s.docs.map(d=>({id:d.id,...d.data()}));}

export async function decideApprovalStep(id:string,input:unknown){
 const identity=await requirePermission(PERMISSIONS.APPROVALS_MANAGE); if(!idOk(id))throw new Error('INVALID_ID'); const parsed=ApprovalActionSchema.safeParse(input);if(!parsed.success)throw new Error('INVALID_APPROVAL_DECISION');
 const db=getAdminDb();const ref=db.collection('approvals').doc(id);let nextState:ApprovalState='IN_REVIEW';
 await db.runTransaction(async tx=>{
  const s=await tx.get(ref);if(!s.exists||s.data()?.companyId!==identity.companyId)throw new Error('NOT_FOUND');const data=s.data() as Record<string,unknown>;const state=String(data.state??data.status??'PENDING') as ApprovalState;if(['APPROVED','REJECTED','CANCELLED','EXPIRED'].includes(state))throw new Error('APPROVAL_NOT_ACTIONABLE');
  const steps=Array.isArray(data.steps)?data.steps as Array<Record<string,unknown>>:[];let idx=Number(data.currentStep??0);if(idx<0)idx=0;
  const activeSteps=steps.filter(st=>conditionMatches((data.metadata??{}) as Record<string,unknown>,st.condition as Record<string,unknown>|undefined));
  if(data.mode==='parallel'){const match=activeSteps.find(st=>String(st.approverId??st.delegateTo)===identity.uid&&!['APPROVED','REJECTED','CHANGES_REQUESTED'].includes(String(st.status)));if(!match&&!['owner','admin'].includes(identity.role))throw new Error('FORBIDDEN');
  }else{const active=activeSteps[idx];const approver=String(active?.delegateTo??active?.approverId??'');if(approver!==identity.uid&&!['owner','admin'].includes(identity.role))throw new Error('FORBIDDEN');}
  const targetStep= data.mode==='parallel'?activeSteps.find(st=>String(st.approverId??st.delegateTo)===identity.uid&&!['APPROVED','REJECTED','CHANGES_REQUESTED'].includes(String(st.status)))??activeSteps[0]:activeSteps[idx];
  const targetId=String(targetStep?.id??'');
  for(let i=0;i<steps.length;i++){if(String(steps[i]?.id)===targetId)steps[i]={...steps[i],status:parsed.data.decision,decidedBy:identity.uid,decidedAt:Timestamp.now(),comment:parsed.data.comment};}
  const decision=parsed.data.decision;
  if(decision==='REJECTED')nextState='REJECTED'; else if(decision==='CHANGES_REQUESTED')nextState='CHANGES_REQUESTED'; else if(decision==='CANCELLED')nextState='CANCELLED'; else {
    const pending=activeSteps.filter(st=>!['APPROVED','REJECTED','CHANGES_REQUESTED'].includes(String(st.status)));
    nextState=pending.length?'IN_REVIEW':'APPROVED'; if(data.mode!=='parallel'&&pending.length)idx=steps.findIndex(st=>String(st.id)===String(pending[0]?.id));
  }
  tx.update(ref,{steps,currentStep:idx,state:nextState,status:nextState==='APPROVED'?'approved':nextState==='REJECTED'?'rejected':'pending',updatedBy:identity.uid,updatedAt:FieldValue.serverTimestamp(),decision:parsed.data.decision,decisionComment:parsed.data.comment,decidedBy:identity.uid,decidedAt:Timestamp.now(),version:Number(data.version??1)+1});
  await appendHistory(tx,ref,{type:'decision',actorId:identity.uid,decision:parsed.data.decision,comment:parsed.data.comment,stepId:targetId,fromState:state,toState:nextState});
  const eventName=nextState==='APPROVED'?'approval.approved':nextState==='REJECTED'?'approval.rejected':nextState==='CHANGES_REQUESTED'?'approval.changes_requested':'approval.updated';
  await queueDomainEventTransaction(tx,{eventName,entityType:'approval',entityId:id,payload:{title:data.title,requesterId:data.requesterId,approverId:targetStep?.approverId,decision:parsed.data.decision,state:nextState,comment:parsed.data.comment},metadata:{source:'approval-engine'}},{companyId:identity.companyId,actorId:identity.uid,eventId:`${eventName.replace(/\./g,'_')}_${id}_${Number(data.version??1)+1}`});
 });
 await writeAuditEvent({companyId:identity.companyId,actorId:identity.uid,action:`approval.${parsed.data.decision.toLowerCase()}`,resourceType:'approval',resourceId:id,metadata:{state:nextState,comment:parsed.data.comment}}); return{id,status:nextState};
}

export async function cancelApproval(id:string){return decideApprovalStep(id,{decision:'CANCELLED',comment:'Cancelado pelo utilizador.'})}
export async function expireOverdueApprovals(){const db=getAdminDb();const now=Timestamp.now();const snapshot=await db.collection('approvals').where('state','in',['PENDING','IN_REVIEW']).limit(200).get();let count=0;for(const doc of snapshot.docs){const d=doc.data();if(d.dueDate&&String(d.dueDate)<now.toDate().toISOString()){await doc.ref.update({state:'EXPIRED',status:'expired',updatedAt:now,expiredAt:now});count++;}}return count;}
