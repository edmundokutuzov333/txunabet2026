import { ENTITY_TYPES, collectionForEntity, type EntityType } from './entities';

export interface EntityDefinition {
  type: EntityType;
  collection: string;
  title: string;
  description: string;
  auditable: boolean;
  relational: boolean;
}

const labels: Record<EntityType, { title: string; description: string }> = {
  company: { title: 'Company', description: 'Enterprise tenant and security boundary.' },
  department: { title: 'Department', description: 'Organizational business unit.' },
  team: { title: 'Team', description: 'Operational group within the company.' },
  user: { title: 'User', description: 'Enterprise identity and workforce member.' },
  workspace: { title: 'Workspace', description: 'Operational environment grouping work and context.' },
  project: { title: 'Project', description: 'Finite body of coordinated work.' },
  task: { title: 'Task', description: 'Actionable unit of work.' },
  goal: { title: 'Goal', description: 'Strategic objective connected to measurable work.' },
  key_result: { title: 'Key Result', description: 'Measurable outcome attached to a goal.' },
  campaign: { title: 'Campaign', description: 'Marketing or operational campaign.' },
  meeting: { title: 'Meeting', description: 'Synchronous collaboration session.' },
  event: { title: 'Event', description: 'Calendar event or scheduled activity.' },
  message: { title: 'Message', description: 'Communication message within a channel.' },
  channel: { title: 'Channel', description: 'Persistent communication space.' },
  document: { title: 'Document', description: 'Structured collaborative enterprise document.' },
  file: { title: 'File', description: 'Binary or uploaded enterprise asset.' },
  knowledge_article: { title: 'Knowledge Article', description: 'Reusable enterprise knowledge item.' },
  decision: { title: 'Decision', description: 'Recorded organizational decision with context and ownership.' },
  form: { title: 'Form', description: 'Structured input definition.' },
  form_submission: { title: 'Form Submission', description: 'Submitted instance of a form.' },
  approval: { title: 'Approval', description: 'Human or system approval request and decision state.' },
  workflow: { title: 'Workflow', description: 'Versioned executable business process.' },
  workflow_version: { title: 'Workflow Version', description: 'Immutable executable snapshot of a workflow.' },
  automation: { title: 'Automation', description: 'Trigger definition bound to a workflow.' },
  automation_job: { title: 'Automation Job', description: 'Durable queued automation execution.' },
  automation_run: { title: 'Automation Run', description: 'Execution history for an automation job.' },
  report: { title: 'Report', description: 'Persisted analytical or operational report.' },
  incident: { title: 'Incident', description: 'Operational incident requiring coordinated response.' },
  risk: { title: 'Risk', description: 'Tracked operational or project risk.' },
  notification: { title: 'Notification', description: 'User-facing event requiring awareness or action.' },
  activity: { title: 'Activity', description: 'Normalized activity event used by feeds and pulse.' },
  integration: { title: 'Integration', description: 'Connection to an external or internal system.' },
};

export const ENTITY_REGISTRY: Record<EntityType, EntityDefinition> = Object.fromEntries(
  ENTITY_TYPES.map((type) => [type, { type, collection: collectionForEntity(type), ...labels[type], auditable: true, relational: !['notification'].includes(type) }]),
) as Record<EntityType, EntityDefinition>;

export function getEntityDefinition(type: EntityType): EntityDefinition {
  return ENTITY_REGISTRY[type];
}
