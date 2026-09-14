import { strict as assert } from 'node:assert';
import test, { after } from 'node:test';
import * as admin from 'firebase-admin';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.GCLOUD_PROJECT ||= 'oryon-foundation-test';
process.env.FIREBASE_PROJECT_ID ||= process.env.GCLOUD_PROJECT;

if (!admin.apps.length) admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = admin.firestore();

const { queueDomainEventTransaction } = await import('../../src/server/services/foundation');

function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

after(async () => {
  await admin.app().delete();
});

test('entity mutation and domain event are committed atomically', async () => {
  const companyId = uniqueId('company');
  const taskId = uniqueId('task');
  const eventId = uniqueId('event');
  const taskRef = db.collection('module_tasks').doc(taskId);
  const outboxRef = db.collection('event_outbox').doc(eventId);

  await db.runTransaction(async (transaction) => {
    transaction.create(taskRef, {
      id: taskId,
      companyId,
      createdBy: 'integration-test-user',
      updatedBy: 'integration-test-user',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      status: 'active',
      metadata: {},
      permissions: {},
      version: 1,
      title: 'Foundation integration task',
    });
    await queueDomainEventTransaction(transaction, {
      eventName: 'task.created',
      entityType: 'task',
      entityId: taskId,
      payload: { taskId, title: 'Foundation integration task' },
      metadata: { source: 'integration-test' },
    }, { companyId, actorId: 'integration-test-user', eventId });
  });

  const [task, event] = await Promise.all([taskRef.get(), outboxRef.get()]);
  assert.equal(task.exists, true);
  assert.equal(event.exists, true);
  assert.equal(event.data()?.eventName, 'task.created');
  assert.equal(event.data()?.entityId, taskId);
  assert.equal(event.data()?.companyId, companyId);
  assert.equal(event.data()?.status, 'pending');
});

test('invalid domain event is rejected before an outbox record can exist', async () => {
  const eventId = uniqueId('invalid_event');
  await assert.rejects(async () => {
    await db.runTransaction(async (transaction) => {
      await queueDomainEventTransaction(transaction, {
        eventName: 'NOT VALID',
        entityType: 'task',
        entityId: 'task_invalid',
        payload: {},
        metadata: {},
      }, { companyId: 'company_invalid', actorId: 'integration-test-user', eventId });
    });
  });
  const event = await db.collection('event_outbox').doc(eventId).get();
  assert.equal(event.exists, false);
});

test('relationship records preserve tenant boundaries and deterministic identities', async () => {
  const companyId = uniqueId('company');
  const sourceId = uniqueId('task');
  const targetId = uniqueId('project');
  const relationshipId = `task:${sourceId}|belongs_to|project:${targetId}`;
  const ref = db.collection('entity_relationships').doc(relationshipId);

  await ref.create({
    id: relationshipId,
    companyId,
    sourceType: 'task',
    sourceId,
    relationshipType: 'belongs_to',
    targetType: 'project',
    targetId,
    createdBy: 'integration-test-user',
    createdAt: admin.firestore.Timestamp.now(),
    metadata: {},
  });

  const snapshot = await ref.get();
  assert.equal(snapshot.exists, true);
  assert.equal(snapshot.data()?.companyId, companyId);
  assert.equal(snapshot.data()?.relationshipType, 'belongs_to');
  assert.equal(snapshot.data()?.sourceId, sourceId);
  assert.equal(snapshot.data()?.targetId, targetId);
});

test('automation step receipt can act as a durable idempotency record', async () => {
  const companyId = uniqueId('company');
  const jobId = uniqueId('job');
  const executionId = uniqueId('execution');
  const stepId = 'create_task';
  const receiptId = `${jobId}:${executionId}:${stepId}`;
  const ref = db.collection('automation_step_receipts').doc(receiptId);

  const firstResult = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists && existing.data()?.status === 'completed') return existing.data()?.result;
    const result = { createdId: 'deterministic_task_1' };
    transaction.create(ref, {
      companyId,
      jobId,
      executionId,
      stepId,
      mutationKey: `${companyId}:${jobId}:${executionId}:${stepId}`,
      status: 'completed',
      result,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    return result;
  });

  const secondResult = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists && existing.data()?.status === 'completed') return existing.data()?.result;
    throw new Error('receipt_should_exist');
  });

  assert.deepEqual(secondResult, firstResult);
  assert.equal((await ref.get()).data()?.status, 'completed');
});
