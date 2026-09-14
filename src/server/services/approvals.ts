import 'server-only';
import { z } from 'zod';
import { createApprovalRequest, decideApprovalStep, listApprovalRequests } from '@/server/services/approval-engine';

const ApprovalCreateSchema = z.object({ title:z.string().min(1).max(240), description:z.string().max(5000).default(''), approverId:z.string().min(1).max(180), entityType:z.string().min(1).max(80).default('approval'), entityId:z.string().min(1).max(180), priority:z.enum(['low','medium','high','critical']).default('medium'), dueDate:z.string().datetime().optional(), metadata:z.record(z.unknown()).default({}) });
const ApprovalDecisionSchema = z.object({ decision:z.enum(['approved','rejected']), comment:z.string().max(5000).default('') });

export async function listApprovals(){return listApprovalRequests();}
export async function createApproval(input:unknown){const parsed=ApprovalCreateSchema.safeParse(input);if(!parsed.success)throw new Error('INVALID_APPROVAL');const result=await createApprovalRequest({title:parsed.data.title,description:parsed.data.description,approverId:parsed.data.approverId,entityType:parsed.data.entityType,entityId:parsed.data.entityId,priority:parsed.data.priority,dueDate:parsed.data.dueDate,mode:'single',steps:[{id:'step_1',approverId:parsed.data.approverId,dueDate:parsed.data.dueDate}],metadata:parsed.data.metadata});return result;}
export async function decideApproval(id:string,input:unknown){const parsed=ApprovalDecisionSchema.safeParse(input);if(!parsed.success)throw new Error('INVALID_APPROVAL_DECISION');return decideApprovalStep(id,{decision:parsed.data.decision.toUpperCase(),comment:parsed.data.comment});}
