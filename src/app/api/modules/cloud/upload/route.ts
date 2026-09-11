import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminStorage } from '@/server/firebase/admin';
import { requirePermission } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { assertFileSize, buildCompanyStoragePath } from '@/server/services/storage';
import { writeAuditEvent } from '@/server/repositories/audit';

export async function POST(request: NextRequest) {
  try {
    const identity = await requirePermission(PERMISSIONS.FILES_WRITE);
    const form = await request.formData();
    const file = form.get('file');
    const folderId = form.get('folderId');
    if (!(file instanceof File)) return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
    assertFileSize(file.size);
    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = await buildCompanyStoragePath({ companyId: identity.companyId, ownerId: identity.uid, fileName: file.name, scope: 'user' });
    await getAdminStorage().bucket().file(storagePath).save(buffer, { resumable: false, metadata: { contentType: file.type || 'application/octet-stream', metadata: { companyId: identity.companyId, ownerId: identity.uid } } });
    const ref = getAdminDb().collection('module_cloud_files').doc();
    const now = FieldValue.serverTimestamp();
    await ref.set({ id: ref.id, companyId: identity.companyId, ownerId: identity.uid, createdBy: identity.uid, updatedBy: identity.uid, createdAt: now, updatedAt: now, version: 1, type: 'file', name: file.name.slice(0, 240), mimeType: file.type || 'application/octet-stream', size: file.size, storagePath, folderId: typeof folderId === 'string' && folderId.trim() ? folderId.trim().slice(0, 180) : null });
    await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'upload', resourceType: 'cloud', resourceId: ref.id, metadata: { size: file.size, mimeType: file.type || 'application/octet-stream' } });
    return NextResponse.json({ data: { id: ref.id, name: file.name, size: file.size, mimeType: file.type || 'application/octet-stream', storagePath } }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status = code === 'FILE_SIZE_NOT_ALLOWED' ? 413 : ['UNAUTHENTICATED', 'FORBIDDEN'].includes(code) ? 403 : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
