import 'server-only';

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getAdminDb } from '@/server/firebase/admin';
import type { AuthenticatedIdentity } from '@/server/authorization';
import { BET_DEPARTMENTS } from './demo-seed';

const catalog = {
  module_campaigns: ['Winback Weekend','Premier League Boost','VIP Reload','Bet Builder Acquisition','Mobile First','Referral Drive','Retention Sprint','Market Awareness','Responsible Gaming Education','Autumn CRM Wave'],
  module_reports: ['Daily Operations Pack','Trading P&L','PSP Reconciliation','KYC SLA Report','AML Monitoring Summary','Customer Support SLA','VIP Revenue Review','Affiliate Commission Statement','Marketing CAC Report','Security Incident Digest','Responsible Gaming Watchlist','Executive Flash'],
  module_knowledge_articles: ['Sportsbook Trading Manual','AML Escalation Guide','KYC Exceptions','PSP Reconciliation SOP','VIP Service Playbook','Chargeback Handling','Incident Response','Responsible Gaming Intervention','Affiliate Compliance','Campaign Approval Policy','Odds Change Protocol','Live Betting Checklist','Customer Complaint SOP','Access Control Standard'],
  module_workflows: ['Withdrawal Review','KYC Escalation','Chargeback Escalation','High Risk Player Review','Campaign Approval','Provider Incident','New Affiliate Approval','Daily Reconciliation','Critical Alert Routing','Employee Joiner'],
  module_automations: ['Daily NGR digest','Late withdrawal alert','KYC backlog alert','High exposure alert','PSP failure alert','VIP churn signal','AML queue summary','SOC critical event','Campaign threshold alert','Affiliate commission check','Responsible gaming queue','Weekly executive pack'],
  module_integrations: ['Odds Feed Primary','Odds Feed Backup','PSP M-Pesa','PSP e-Mola','PSP Visa/Mastercard','KYC Provider','Fraud Engine','CRM','Email Delivery','SMS Gateway','Data Warehouse','Alerting'],
  module_pulse_items: ['Handle acima da média','PSP approval rate recuperou','KYC backlog dentro do SLA','Novo risco de chargeback','VIP churn signal','Trading exposure elevada','SOC signal resolved','Daily close completed','Campaign CAC improved','Responsible gaming queue reviewed'],
} as const;

async function seed(db: Firestore, collection: string, rows: Record<string, unknown>[]) {
  const batch = db.batch();
  rows.forEach((row) => batch.set(db.collection(collection).doc(String(row.id)), row, { merge: true }));
  await batch.commit();
}

export async function ensureDemoDataExtra(identity: AuthenticatedIdentity) {
  const db = getAdminDb();
  const marker = db.collection('companies').doc(identity.companyId).collection('system').doc('demo-extra-seed');
  const current = await marker.get();
  if (current.exists && Number(current.data()?.version) >= 2) return;
  const ts = FieldValue.serverTimestamp();
  const common = { companyId: identity.companyId, createdBy: identity.uid, updatedBy: identity.uid, createdAt: ts, updatedAt: ts, status: 'active', version: 1 };

  for (const [collection, names] of Object.entries(catalog)) {
    await seed(db, collection, names.map((name, i) => ({ ...common, id: `demo-${collection}-${i + 1}`, name: collection.includes('knowledge') ? undefined : name, title: collection.includes('knowledge') ? name : undefined, department: BET_DEPARTMENTS[i % BET_DEPARTMENTS.length][0], description: `Registo operacional de ${name}.`, connected: collection === 'module_integrations' ? true : undefined, health: collection === 'module_integrations' ? (i === 2 ? 'degraded' : 'healthy') : undefined, active: ['module_automations','module_integrations'].includes(collection) })));
  }

  await seed(db, 'module_cloud_files', Array.from({ length: 20 }, (_, i) => ({ ...common, id: `demo-cloud-${i + 1}`, name: ['Trading shift files','Finance close pack','Compliance evidence','Marketing creative','VIP reports','Security evidence'][i % 6], type: 'folder', ownerId: identity.uid, sharedWith: [], storagePath: '', mimeType: 'application/x-directory', size: 0 })));
  await seed(db, 'capacity_allocations', Array.from({ length: 36 }, (_, i) => ({ ...common, id: `demo-capacity-${i + 1}`, userId: identity.uid, projectId: `demo-project-${(i % 12) + 1}`, weekStart: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10), availableHours: 40, allocatedHours: 24 + (i % 14) })));
  await seed(db, 'time_entries', Array.from({ length: 36 }, (_, i) => ({ ...common, id: `demo-time-${i + 1}`, projectId: `demo-project-${(i % 12) + 1}`, taskId: `demo-task-${(i % 72) + 1}`, startedAt: new Date(Date.now() - 86400000 * (i % 8)).toISOString(), endedAt: new Date(Date.now() - 86400000 * (i % 8) + 3600000).toISOString(), minutes: 45 + (i % 4) * 15, note: 'Registo de trabalho operacional.' })));
  await seed(db, 'project_milestones', Array.from({ length: 18 }, (_, i) => ({ ...common, id: `demo-milestone-${i + 1}`, projectId: `demo-project-${(i % 12) + 1}`, title: ['Discovery complete','Trading rules approved','PSP UAT','Security sign-off','Go-live'][i % 5], varianceDays: (i % 7) - 2, dueDate: new Date(Date.now() + 86400000 * (i + 3)).toISOString() })));

  await marker.set({ version: 2, seededAt: ts, seededBy: identity.uid });
}
