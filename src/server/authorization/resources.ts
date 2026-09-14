import type { AuthenticatedIdentity } from './index';
import type { MembershipRole } from './permissions';
import { ROLE_PERMISSIONS, roleHasPermission, type Permission } from './permissions';
import { type EntityType, type ResourceAction } from '@/server/domain/entities';

export const RESOURCE_PERMISSION_MAP: Record<EntityType, Record<ResourceAction, Permission | null>> = {
  company: { read: 'company.read', create: 'company.create', update: 'company.update', delete: 'company.delete', manage: 'company.manage', approve: null, execute: null, admin: 'company.admin', export: 'company.export', share: 'company.share' },
  department: { read: 'departments.read', create: 'departments.manage', update: 'departments.manage', delete: 'departments.manage', manage: 'departments.manage', approve: null, execute: null, admin: 'departments.manage', export: 'departments.read', share: 'departments.manage' },
  team: { read: 'teams.read', create: 'teams.manage', update: 'teams.manage', delete: 'teams.manage', manage: 'teams.manage', approve: null, execute: null, admin: 'teams.manage', export: 'teams.read', share: 'teams.manage' },
  user: { read: 'users.read', create: 'users.manage', update: 'users.manage', delete: 'users.manage', manage: 'users.manage', approve: null, execute: null, admin: 'users.manage', export: 'users.read', share: null },
  workspace: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: null, execute: null, admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  project: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  task: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  goal: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  key_result: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  campaign: { read: 'marketing.read', create: 'marketing.manage', update: 'marketing.manage', delete: 'marketing.manage', manage: 'marketing.manage', approve: 'marketing.manage', execute: 'marketing.manage', admin: 'marketing.manage', export: 'marketing.read', share: 'marketing.manage' },
  meeting: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  event: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  message: { read: 'chat.read', create: 'chat.write', update: 'chat.write', delete: 'chat.moderate', manage: 'chat.moderate', approve: null, execute: null, admin: 'chat.moderate', export: 'chat.read', share: 'chat.write' },
  channel: { read: 'chat.read', create: 'chat.write', update: 'chat.moderate', delete: 'chat.moderate', manage: 'chat.moderate', approve: null, execute: null, admin: 'chat.moderate', export: 'chat.read', share: 'chat.write' },
  document: { read: 'documents.read', create: 'documents.create', update: 'documents.edit', delete: 'documents.edit', manage: 'documents.edit', approve: 'documents.share', execute: null, admin: 'documents.share', export: 'documents.read', share: 'documents.share' },
  file: { read: 'files.read', create: 'files.write', update: 'files.write', delete: 'files.write', manage: 'files.write', approve: null, execute: null, admin: 'files.write', export: 'files.read', share: 'files.write' },
  knowledge_article: { read: 'knowledge.read', create: 'knowledge.manage', update: 'knowledge.manage', delete: 'knowledge.manage', manage: 'knowledge.manage', approve: 'knowledge.manage', execute: 'knowledge.manage', admin: 'knowledge.manage', export: 'knowledge.read', share: 'knowledge.manage' },
  decision: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  form: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  form_submission: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  approval: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  workflow: { read: 'automation.read', create: 'automation.manage', update: 'automation.manage', delete: 'automation.manage', manage: 'automation.manage', approve: 'automation.manage', execute: 'automation.manage', admin: 'automation.manage', export: 'automation.read', share: 'automation.manage' },
  workflow_version: { read: 'automation.read', create: 'automation.manage', update: 'automation.manage', delete: 'automation.manage', manage: 'automation.manage', approve: 'automation.manage', execute: 'automation.manage', admin: 'automation.manage', export: 'automation.read', share: 'automation.manage' },
  automation: { read: 'automation.read', create: 'automation.manage', update: 'automation.manage', delete: 'automation.manage', manage: 'automation.manage', approve: 'automation.manage', execute: 'automation.manage', admin: 'automation.manage', export: 'automation.read', share: 'automation.manage' },
  automation_job: { read: 'automation.read', create: 'automation.manage', update: 'automation.manage', delete: 'automation.manage', manage: 'automation.manage', approve: 'automation.manage', execute: 'automation.manage', admin: 'automation.manage', export: 'automation.read', share: 'automation.manage' },
  automation_run: { read: 'automation.read', create: 'automation.manage', update: 'automation.manage', delete: 'automation.manage', manage: 'automation.manage', approve: null, execute: 'automation.manage', admin: 'automation.manage', export: 'automation.read', share: 'automation.manage' },
  report: { read: 'reporting.read', create: 'reporting.manage', update: 'reporting.manage', delete: 'reporting.manage', manage: 'reporting.manage', approve: 'reporting.manage', execute: 'reporting.manage', admin: 'reporting.manage', export: 'reporting.read', share: 'reporting.manage' },
  incident: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  risk: { read: 'operations.read', create: 'operations.manage', update: 'operations.manage', delete: 'operations.manage', manage: 'operations.manage', approve: 'operations.manage', execute: 'operations.manage', admin: 'operations.manage', export: 'operations.read', share: 'operations.manage' },
  notification: { read: 'chat.read', create: 'chat.write', update: 'chat.write', delete: 'chat.write', manage: 'chat.moderate', approve: null, execute: null, admin: 'chat.moderate', export: 'chat.read', share: 'chat.write' },
  activity: { read: 'operations.read', create: null, update: null, delete: null, manage: 'operations.manage', approve: null, execute: null, admin: 'operations.manage', export: 'operations.read', share: null },
  integration: { read: 'automation.read', create: 'automation.manage', update: 'automation.manage', delete: 'automation.manage', manage: 'automation.manage', approve: 'automation.manage', execute: 'automation.manage', admin: 'automation.manage', export: 'automation.read', share: 'automation.manage' },
};

export function resourcePermission(entity: EntityType, action: ResourceAction): Permission | null {
  return RESOURCE_PERMISSION_MAP[entity][action];
}

export function hasResourceAction(identity: AuthenticatedIdentity, entity: EntityType, action: ResourceAction): boolean {
  const permission = resourcePermission(entity, action);
  if (!permission) return false;
  return roleHasPermission(identity.role, permission, identity.permissions);
}

export function roleSupportsResourceAction(role: MembershipRole, entity: EntityType, action: ResourceAction): boolean {
  const permission = resourcePermission(entity, action);
  return Boolean(permission && ROLE_PERMISSIONS[role]?.includes(permission));
}
