export const ROLES = {
  ADMIN: 'admin',
  CONTENT_MANAGER: 'contentManager',
  RISK_ANALYST: 'riskAnalyst',
  SUPPORT_AGENT: 'supportAgent',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];
