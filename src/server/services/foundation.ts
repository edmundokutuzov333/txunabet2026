import 'server-only';

import { FieldValue, Timestamp, type DocumentReference, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requirePermission, type AuthenticatedIdentity } from '@/server/authorization';
import { hasResourceAction } from '@/server/authorization/resources';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { getAdminDb } from '@/server/firebase/admin';
import {
  DomainEventInputSchema,
  RelationshipInputSchema,
  ENTITY_TYPES,
  collectionForEntity,
  type DomainEventInput,
  type EntityType,
  type ResourceAction,
} from '@/server/domain/entities';
import { writeAuditEvent } from '@/server/repositories/audit';

const MAX_EVENT_PAYLOAD_BYTES = 50_000;
const MAX_RELATION_METADATA_BYTES = 10_000;

function jsonSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, serialize(item)]));
  return value;
}

function relationshipId(sourceType: string, sourceId: string, relationshipType: string, targetType: string, targetId: string): string {
  return `${sourceType}:${sourceId}|${relationshipType}|${targetType}:${targetId}`.replace(/[^A-Za-z0-9:_|.-]/g, '_').slice(0, 700);
}

function directEntityRef(db: Firestore, entityType: EntityType, entityId: string): DocumentReference | null {
  if (entityType === 'notification' || entityType === 'workflow_version') return null;
  return db.collection(collectionForEntity(entityType)).doc(entityId);
}

async function verifyEntityOwnership(db: Firestore, entityType: EntityType, entityId: string, companyId: string): Promise<void> {
  if (entityType === 'user') {
    const membership = await db.collection('companies').doc(companyId).collection('members').doc(entityId).get();
    if (!membership.exists || membership.data()?.status !== 'active') throw new Error('ENTITY_NOT_FOUND');
    return;
  }
  if (entityType === 'message') {
    const snapshot = await db.collectionGroup('messages').where('companyId', '==', companyId).limit(500).get();
    if (snapshot.docs.some((doc) => doc.id === entityId || doc.ref.path.endsWith(`/messages/${entityId}`))) return;
    throw new Error('ENTITY_NOT_FOUND');
  }
  if (entityType === 'notification') {
    const snapshot = await db.collectionGroup('items').where('companyId', '==', companyId).limit(500).get();
    if (snapshot.docs.some((doc) => doc.id === entityId || doc.ref.path.endsWith(`/items/${entityId}`))) return;
    throw new Error('ENTITY_NOT_FOUND');
  }
  if (entityType === 'workflow_version') throw new Error('ENTITY_RELATION_NOT_SUPPORTED');
  const ref = directEntityRef(db, entityType, entityId);
  if (!ref) throw new Error('ENTITY_NOT_FOUND');
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('ENTITY_NOT_FOUND');
  const data = snapshot.data() ?? {};
  if (entityType === 'company') {
    if (snapshot.id !== companyId) throw new Error('ENTITY_NOT_FOUND');
    return;
  }
  if (data.companyId !== companyId) throw new Error('ENTITY_NOT_FOUND');
}

export async function createRelationship(input: unknown): Promise<Record<string, unknown>> {
  const identity = await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);
  const parsed = RelationshipInputSchema.safeParse(input);
  if (!parsed.success || jsonSize(parsed.data.metadata) > MAX_RELATION_METADATA_BYTES) throw new Error('INVALID_RELATIONSHIP');
  if (parsed.data.sourceType === parsed.data.targetType && parsed.data.sourceId === parsed.data.targetId) throw new Error('SELF_RELATIONSHIP_NOT_ALLOWED');
  if (parsed.data.sourceType === 'workflow_version' || parsed.data.targetType === 'workflow_version') throw new Error('ENTITY_RELATION_NOT_SUPPORTED');
  await verifyEntityOwnership(getAdminDb(), parsed.data.sourceType, parsed.data.sourceId, identity.companyId);
  await verifyEntityOwnership(getAdminDb(), parsed.data.targetType, parsed.data.targetId, identity.companyId);
  const ref = getAdminDb().collection('entity_relationships').doc(relationshipId(parsed.data.sourceType, parsed.data.sourceId, parsed.data.relationshipType, parsed.data.targetType, parsed.data.targetId));
  await ref.create({ ...parsed.data, id: ref.id, companyId: identity.companyId, createdBy: identity.uid, createdAt: FieldValue.serverTimestamp() });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'relationship.create', resourceType: parsed.data.sourceType, resourceId: parsed.data.sourceId, metadata: { targetType: parsed.data.targetType, targetId: parsed.data.targetId, relationshipType: parsed.data.relationshipType } });
  return serialize({ ...(await ref.get()).data(), id: ref.id }) as Record<string, unknown>;
}

