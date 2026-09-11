import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { z } from 'zod';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const REGION = 'africa-south1';
const MAX_ATTEMPTS = 5;
const LEASE_MS = 8 * 60 * 1000;
const MAX_JOBS_PER_TICK = 20;
const PAGE_SIZE = 500;

const WorkflowStepSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  type: z.enum(['log', 'http', 'module.create', 'module.update', 'module.delete', 'condition']),
  name: z.string().max(180).optional(),
  config: z.record(z.unknown()).default({}),
});

const WorkflowSchema = z.object({
  name: z.string().min(1).max(180),
  description: z.string().max(5000).optional(),
  active: z.boolean().default(true),
  steps: z.array(WorkflowStepSchema).min(1).max(50),
});

const EventSchema = z.object({
  eventName: z.string().min(1).max(180),
  eventId: z.string().min(1).max(180).optional(),
  payload: z.record(z.unknown()).default({}),
});

const AutomationSchema = z.object({
  id: z.string().min(1).max(180),
  workflowId: z.string().min(1).max(180),
  payload: z.record(z.unknown()).default({}),
});

const MODULE_COLLECTIONS: Record<string, string> = {
  calendar: 'module_calendar_events', meetings: 'module_meetings', integrations: 'module_integrations',
  'knowledge-base': 'module_knowledge_articles', campaigns: 'module_campaigns', tasks: 'module_tasks',
  reports: 'module_reports', pulse: 'module_pulse_items', workspaces: 'module_workspaces',
};

function now() { return admin.firestore.Timestamp.now(); }
function minuteKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

function cronFieldMatches(value: number, field: string, min: number, max: number): boolean {
  return field.trim().split(',').some((part) => {
    const [base, stepText] = part.split('/');
    const step = stepText ? Number(stepText) : 1;
    if (!Number.isInteger(step) || step <= 0) return false;
    let start = min;
    let end = max;
    if (base && base !== '*') {
      if (base.includes('-')) {
        const [a, b] = base.split('-').map(Number);
        if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
        start = a; end = b;
      } else {
        const exact = Number(base);
        if (!Number.isInteger(exact)) return false;
        start = exact; end = exact;
      }
    }
    if (start < min || end > max || start > end) return false;
    if (base && base !== '*' && !base.includes('-')) return value === start;
    return value >= start && value <= end && (value - start) % step === 0;
  });
}

export function cronMatches(expression: string, date: Date, timezone: string): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const weekdayName = parts.find((part) => part.type === 'weekday')?.value ?? 'Sun';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayName);
  return cronFieldMatches(get('minute'), fields[0], 0, 59)
    && cronFieldMatches(get('hour'), fields[1], 0, 23)
    && cronFieldMatches(get('day'), fields[2], 1, 31)
    && cronFieldMatches(get('month'), fields[3], 1, 12)
    && cronFieldMatches(weekday, fields[4], 0, 6);
}

function template(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value === 'string') {
    return value.replace(/{{\s*([^}]+)\s*}}/g, (_match, path: string) => {
      let current: unknown = context;
      for (const segment of String(path).split('.')) {
        if (!current || typeof current !== 'object') return '';
        current = (current as Record<string, unknown>)[segment];
      }
      return current == null ? '' : String(current);
    });
  }
  if (Array.isArray(value)) return value.map((item) => template(item, context));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, template(item, context)]));
  return value;
}

function matchesFilter(payload: Record<string, unknown>, filter: unknown): boolean {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return true;
  return Object.entries(filter as Record<string, unknown>).every(([key, expected]) => payload[key] === expected);
}

async function activeAutomations(): Promise<admin.firestore.QueryDocumentSnapshot[]> {
  const results: admin.firestore.QueryDocumentSnapshot[] = [];
  let lastId: string | undefined;
  while (true) {
    let query = db.collection('module_automations').where('active', '==', true).orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (lastId) query = query.startAfter(lastId);
    const snapshot = await query.get();
    results.push(...snapshot.docs);
    if (snapshot.size < PAGE_SIZE) return results;
    lastId = snapshot.docs[snapshot.docs.length - 1]?.id;
    if (!lastId) return results;
  }
}

async function enqueueJob(input: { automationId: string; workflowId: string; workflowVersion: number; companyId: string; trigger: string; payload: Record<string, unknown>; idempotencyKey: string }): Promise<string> {
  const ref = db.collection('automation_jobs').doc(input.idempotencyKey);
  await db.runTransaction(async (transaction) => {
    if ((await transaction.get(ref)).exists) return;
    transaction.create(ref, { id: ref.id, companyId: input.companyId, automationId: input.automationId, workflowId: input.workflowId, workflowVersion: input.workflowVersion, trigger: input.trigger, payload: input.payload, idempotencyKey: input.idempotencyKey, status: 'pending', attempts: 0, maxAttempts: MAX_ATTEMPTS, createdAt: now(), updatedAt: now(), nextAttemptAt: now() });
  });
  return ref.id;
}

