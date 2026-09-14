import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireIdentity, requirePermission } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { getAdminDb } from '@/server/firebase/admin';
import { queueDomainEventTransaction } from '@/server/services/foundation';
import { writeAuditEvent } from '@/server/repositories/audit';

export const FORM_FIELD_TYPES = ['text','textarea','number','date','select','multi-select','person','team','file','checkbox','rating','url','email','phone','relation'] as const;
export type FormFieldType = typeof FORM_FIELD_TYPES[number];

const FormFieldSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  type: z.enum(FORM_FIELD_TYPES),
  label: z.string().min(1).max(180),
  description: z.string().max(500).optional().default(''),
  required: z.boolean().default(false),
  placeholder: z.string().max(180).optional().default(''),
  options: z.array(z.string().max(180)).max(100).optional().default([]),
  validation: z.object({ min: z.number().optional(), max: z.number().optional(), pattern: z.string().max(500).optional() }).default({}),
  permission: z.string().max(180).optional(),
});

const FormSchema = z.object({
  name: z.string().min(1).max(180),
  description: z.string().max(5000).default(''),
  active: z.boolean().default(true),
  fields: z.array(FormFieldSchema).min(1).max(100),
  submissionRules: z.object({ allowMultiple: z.boolean().default(true), recordCollection: z.string().max(80).optional(), createRecord: z.boolean().default(false) }).default({ allowMultiple: true, createRecord: false }),
  workflowId: z.string().regex(/^[A-Za-z0-9_-]{1,180}$/).optional(),
  permissions: z.object({ submitterRoles: z.array(z.enum(['owner','admin','manager','member','viewer'])).default(['owner','admin','manager','member']) }).default({}),
});

const COLLECTION_ALLOWLIST = new Set(['module_tasks','module_projects','projects','module_campaigns','module_meetings','module_calendar_events','module_workspaces']);
const valueForField = (field: z.infer<typeof FormFieldSchema>, value: unknown): unknown => {
  if (value === undefined || value === null || value === '') {
    if (field.required) throw new Error(`FIELD_REQUIRED:${field.id}`);
    return null;
  }
  if (field.type === 'number' || field.type === 'rating') {
    const parsed = Number(value); if (!Number.isFinite(parsed)) throw new Error(`FIELD_INVALID:${field.id}`);
    if (field.validation.min !== undefined && parsed < field.validation.min) throw new Error(`FIELD_MIN:${field.id}`);
    if (field.validation.max !== undefined && parsed > field.validation.max) throw new Error(`FIELD_MAX:${field.id}`);
    return parsed;
  }
  if (field.type === 'checkbox') { if (typeof value !== 'boolean') throw new Error(`FIELD_INVALID:${field.id}`); return value; }
  if (field.type === 'multi-select') { if (!Array.isArray(value)) throw new Error(`FIELD_INVALID:${field.id}`); return value.map(String); }
  if (field.validation.pattern && typeof value === 'string' && !new RegExp(field.validation.pattern).test(value)) throw new Error(`FIELD_PATTERN:${field.id}`);
  if (field.type === 'select' && field.options.length && !field.options.includes(String(value))) throw new Error(`FIELD_OPTION:${field.id}`);
  return typeof value === 'string' ? value.slice(0, 10000) : value;
};

export async function listForms(limit = 100) {
  const identity = await requirePermission(PERMISSIONS.FORMS_READ);
  const snapshot = await getAdminDb().collection('forms').where('companyId','==',identity.companyId).limit(Math.min(limit,100)).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Record<string,unknown>) }));
}

export async function getForm(id: string) {
  const identity = await requirePermission(PERMISSIONS.FORMS_READ);
  const ref = getAdminDb().collection('forms').doc(id); const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.companyId !== identity.companyId) throw new Error('FORM_NOT_FOUND');
  return { id: snapshot.id, ...(snapshot.data() as Record<string,unknown>) };
}

export async function createForm(input: unknown) {
  const identity = await requirePermission(PERMISSIONS.FORMS_MANAGE);
  const parsed = FormSchema.safeParse(input); if (!parsed.success) throw new Error('INVALID_FORM');
  if (parsed.data.submissionRules.recordCollection && !COLLECTION_ALLOWLIST.has(parsed.data.submissionRules.recordCollection)) throw new Error('INVALID_RECORD_COLLECTION');
  const db = getAdminDb(); const ref = db.collection('forms').doc(); const versionRef = ref.collection('versions').doc('1');
  await db.runTransaction(async tx => {
    tx.create(ref,{ id:ref.id, ...parsed.data, companyId:identity.companyId, createdBy:identity.uid, updatedBy:identity.uid, version:1, createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() });
    tx.create(versionRef,{ formId:ref.id, ...parsed.data, version:1, companyId:identity.companyId, createdBy:identity.uid, createdAt:FieldValue.serverTimestamp() });
    await queueDomainEventTransaction(tx,{ eventName:'form.created', entityType:'form', entityId:ref.id, payload:{ formId:ref.id, version:1 }, metadata:{ source:'forms' } },{ companyId:identity.companyId, actorId:identity.uid });
  });
  await writeAuditEvent({ companyId:identity.companyId, actorId:identity.uid, action:'form.create', resourceType:'form', resourceId:ref.id, metadata:{ name:parsed.data.name } });
  return { id:ref.id, version:1, ...parsed.data };
}