export async function deleteRelationship(input: unknown): Promise<void> {
  const identity = await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);
  const parsed = RelationshipInputSchema.pick({ sourceType: true, sourceId: true, relationshipType: true, targetType: true, targetId: true }).safeParse(input);
  if (!parsed.success) throw new Error('INVALID_RELATIONSHIP');
  const ref = getAdminDb().collection('entity_relationships').doc(relationshipId(parsed.data.sourceType, parsed.data.sourceId, parsed.data.relationshipType, parsed.data.targetType, parsed.data.targetId));
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.companyId !== identity.companyId) throw new Error('NOT_FOUND');
  await ref.delete();
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'relationship.delete', resourceType: parsed.data.sourceType, resourceId: parsed.data.sourceId, metadata: { targetType: parsed.data.targetType, targetId: parsed.data.targetId, relationshipType: parsed.data.relationshipType } });
}

export async function listRelationships(entityType: EntityType, entityId: string, direction: 'outgoing' | 'incoming' | 'all' = 'all', limit = 200): Promise<Record<string, unknown>[]> {
  const identity = await requirePermission(PERMISSIONS.OPERATIONS_READ);
  if (!ENTITY_TYPES.includes(entityType) || !/^[A-Za-z0-9_-]{1,180}$/.test(entityId)) throw new Error('INVALID_ENTITY');
  const db = getAdminDb();
  const results = new Map<string, Record<string, unknown>>();
  const capped = Math.min(Math.max(limit, 1), 200);
  if (direction === 'outgoing' || direction === 'all') {
    const snapshot = await db.collection('entity_relationships').where('companyId', '==', identity.companyId).where('sourceType', '==', entityType).where('sourceId', '==', entityId).limit(capped).get();
    for (const doc of snapshot.docs) results.set(doc.id, serialize({ ...(doc.data() ?? {}), id: doc.id }) as Record<string, unknown>);
  }
  if (direction === 'incoming' || direction === 'all') {
    const snapshot = await db.collection('entity_relationships').where('companyId', '==', identity.companyId).where('targetType', '==', entityType).where('targetId', '==', entityId).limit(capped).get();
    for (const doc of snapshot.docs) results.set(doc.id, serialize({ ...(doc.data() ?? {}), id: doc.id }) as Record<string, unknown>);
  }
  return Array.from(results.values()).slice(0, capped);
}

export async function queueDomainEventTransaction(transaction: Transaction, input: DomainEventInput, context: { companyId: string; actorId: string; eventId?: string; db?: Firestore }): Promise<string> {
  const parsed = DomainEventInputSchema.safeParse(input);
  if (!parsed.success || jsonSize(parsed.data.payload) > MAX_EVENT_PAYLOAD_BYTES || jsonSize(parsed.data.metadata) > MAX_RELATION_METADATA_BYTES) throw new Error('INVALID_DOMAIN_EVENT');
  const eventId = context.eventId ?? randomUUID();
  const db = context.db ?? getAdminDb();
  const ref = db.collection('event_outbox').doc(eventId);
  transaction.create(ref, { eventId, companyId: context.companyId, eventName: parsed.data.eventName, entityType: parsed.data.entityType, entityId: parsed.data.entityId, actorId: context.actorId, occurredAt: Timestamp.now(), payload: parsed.data.payload, metadata: parsed.data.metadata, correlationId: parsed.data.correlationId, causationId: parsed.data.causationId, schemaVersion: 1, status: 'pending', attempts: 0, nextAttemptAt: Timestamp.now() });
  return eventId;
}

export async function publishDomainEvent(input: DomainEventInput, options: { companyId: string; actorId: string; eventId?: string }): Promise<string> {
  const parsed = DomainEventInputSchema.safeParse(input);
  if (!parsed.success || jsonSize(parsed.data.payload) > MAX_EVENT_PAYLOAD_BYTES || jsonSize(parsed.data.metadata) > MAX_RELATION_METADATA_BYTES) throw new Error('INVALID_DOMAIN_EVENT');
  const eventId = options.eventId ?? randomUUID();
  await getAdminDb().collection('event_outbox').doc(eventId).create({ eventId, companyId: options.companyId, eventName: parsed.data.eventName, entityType: parsed.data.entityType, entityId: parsed.data.entityId, actorId: options.actorId, occurredAt: Timestamp.now(), payload: parsed.data.payload, metadata: parsed.data.metadata, correlationId: parsed.data.correlationId, causationId: parsed.data.causationId, schemaVersion: 1, status: 'pending', attempts: 0, nextAttemptAt: Timestamp.now() });
  return eventId;
}

export async function recordAuditMutation(input: { identity: AuthenticatedIdentity; entity: EntityType; entityId: string; action: ResourceAction; before?: unknown; after?: unknown; metadata?: Record<string, unknown> }): Promise<void> {
  if (!hasResourceAction(input.identity, input.entity, input.action)) throw new Error('FORBIDDEN');
  await writeAuditEvent({ companyId: input.identity.companyId, actorId: input.identity.uid, action: input.action, resourceType: input.entity, resourceId: input.entityId, metadata: { ...input.metadata, before: serialize(input.before), after: serialize(input.after) } });
}

export const OUTBOX_POLICY = Object.freeze({ maxAttempts: 8, leaseMs: 8 * 60 * 1000, retryMs: 30 * 1000 });

export const FoundationEntitySchema = z.object({ entityType: z.enum(ENTITY_TYPES), collection: z.string().min(1), description: z.string().min(1) });
