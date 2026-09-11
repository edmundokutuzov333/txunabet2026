import 'server-only';

import { getAdminStorage } from '@/server/firebase/admin';
import { requireIdentity } from '@/server/authorization';

export const MAX_FILE_SIZE = 100 * 1024 * 1024;

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
}

export async function buildCompanyStoragePath(input: {
  companyId: string;
  ownerId: string;
  fileName: string;
  scope: 'user' | 'conversation' | 'document';
  scopeId?: string;
}): Promise<string> {
  const identity = await requireIdentity();
  if (identity.companyId !== input.companyId || identity.uid !== input.ownerId) throw new Error('FORBIDDEN');

  const owner = safeSegment(input.ownerId);
  const fileName = safeSegment(input.fileName);
  const scopeId = input.scopeId ? safeSegment(input.scopeId) : null;

  if (input.scope === 'conversation' && scopeId) {
    return `companies/${input.companyId}/conversations/${scopeId}/attachments/${owner}/${fileName}`;
  }
  if (input.scope === 'document' && scopeId) {
    return `companies/${input.companyId}/documents/${scopeId}/assets/${owner}/${fileName}`;
  }
  return `companies/${input.companyId}/users/${owner}/files/${fileName}`;
}

export function assertFileSize(sizeBytes: number): void {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE) throw new Error('FILE_SIZE_NOT_ALLOWED');
}

export async function createSignedDownloadUrl(storagePath: string): Promise<string> {
  const identity = await requireIdentity();
  if (!storagePath.startsWith(`companies/${identity.companyId}/`)) throw new Error('FORBIDDEN');

  const [url] = await getAdminStorage().bucket().file(storagePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + 10 * 60 * 1000,
  });
  return url;
}