async function scheduleCrons(date: Date): Promise<void> {
  const automations = await activeAutomations();
  for (const automation of automations) {
    const data = automation.data();
    const trigger = data.trigger as Record<string, unknown> | undefined;
    if (!trigger || trigger.type !== 'cron') continue;
    const cron = String(trigger.cron ?? '');
    const timezone = String(trigger.timezone ?? 'UTC');
    try { if (!cronMatches(cron, date, timezone)) continue; } catch { continue; }
    const key = minuteKey(date, timezone);
    const jobId = `${automation.id}_${key.replace(/[^A-Za-z0-9_-]/g, '_')}`;
    await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(automation.ref);
      const freshData = fresh.data() ?? {};
      if (freshData.active !== true || freshData.lastScheduledKey === key) return;
      const workflowId = typeof freshData.workflowId === 'string' ? freshData.workflowId : '';
      const companyId = typeof freshData.companyId === 'string' ? freshData.companyId : '';
      if (!workflowId || !companyId) return;
      const workflowRef = db.collection('module_workflows').doc(workflowId);
      const workflow = await transaction.get(workflowRef);
      const workflowVersion = Number(workflow.data()?.version ?? 1);
      if (!workflow.exists || workflow.data()?.companyId !== companyId) return;
      const jobRef = db.collection('automation_jobs').doc(jobId);
      const existing = await transaction.get(jobRef);
      if (!existing.exists) transaction.create(jobRef, { id: jobId, companyId, automationId: automation.id, workflowId, workflowVersion, trigger: 'cron', payload: { scheduledAt: date.toISOString(), minuteKey: key }, idempotencyKey: jobId, status: 'pending', attempts: 0, maxAttempts: MAX_ATTEMPTS, createdAt: now(), updatedAt: now(), nextAttemptAt: now() });
      transaction.update(automation.ref, { lastScheduledKey: key, updatedAt: now() });
    });
  }
}

async function enqueueMatchingEvent(companyId: string, eventName: string, eventId: string | undefined, payload: Record<string, unknown>): Promise<string[]> {
  const snapshot = await db.collection('module_automations').where('companyId', '==', companyId).limit(PAGE_SIZE).get();
  const jobs: string[] = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.active !== true) continue;
    const trigger = data.trigger as Record<string, unknown> | undefined;
    if (!trigger || trigger.type !== 'event' || trigger.eventName !== eventName || !matchesFilter(payload, trigger.filter)) continue;
    const workflowId = typeof data.workflowId === 'string' ? data.workflowId : '';
    if (!workflowId) continue;
    const workflow = await db.collection('module_workflows').doc(workflowId).get();
    if (!workflow.exists || workflow.data()?.companyId !== companyId) continue;
    const eventKey = eventId || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const idempotencyKey = `${doc.id}_${eventName}_${eventKey}`;
    jobs.push(await enqueueJob({ automationId: doc.id, workflowId, workflowVersion: Number(workflow.data()?.version ?? 1), companyId, trigger: 'event', payload, idempotencyKey }));
  }
  return jobs;
}

async function claimJob(ref: admin.firestore.DocumentReference): Promise<Record<string, unknown> | null> {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data() ?? {};
    const status = String(data.status ?? '');
    const nowMs = Date.now();
    const leaseUntil = data.leaseUntil instanceof admin.firestore.Timestamp ? data.leaseUntil.toMillis() : 0;
    const nextAttempt = data.nextAttemptAt instanceof admin.firestore.Timestamp ? data.nextAttemptAt.toMillis() : 0;
    if (status === 'succeeded' || status === 'dead') return null;
    if (status === 'running' && leaseUntil > nowMs) return null;
    if (status === 'pending' && nextAttempt > nowMs) return null;
    const attempts = Number(data.attempts ?? 0) + 1;
    transaction.update(ref, { status: 'running', attempts, leaseUntil: admin.firestore.Timestamp.fromMillis(nowMs + LEASE_MS), startedAt: data.startedAt ?? now(), updatedAt: now() });
    return { ...data, id: snapshot.id, attempts };
  });
}

