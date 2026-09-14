import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';

if (!admin.apps?.length) admin.initializeApp();
const db = admin.firestore();
const REGION = 'africa-south1';
const MAX_EVENTS_PER_TICK = 50;
const LEASE_MS = 8 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const RETRY_MS = 30 * 1000;

function now() { return admin.firestore.Timestamp.now(); }

async function enqueueAutomationJobs(event: Record<string, unknown>): Promise<number> {
  const companyId = String(event.companyId ?? '');
  const eventName = String(event.eventName ?? '');
  const eventId = String(event.eventId ?? '');
  const payload = event.payload && typeof event.payload === 'object' ? event.payload as Record<string, unknown> : {};
  if (!companyId || !eventName || !eventId) throw new Error('INVALID_OUTBOX_EVENT');

  let lastId: string | undefined;
  let created = 0;
  while (true) {
    let query = db.collection('module_automations')
      .where('companyId', '==', companyId)
      .where('active', '==', true)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(500);
    if (lastId) query = query.startAfter(lastId);
    const automations = await query.get();
    for (const automation of automations.docs) {
      const data = automation.data();
      const trigger = data.trigger as Record<string, unknown> | undefined;
      if (!trigger || trigger.type !== 'event' || trigger.eventName !== eventName) continue;
      const filter = trigger.filter;
      if (filter && typeof filter === 'object' && !Array.isArray(filter)) {
        const matches = Object.entries(filter as Record<string, unknown>).every(([key, expected]) => payload[key] === expected);
        if (!matches) continue;
      }
      const workflowId = String(data.workflowId ?? '');
      if (!workflowId) continue;
      const workflow = await db.collection('module_workflows').doc(workflowId).get();
      if (!workflow.exists || workflow.data()?.companyId !== companyId) continue;
      const workflowVersion = Number(workflow.data()?.version ?? 1);
      const idempotencyKey = `${automation.id}_${eventName}_${eventId}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 700);
      const jobRef = db.collection('automation_jobs').doc(idempotencyKey);
      await db.runTransaction(async (transaction) => {
        if ((await transaction.get(jobRef)).exists) return;
        transaction.create(jobRef, {
          id: jobRef.id,
          companyId,
          automationId: automation.id,
          workflowId,
          workflowVersion,
          trigger: 'event',
          payload: { ...payload, eventName, eventId },
          idempotencyKey,
          status: 'pending',
          attempts: 0,
          maxAttempts: 5,
          createdAt: now(),
          updatedAt: now(),
          nextAttemptAt: now(),
        });
        created += 1;
      });
    }
    if (automations.size < 500) return created;
    lastId = automations.docs[automations.docs.length - 1]?.id;
    if (!lastId) return created;
  }
}

async function processOne(doc: admin.firestore.QueryDocumentSnapshot): Promise<void> {
  const ref = doc.ref;
  const claimed = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    if (!current.exists) return null;
    const data = current.data() ?? {};
    if (data.status !== 'pending') return null;
    const nextAttemptAt = data.nextAttemptAt instanceof admin.firestore.Timestamp ? data.nextAttemptAt.toMillis() : 0;
    if (nextAttemptAt > Date.now()) return null;
    const attempts = Number(data.attempts ?? 0) + 1;
    transaction.update(ref, {
      status: 'processing',
      attempts,
      leaseUntil: admin.firestore.Timestamp.fromMillis(Date.now() + LEASE_MS),
      updatedAt: now(),
    });
    return { ...data, id: current.id, attempts } as Record<string, unknown>;
  });
  if (!claimed) return;

  try {
    await enqueueAutomationJobs(claimed);
    await ref.update({ status: 'published', publishedAt: now(), leaseUntil: admin.firestore.FieldValue.delete(), updatedAt: now(), lastError: admin.firestore.FieldValue.delete() });
  } catch (error) {
    const attempts = Number(claimed.attempts ?? 1);
    const message = error instanceof Error ? error.message : 'OUTBOX_DISPATCH_FAILED';
    if (attempts >= MAX_ATTEMPTS) {
      await ref.update({ status: 'failed', leaseUntil: admin.firestore.FieldValue.delete(), lastError: message, updatedAt: now(), failedAt: now() });
    } else {
      await ref.update({ status: 'pending', leaseUntil: admin.firestore.FieldValue.delete(), lastError: message, nextAttemptAt: admin.firestore.Timestamp.fromMillis(Date.now() + Math.min(15 * 60 * 1000, RETRY_MS * (2 ** (attempts - 1)))), updatedAt: now() });
    }
    logger.error('Domain event outbox processing failed', { eventId: doc.id, attempts, error: message });
  }
}

export const domainEventOutboxWorker = onSchedule({ schedule: '* * * * *', timeZone: 'UTC', region: REGION, timeoutSeconds: 540, memory: '256MiB' }, async () => {
  const snapshot = await db.collection('event_outbox').where('status', '==', 'pending').orderBy('nextAttemptAt', 'asc').limit(MAX_EVENTS_PER_TICK).get();
  for (const doc of snapshot.docs) await processOne(doc);
});
