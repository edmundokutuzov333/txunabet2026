import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

let env: RulesTestEnvironment;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-oryon-storage',
    firestore: { rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(process.cwd(), 'storage.rules'), 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'companies/company-1/members/user-a'), { uid: 'user-a', status: 'active', role: 'member', permissions: ['files.write'], departmentIds: ['marketing'] });
    await setDoc(doc(db, 'companies/company-1/members/user-b'), { uid: 'user-b', status: 'active', role: 'member', permissions: [], departmentIds: ['marketing'] });
    await setDoc(doc(db, 'companies/company-1/members/user-c'), { uid: 'user-c', status: 'active', role: 'member', permissions: [], departmentIds: ['finance'] });
    await setDoc(doc(db, 'departments/marketing'), { companyId: 'company-1', name: 'Marketing' });
    await setDoc(doc(db, 'departments/marketing/members/user-a'), { status: 'active' });
    await setDoc(doc(db, 'departments/marketing/members/user-b'), { status: 'active' });
    await setDoc(doc(db, 'conversations/company_general_company-1'), { companyId: 'company-1', type: 'company_general', memberIds: ['user-a', 'user-b'] });
    await setDoc(doc(db, 'documents/doc-1'), { companyId: 'company-1', status: 'active', ownerId: 'user-a', editorIds: ['user-b'], viewerIds: [], sharedDepartmentIds: [], sharedCompany: false });
  });
});

after(async () => { await env.cleanup(); });

describe('Storage authorization', () => {
  test('conversation member can upload an attachment under own path', async () => {
    const storage = env.authenticatedContext('user-a').storage();
    await assertSucceeds(uploadBytes(ref(storage, 'companies/company-1/conversations/company_general_company-1/attachments/user-a/hello.txt'), new Uint8Array([1, 2, 3])));
  });

  test('conversation member cannot write another user attachment path', async () => {
    const storage = env.authenticatedContext('user-b').storage();
    await assertFails(uploadBytes(ref(storage, 'companies/company-1/conversations/company_general_company-1/attachments/user-a/hello.txt'), new Uint8Array([1])));
  });

  test('document editor can upload an image to the document asset path', async () => {
    const storage = env.authenticatedContext('user-b').storage();
    await assertSucceeds(uploadBytes(ref(storage, 'companies/company-1/documents/doc-1/image.png'), new Blob(['x'], { type: 'image/png' })));
  });

  test('user from another department cannot write document assets without access', async () => {
    const storage = env.authenticatedContext('user-c').storage();
    await assertFails(uploadBytes(ref(storage, 'companies/company-1/documents/doc-1/image.png'), new Blob(['x'], { type: 'image/png' })));
  });
});
