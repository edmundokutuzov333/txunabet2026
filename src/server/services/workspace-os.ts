import 'server-only';

import { requireIdentity } from '@/server/authorization';
import { getAdminDb } from '@/server/firebase/admin';

const MODULES = [
  ['Projects', 'projects'], ['Tasks', 'module_tasks'], ['Campaigns', 'module_campaigns'], ['Goals', 'goals'],
  ['Calendar', 'module_calendar_events'], ['Docs', 'documents'], ['Files', 'module_cloud_files'], ['Chat', 'conversations'],
  ['Meetings', 'module_meetings'], ['Forms', 'forms'], ['Workflows', 'module_workflows'], ['Dashboards', 'dashboards'],
  ['Knowledge', 'module_knowledge_articles'],
] as const;

async function countCollection(collection: string, companyId: string, workspaceId: string): Promise<number> {
  try {
    const snapshot = await getAdminDb().collection(collection).where('companyId', '==', companyId).where('workspaceId', '==', workspaceId).limit(500).get();
    return snapshot.size;
  } catch {
    return 0;
  }
}

export async function getWorkspaceOperationalMap() {
  const identity = await requireIdentity();
  const workspaceSnapshot = await getAdminDb().collection('module_workspaces').where('companyId', '==', identity.companyId).limit(100).get();
  return Promise.all(workspaceSnapshot.docs.map(async (doc) => {
    const workspaceId = doc.id;
    const modules = await Promise.all(MODULES.map(async ([label, collection]) => ({ label, collection, count: await countCollection(collection, identity.companyId, workspaceId) })));
    return { id: workspaceId, ...(doc.data() as Record<string, unknown>), modules };
  }));
}
