import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-oryon',
    firestore: { rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'companies/company-1/members/user-a'), { uid: 'user-a', status: 'active', role: 'member', permissions: ['chat.read', 'chat.write'], departmentIds: ['marketing'] });
    await setDoc(doc(db, 'companies/company-1/members/user-b'), { uid: 'user-b', status: 'active', role: 'member', permissions: ['chat.read'], departmentIds: ['marketing'] });
    await setDoc(doc(db, 'companies/company-1/members/user-c'), { uid: 'user-c', status: 'active', role: 'member', permissions: ['chat.read'], departmentIds: ['finance'] });
    await setDoc(doc(db, 'companies/company-2/members/user-x'), { uid: 'user-x', status: 'active', role: 'member', permissions: [], departmentIds: ['external'] });
    await setDoc(doc(db, 'departments/marketing'), { companyId: 'company-1', name: 'Marketing' });
    await setDoc(doc(db, 'departments/finance'), { companyId: 'company-1', name: 'Finance' });
    await setDoc(doc(db, 'departments/marketing/members/user-a'), { status: 'active' });
    await setDoc(doc(db, 'departments/marketing/members/user-b'), { status: 'active' });
    await setDoc(doc(db, 'departments/finance/members/user-c'), { status: 'active' });
    await setDoc(doc(db, 'conversations/company_general_company-1'), { companyId: 'company-1', type: 'company_general', memberIds: ['user-a'] });
    await setDoc(doc(db, 'conversations/department_marketing'), { companyId: 'company-1', type: 'department', departmentId: 'marketing', memberIds: ['user-a', 'user-b'] });
    await setDoc(doc(db, 'conversations/department_finance'), { companyId: 'company-1', type: 'department', departmentId: 'finance', memberIds: ['user-c'] });
    await setDoc(doc(db, 'conversations/direct_user-a_user-b'), { companyId: 'company-1', type: 'direct', memberIds: ['user-a', 'user-b'] });
    await setDoc(doc(db, 'conversations/direct_user-a_user-x'), { companyId: 'company-2', type: 'direct', memberIds: ['user-a', 'user-x'] });
    await setDoc(doc(db, 'documents/doc-1'), { companyId: 'company-1', status: 'active', ownerId: 'user-a', editorIds: ['user-b'], viewerIds: [], sharedDepartmentIds: ['marketing'], sharedCompany: false });
    await setDoc(doc(db, 'documents/doc-2'), { companyId: 'company-1', status: 'active', ownerId: 'user-c', editorIds: [], viewerIds: [], sharedDepartmentIds: ['finance'], sharedCompany: false });
    await setDoc(doc(db, 'notifications/user-a/items/n1'), { userId: 'user-a', companyId: 'company-1', read: false });
  });
});

after(async () => {
  await env.cleanup();
});

describe('Firestore authorization', () => {
  test('company member can read general chat', async () => {
    const db = env.authenticatedContext('user-b').firestore();
    await assertSucceeds(getDoc(doc(db, 'conversations/company_general_company-1')));
  });

  test('Marketing member can read Marketing but not Finance department chat', async () => {
    const db = env.authenticatedContext('user-b').firestore();
    await assertSucceeds(getDoc(doc(db, 'conversations/department_marketing')));
    await assertFails(getDoc(doc(db, 'conversations/department_finance')));
  });

  test('same-company direct chat is readable only by members', async () => {
    const db = env.authenticatedContext('user-b').firestore();
    await assertSucceeds(getDoc(doc(db, 'conversations/direct_user-a_user-b')));
    await assertFails(getDoc(doc(db, 'conversations/direct_user-a_user-x')));
  });

  test('document sharing grants access to an editor but not another department', async () => {
    const marketing = env.authenticatedContext('user-b').firestore();
    const finance = env.authenticatedContext('user-c').firestore();
    await assertSucceeds(getDoc(doc(marketing, 'documents/doc-1')));
    await assertFails(getDoc(doc(finance, 'documents/doc-1')));
    await assertSucceeds(getDoc(doc(finance, 'documents/doc-2')));
  });

  test('notifications are private to their recipient', async () => {
    const owner = env.authenticatedContext('user-a').firestore();
    const other = env.authenticatedContext('user-b').firestore();
    await assertSucceeds(getDoc(doc(owner, 'notifications/user-a/items/n1')));
    await assertFails(getDoc(doc(other, 'notifications/user-a/items/n1')));
  });
});