async function executeStep(companyId: string, jobId: string, step: z.infer<typeof WorkflowStepSchema>, payload: Record<string, unknown>): Promise<void> {
  const config = template(step.config, { payload, job: { id: jobId }, company: { id: companyId } }) as Record<string, unknown>;
  if (step.type === 'log') { logger.info('Automation workflow step', { companyId, jobId, stepId: step.id, message: String(config.message ?? step.name ?? '') }); return; }
  if (step.type === 'condition') {
    const actual = payload[String(config.field ?? '')];
    const expected = config.value;
    const operator = String(config.operator ?? 'equals');
    const valid = operator === 'equals' ? actual === expected : operator === 'not_equals' ? actual !== expected : operator === 'contains' ? String(actual ?? '').includes(String(expected ?? '')) : false;
    if (!valid && String(config.whenFalse ?? 'stop') === 'stop') throw new Error('CONDITION_NOT_MET');
    return;
  }
  if (step.type === 'http') {
    const url = String(config.url ?? '');
    const method = String(config.method ?? 'POST').toUpperCase();
    if (!url.startsWith('https://')) throw new Error('HTTP_URL_NOT_ALLOWED');
    const parsed = new URL(url);
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(parsed.hostname)) throw new Error('HTTP_HOST_NOT_ALLOWED');
    const headers = typeof config.headers === 'object' && config.headers ? Object.fromEntries(Object.entries(config.headers as Record<string, unknown>).map(([key, value]) => [key, String(value)])) : {};
    headers['Idempotency-Key'] = `${companyId}:${jobId}:${step.id}`;
    const response = await fetch(url, { method, headers, body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(config.body ?? payload), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return;
  }
  const module = String(config.module ?? '');
  const collection = MODULE_COLLECTIONS[module];
  if (!collection) throw new Error('MODULE_NOT_ALLOWED');
  const moduleData = { ...(config.data && typeof config.data === 'object' && !Array.isArray(config.data) ? config.data as Record<string, unknown> : {}) };
  if (step.type === 'module.create') {
    const deterministicId = `job_${jobId.slice(0, 40)}_${step.id}`;
    await db.collection(collection).doc(deterministicId).set({ ...moduleData, id: deterministicId, companyId, createdBy: 'automation-worker', updatedBy: 'automation-worker', createdAt: now(), updatedAt: now(), version: 1 }, { merge: true });
    return;
  }
  const targetId = String(config.id ?? '');
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(targetId)) throw new Error('INVALID_TARGET_ID');
  const ref = db.collection(collection).doc(targetId);
  const target = await ref.get();
  if (!target.exists || target.data()?.companyId !== companyId) throw new Error('TARGET_NOT_FOUND');
  if (step.type === 'module.update') { await ref.update({ ...moduleData, updatedBy: 'automation-worker', updatedAt: now(), version: admin.firestore.FieldValue.increment(1) }); return; }
  await ref.delete();
}

async function executeJob(job: Record<string, unknown>): Promise<void> {
  const jobId = String(job.id);
  const companyId = String(job.companyId);
  const workflowId = String(job.workflowId);
  const workflowVersion = Number(job.workflowVersion ?? 1);
  const workflowSnapshot = await db.collection('module_workflows').doc(workflowId).collection('versions').doc(String(workflowVersion)).get();
  if (!workflowSnapshot.exists || workflowSnapshot.data()?.active !== true) throw new Error('WORKFLOW_VERSION_NOT_FOUND');
  const workflow = WorkflowSchema.safeParse(workflowSnapshot.data());
  if (!workflow.success) throw new Error('WORKFLOW_INVALID');
  const runRef = db.collection('automation_runs').doc(jobId);
  await runRef.set({ id: jobId, jobId, automationId: job.automationId, workflowId, workflowVersion, companyId, status: 'running', attempts: job.attempts, startedAt: now(), updatedAt: now() }, { merge: true });
  try {
    for (const step of workflow.data.steps) {
      const stepRef = runRef.collection('steps').doc(step.id);
      const stepState = await stepRef.get();
      if (stepState.data()?.status === 'succeeded') continue;
      await db.runTransaction(async (transaction) => {
        const current = await transaction.get(stepRef);
        if (current.data()?.status === 'succeeded') return;
        transaction.set(stepRef, { stepId: step.id, status: 'running', attempts: Number(current.data()?.attempts ?? 0) + 1, updatedAt: now() }, { merge: true });
      });
      try {
        await executeStep(companyId, jobId, step, (job.payload && typeof job.payload === 'object') ? job.payload as Record<string, unknown> : {});
        await stepRef.set({ status: 'succeeded', finishedAt: now(), updatedAt: now(), error: admin.firestore.FieldValue.delete() }, { merge: true });
      } catch (error) {
        await stepRef.set({ status: 'failed', error: error instanceof Error ? error.message : 'STEP_FAILED', updatedAt: now() }, { merge: true });
        throw error;
      }
    }
    await runRef.set({ status: 'succeeded', finishedAt: now(), updatedAt: now() }, { merge: true });
  } catch (error) {
    await runRef.set({ status: 'failed', error: error instanceof Error ? error.message : 'RUN_FAILED', updatedAt: now() }, { merge: true });
    throw error;
  }
}

