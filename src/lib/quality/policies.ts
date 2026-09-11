export type ConversationPolicy = {
  companyId: string;
  type: 'company_general' | 'department' | 'direct' | 'group';
  departmentId?: string | null;
  memberIds?: string[];
};

export type UserPolicyContext = {
  uid: string;
  companyId: string;
  departmentIds: string[];
};

export function canAccessConversation(user: UserPolicyContext, conversation: ConversationPolicy): boolean {
  if (user.companyId !== conversation.companyId) return false;
  if (conversation.type === 'company_general') return true;
  if (conversation.type === 'department') return Boolean(conversation.departmentId && user.departmentIds.includes(conversation.departmentId));
  return Array.isArray(conversation.memberIds) && conversation.memberIds.includes(user.uid);
}

export function canDirectMessage(user: UserPolicyContext, target: { companyId: string; active: boolean; uid: string }): boolean {
  return target.active && target.companyId === user.companyId && target.uid !== user.uid;
}

export function canShareWithUser(user: UserPolicyContext, target: { companyId: string; active: boolean; uid: string }, role: 'editor' | 'viewer'): boolean {
  return Boolean(role) && target.active && target.companyId === user.companyId && target.uid !== user.uid;
}

export function canShareWithDepartment(user: UserPolicyContext, target: { companyId: string; departmentId: string }): boolean {
  return target.companyId === user.companyId && target.departmentId.length > 0;
}

export function normalizeSearchTokens(input: string, limit = 40): string[] {
  return Array.from(new Set(input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9@_-]+/g, ' ').split(/\s+/).filter((token) => token.length >= 2).slice(0, limit)));
}

export function sanitizeAIInput(input: string, maxChars = 12000): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxChars);
}

export function validateAIContext(context: { companyId: string; sourceCompanyId?: string | null }): boolean {
  return Boolean(context.companyId && (!context.sourceCompanyId || context.sourceCompanyId === context.companyId));
}

export function uniqueReactionUsers(users: string[]): string[] {
  return Array.from(new Set(users.filter(Boolean)));
}
