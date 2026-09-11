import 'server-only';

import { getAdminDb } from '@/server/firebase/admin';

export interface AuditEventInput {
  companyId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditEvent(input: AuditEventInput): Promise<void> {
  await getAdminDb()
    .collection('companies')
    .doc(input.companyId)
    .collection('auditLogs')
    .add({
      companyId: input.companyId,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
    });
}