export async function updateForm(id: string, input: unknown) {
  const identity = await requirePermission(PERMISSIONS.FORMS_MANAGE);
  const parsed = FormSchema.safeParse(input); if (!parsed.success) throw new Error('INVALID_FORM');
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(id)) throw new Error('INVALID_ID');
  const db=getAdminDb(); const ref=db.collection('forms').doc(id); let nextVersion=0;
  await db.runTransaction(async tx=>{
    const current=await tx.get(ref); if(!current.exists || current.data()?.companyId!==identity.companyId) throw new Error('FORM_NOT_FOUND');
    nextVersion=Number(current.data()?.version??1)+1; const versionRef=ref.collection('versions').doc(String(nextVersion));
    tx.update(ref,{...parsed.data,version:nextVersion,updatedBy:identity.uid,updatedAt:FieldValue.serverTimestamp()});
    tx.create(versionRef,{formId:id,...parsed.data,version:nextVersion,companyId:identity.companyId,createdBy:identity.uid,createdAt:FieldValue.serverTimestamp()});
    await queueDomainEventTransaction(tx,{eventName:'form.updated',entityType:'form',entityId:id,payload:{formId:id,version:nextVersion},metadata:{source:'forms'}},{companyId:identity.companyId,actorId:identity.uid});
  });
  await writeAuditEvent({companyId:identity.companyId,actorId:identity.uid,action:'form.update',resourceType:'form',resourceId:id,metadata:{version:nextVersion}});
  return { id, version:nextVersion, ...parsed.data };
}

export async function submitForm(formId: string, values: Record<string, unknown>) {
  const identity = await requireIdentity(); const form = await getForm(formId);
  if ((form.active as boolean) !== true) throw new Error('FORM_INACTIVE');
  const roles = Array.isArray((form.permissions as Record<string,unknown> | undefined)?.submitterRoles) ? (form.permissions as Record<string,unknown>).submitterRoles as string[] : [];
  if (roles.length && !roles.includes(identity.role)) throw new Error('FORM_SUBMISSION_FORBIDDEN');
  const fields = Array.isArray(form.fields) ? form.fields as Array<z.infer<typeof FormFieldSchema>> : [];
  const normalized: Record<string,unknown> = {};
  for (const field of fields) normalized[field.id] = valueForField(field, values[field.id]);
  const db=getAdminDb(); const submissionRef=db.collection('form_submissions').doc(); let recordId: string | null=null;
  await db.runTransaction(async tx=>{
    const submission={ id:submissionRef.id, formId, companyId:identity.companyId, submittedBy:identity.uid, formVersion:Number(form.version??1), values:normalized, status:'submitted', createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() };
    tx.create(submissionRef,submission);
    const rules=(form.submissionRules??{}) as Record<string,unknown>; const collection=typeof rules.recordCollection==='string'?rules.recordCollection:'';
    if (rules.createRecord===true && collection) {
      if(!COLLECTION_ALLOWLIST.has(collection)) throw new Error('INVALID_RECORD_COLLECTION');
      const recordRef=db.collection(collection).doc(); recordId=recordRef.id;
      tx.create(recordRef,{id:recordRef.id,companyId:identity.companyId,createdBy:identity.uid,updatedBy:identity.uid,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),version:1,formId,submissionId:submissionRef.id,...normalized});
    }
    await queueDomainEventTransaction(tx,{eventName:'form.submitted',entityType:'form_submission',entityId:submissionRef.id,payload:{formId,submissionId:submissionRef.id,recordId,workflowId:typeof form.workflowId==='string'?form.workflowId:null,title:String(form.name??'Form submission'),values:normalized},metadata:{source:'forms'}},{companyId:identity.companyId,actorId:identity.uid});
  });
  await writeAuditEvent({companyId:identity.companyId,actorId:identity.uid,action:'form.submit',resourceType:'form_submission',resourceId:submissionRef.id,metadata:{formId,recordId}});
  return { submissionId:submissionRef.id, recordId, formId };
}

export async function listSubmissions(formId: string, limit=100) {
  const identity=await requirePermission(PERMISSIONS.FORMS_READ);
  const snapshot=await getAdminDb().collection('form_submissions').where('companyId','==',identity.companyId).where('formId','==',formId).limit(Math.min(limit,100)).get();
  return snapshot.docs.map(doc=>({id:doc.id,...(doc.data() as Record<string,unknown>)}));
}