async function processQueue(): Promise<void> {
  const pending = await db.collection('automation_jobs').where('status', '==', 'pending').limit(MAX_JOBS_PER_TICK).get();
  const running = await db.collection('automation_jobs').where('status', '==', 'running').limit(MAX_JOBS_PER_TICK).get();
  for (const ref of [...pending.docs, ...running.docs]) {
    const job = await claimJob(ref.ref);
    if (!job) continue;
    try {
      await executeJob(job);
      await ref.ref.update({ status: 'succeeded', leaseUntil: admin.firestore.FieldValue.delete(), finishedAt: now(), updatedAt: now(), error: admin.firestore.FieldValue.delete() });
    } catch (error) {
      const attempts = Number(job.attempts ?? 1);
      const message = error instanceof Error ? error.message : 'JOB_FAILED';
      if (attempts >= MAX_ATTEMPTS) {
        await ref.ref.update({ status: 'dead', leaseUntil: admin.firestore.FieldValue.delete(), finishedAt: now(), updatedAt: now(), error: message });
        await db.collection('automation_dead_letters').doc(ref.id).set({ ...job, status: 'dead', error: message, deadAt: now() }, { merge: true });
      } else {
        const delayMs = Math.min(15 * 60 * 1000, 30 * 1000 * (2 ** (attempts - 1)));
        await ref.ref.update({ status: 'pending', nextAttemptAt: admin.firestore.Timestamp.fromMillis(Date.now() + delayMs), leaseUntil: admin.firestore.FieldValue.delete(), updatedAt: now(), error: message });
      }
      logger.error('Automation job failed', { jobId: ref.id, attempts, error: message });
    }
  }
}

export const automationWorker = onSchedule({ schedule: '* * * * *', timeZone: 'UTC', region: REGION, timeoutSeconds: 540, memory: '512MiB' }, async () => {
  const started = Date.now();
  await scheduleCrons(new Date());
  await processQueue();
  logger.info('Automation worker tick completed', { durationMs: Date.now() - started });
});

export const triggerAutomationEvent = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'A autenticação é necessária.');
  const companyId = typeof request.auth.token.companyId === 'string' ? request.auth.token.companyId : '';
  if (!companyId) throw new HttpsError('permission-denied', 'Empresa não encontrada.');
  const member = await db.collection('companies').doc(companyId).collection('members').doc(request.auth.uid).get();
  if (!member.exists || member.data()?.status !== 'active') throw new HttpsError('permission-denied', 'Membership inactiva.');
  const parsed = EventSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Evento inválido.');
  const jobs = await enqueueMatchingEvent(companyId, parsed.data.eventName, parsed.data.eventId, parsed.data.payload);
  return { queued: jobs.length, jobIds: jobs };
});

export const runAutomationNow = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'A autenticação é necessária.');
  const companyId = typeof request.auth.token.companyId === 'string' ? request.auth.token.companyId : '';
  if (!companyId) throw new HttpsError('permission-denied', 'Empresa não encontrada.');
  const member = await db.collection('companies').doc(companyId).collection('members').doc(request.auth.uid).get();
  if (!member.exists || !['owner', 'admin', 'manager'].includes(String(member.data()?.role))) throw new HttpsError('permission-denied', 'Sem permissão para executar automações.');
  const parsed = AutomationSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Dados da automação inválidos.');
  const automation = await db.collection('module_automations').doc(parsed.data.id).get();
  if (!automation.exists || automation.data()?.companyId !== companyId || automation.data()?.active !== true) throw new HttpsError('failed-precondition', 'Automação inexistente ou inactiva.');
  const workflowId = String(automation.data()?.workflowId ?? '');
  const workflow = await db.collection('module_workflows').doc(workflowId).get();
  if (!workflow.exists || workflow.data()?.companyId !== companyId) throw new HttpsError('failed-precondition', 'Workflow inexistente.');
  const workflowVersion = Number(workflow.data()?.version ?? 1);
  const idempotencyKey = `manual_${parsed.data.id}_${Date.now()}_${request.auth.uid}`;
  const jobId = await enqueueJob({ automationId: parsed.data.id, workflowId, workflowVersion, companyId, trigger: 'manual', payload: parsed.data.payload, idempotencyKey });
  return { queued: true, jobId, workflowVersion };
});