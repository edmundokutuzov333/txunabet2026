import { strict as assert } from 'node:assert';
import test from 'node:test';
import { ENTITY_TYPES, DomainEventInputSchema, RelationshipInputSchema } from '../../src/server/domain/entities';
import { RESOURCE_PERMISSION_MAP } from '../../src/server/authorization/resources';

test('foundation exposes the complete universal entity catalog', () => {
  assert.equal(ENTITY_TYPES.length, 32);
  assert.ok(ENTITY_TYPES.includes('company'));
  assert.ok(ENTITY_TYPES.includes('automation_run'));
  assert.ok(ENTITY_TYPES.includes('integration'));
});

test('domain events enforce stable event naming and bounded payload shape', () => {
  const valid = DomainEventInputSchema.safeParse({
    eventName: 'campaign.approved',
    entityType: 'campaign',
    entityId: 'campaign_123',
    payload: { campaignId: 'campaign_123' },
    metadata: {},
  });
  assert.equal(valid.success, true);
  const invalid = DomainEventInputSchema.safeParse({
    eventName: 'INVALID',
    entityType: 'campaign',
    entityId: 'x',
  });
  assert.equal(invalid.success, false);
});

test('relationships reject malformed resource identifiers and preserve typed entities', () => {
  const valid = RelationshipInputSchema.safeParse({
    sourceType: 'task',
    sourceId: 'task_1',
    relationshipType: 'belongs_to',
    targetType: 'project',
    targetId: 'project_1',
    metadata: {},
  });
  assert.equal(valid.success, true);
  const invalid = RelationshipInputSchema.safeParse({
    sourceType: 'unknown',
    sourceId: 'task_1',
    relationshipType: 'belongs_to',
    targetType: 'project',
    targetId: 'project_1',
  });
  assert.equal(invalid.success, false);
});

test('every universal resource exposes the required action matrix', () => {
  const required = ['read', 'create', 'update', 'delete', 'manage', 'approve', 'execute', 'admin', 'export', 'share'] as const;
  for (const entity of ENTITY_TYPES) {
    for (const action of required) assert.ok(action in RESOURCE_PERMISSION_MAP[entity]);
  }
});
