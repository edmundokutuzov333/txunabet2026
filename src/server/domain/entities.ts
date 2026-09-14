import { z } from 'zod';

export const ENTITY_TYPES = [
  'company',
  'department',
  'team',
  'user',
  'workspace',
  'project',
  'task',
  'goal',
  'key_result',
  'campaign',
  'meeting',
  'event',
  'message',
  'channel',
  'document',
  'file',
  'knowledge_article',
  'decision',
  'form',
  'form_submission',
  'approval',
  'workflow',
  'workflow_version',
  'automation',
  'automation_job',
  'automation_run',
  'report',
  'incident',
  'risk',
  'notification',
  'activity',
  'integration',
] as const;

export type EntityType = typeof ENTITY_TYPES[number];

export const ENTITY_TYPE_SET = new Set<string>(ENTITY_TYPES);

export const RESOURCE_ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'manage',
  'approve',
  'execute',
  'admin',
  'export',
  'share',
] as const;

export type ResourceAction = typeof RESOURCE_ACTIONS[number];

export const ENTITY_STATUSES = [
  'active',
  'inactive',
  'draft',
  'pending',
  'completed',
  'cancelled',
  'archived',
] as const;

export type EntityStatus = typeof ENTITY_STATUSES[number];

const TimestampLikeSchema = z.union([
  z.date(),
  z.string().datetime(),
  z.object({ _seconds: z.number().int(), _nanoseconds: z.number().int() }),
]);

export const MetadataSchema = z.record(z.unknown()).default({});

export const PermissionsSchema = z.object({
  read: z.boolean().optional(),
  create: z.boolean().optional(),
  update: z.boolean().optional(),
  delete: z.boolean().optional(),
  manage: z.boolean().optional(),
  approve: z.boolean().optional(),
  execute: z.boolean().optional(),
  admin: z.boolean().optional(),
  export: z.boolean().optional(),
  share: z.boolean().optional(),
}).default({});

export const BaseEntitySchema = z.object({
  id: z.string().min(1).max(180),
  companyId: z.string().min(1).max(180),
  createdBy: z.string().min(1).max(180),
  createdAt: TimestampLikeSchema,
  updatedAt: TimestampLikeSchema,
  updatedBy: z.string().min(1).max(180),
  status: z.enum(ENTITY_STATUSES).default('active'),
  metadata: MetadataSchema,
  permissions: PermissionsSchema,
  version: z.number().int().positive().default(1),
  workspaceId: z.string().min(1).max(180).optional(),
  projectId: z.string().min(1).max(180).optional(),
  teamId: z.string().min(1).max(180).optional(),
  departmentId: z.string().min(1).max(180).optional(),
  parentId: z.string().min(1).max(180).optional(),
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;

export const RelationshipSchema = z.object({
  sourceType: z.enum(ENTITY_TYPES),
  sourceId: z.string().min(1).max(180),
  relationshipType: z.string().regex(/^[a-z][a-z0-9_.-]{0,80}$/),
  targetType: z.enum(ENTITY_TYPES),
  targetId: z.string().min(1).max(180),
  companyId: z.string().min(1).max(180),
  createdAt: TimestampLikeSchema,
  createdBy: z.string().min(1).max(180),
  metadata: MetadataSchema,
});

export type EntityRelationship = z.infer<typeof RelationshipSchema>;

export const DomainEventSchema = z.object({
  eventId: z.string().min(1).max(180),
  companyId: z.string().min(1).max(180),
  eventName: z.string().regex(/^[a-z][a-z0-9_.-]{2,180}$/),
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1).max(180),
  actorId: z.string().min(1).max(180),
  occurredAt: TimestampLikeSchema,
  payload: z.record(z.unknown()).default({}),
  metadata: MetadataSchema,
  correlationId: z.string().max(180).optional(),
  causationId: z.string().max(180).optional(),
  schemaVersion: z.number().int().positive().default(1),
});

export type DomainEvent = z.infer<typeof DomainEventSchema>;

export const OutboxEventSchema = DomainEventSchema.extend({
  status: z.enum(['pending', 'processing', 'published', 'failed']).default('pending'),
  attempts: z.number().int().nonnegative().default(0),
  nextAttemptAt: TimestampLikeSchema.optional(),
  leaseUntil: TimestampLikeSchema.optional(),
  lastError: z.string().max(2000).optional(),
  publishedAt: TimestampLikeSchema.optional(),
});

export type OutboxEvent = z.infer<typeof OutboxEventSchema>;

export const StepReceiptSchema = z.object({
  companyId: z.string().min(1).max(180),
  jobId: z.string().min(1).max(180),
  executionId: z.string().min(1).max(180),
  stepId: z.string().min(1).max(80),
  mutationKey: z.string().min(1).max(300),
  status: z.enum(['completed', 'failed']),
  result: z.record(z.unknown()).default({}),
  createdAt: TimestampLikeSchema,
  updatedAt: TimestampLikeSchema,
});

export type StepReceipt = z.infer<typeof StepReceiptSchema>;

export const RelationshipInputSchema = z.object({
  sourceType: z.enum(ENTITY_TYPES),
  sourceId: z.string().min(1).max(180),
  relationshipType: z.string().regex(/^[a-z][a-z0-9_.-]{0,80}$/),
  targetType: z.enum(ENTITY_TYPES),
  targetId: z.string().min(1).max(180),
  metadata: MetadataSchema,
});

export const DomainEventInputSchema = z.object({
  eventName: z.string().regex(/^[a-z][a-z0-9_.-]{2,180}$/),
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1).max(180),
  payload: z.record(z.unknown()).default({}),
  metadata: MetadataSchema,
  correlationId: z.string().max(180).optional(),
  causationId: z.string().max(180).optional(),
});

export function isEntityType(value: string): value is EntityType {
  return ENTITY_TYPE_SET.has(value);
}

export function collectionForEntity(entityType: EntityType): string {
  const map: Record<EntityType, string> = {
    company: 'companies',
    department: 'departments',
    team: 'teams',
    user: 'users',
    workspace: 'module_workspaces',
    project: 'projects',
    task: 'module_tasks',
    goal: 'goals',
    key_result: 'key_results',
    campaign: 'module_campaigns',
    meeting: 'module_meetings',
    event: 'module_calendar_events',
    message: 'messages',
    channel: 'conversations',
    document: 'documents',
    file: 'module_cloud_files',
    knowledge_article: 'module_knowledge_articles',
    decision: 'decisions',
    form: 'forms',
    form_submission: 'form_submissions',
    approval: 'approvals',
    workflow: 'module_workflows',
    workflow_version: 'module_workflows',
    automation: 'module_automations',
    automation_job: 'automation_jobs',
    automation_run: 'automation_runs',
    report: 'module_reports',
    incident: 'incidents',
    risk: 'risks',
    notification: 'notifications',
    activity: 'activities',
    integration: 'module_integrations',
  };
  return map[entityType];
}
