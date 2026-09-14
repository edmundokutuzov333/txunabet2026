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
  for (let i = 0; i < rows.length; i += 450) {
    const batch = db.batch();
    rows.slice(i, i + 450).forEach((row) => batch.set(db.collection(collection).doc(String(row.id)), row, { merge: true }));
    await batch.commit();
  }
}

export async function ensureDemoDataExtra(identity: AuthenticatedIdentity) {
  const db = getAdminDb();
  const marker = db.collection('companies').doc(identity.companyId).collection('system').doc('demo-extra-seed');
  const current = await marker.get();
  if (current.exists && Number(current.data()?.version) >= 4) return;
  const ts = FieldValue.serverTimestamp();
  const common = { companyId: identity.companyId, createdBy: identity.uid, updatedBy: identity.uid, createdAt: ts, updatedAt: ts, status: 'active', version: 1 };

  for (const [collection, names] of Object.entries(catalog)) {
    await seed(db, collection, names.map((name, i) => {
      const row: Record<string, unknown> = { ...common, id: `demo-${collection}-${i + 1}`, description: `Registo operacional de ${name}.`, department: BET_DEPARTMENTS[i % BET_DEPARTMENTS.length][0] };
      if (collection === 'module_knowledge_articles') row.title = name;
      else row.name = name;
      if (collection === 'module_integrations') { row.connected = true; row.health = i === 2 ? 'degraded' : 'healthy'; }
      if (collection === 'module_automations') row.active = true;
      return row;
    }));
  }

  await seed(db, 'module_cloud_files', Array.from({ length: 20 }, (_, i) => ({ ...common, id: `demo-cloud-${i + 1}`, name: ['Trading shift files','Finance close pack','Compliance evidence','Marketing creative','VIP reports','Security evidence'][i % 6], type: 'folder', ownerId: identity.uid, sharedWith: [], storagePath: `demo/folders/${i + 1}`, mimeType: 'application/x-directory', size: 0 })));
  await seed(db, 'capacity_allocations', Array.from({ length: 36 }, (_, i) => ({ ...common, id: `demo-capacity-${i + 1}`, userId: identity.uid, projectId: `demo-project-${(i % 12) + 1}`, weekStart: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10), availableHours: 40, allocatedHours: 24 + (i % 14) })));
  await seed(db, 'time_entries', Array.from({ length: 36 }, (_, i) => ({ ...common, id: `demo-time-${i + 1}`, projectId: `demo-project-${(i % 12) + 1}`, taskId: `demo-task-${(i % 72) + 1}`, startedAt: new Date(Date.now() - 86400000 * (i % 8)).toISOString(), endedAt: new Date(Date.now() - 86400000 * (i % 8) + 3600000).toISOString(), minutes: 45 + (i % 4) * 15, note: 'Registo de trabalho operacional.' })));
  await seed(db, 'project_milestones', Array.from({ length: 18 }, (_, i) => ({ ...common, id: `demo-milestone-${i + 1}`, projectId: `demo-project-${(i % 12) + 1}`, title: ['Discovery complete','Trading rules approved','PSP UAT','Security sign-off','Go-live'][i % 5], varianceDays: (i % 7) - 2, dueDate: new Date(Date.now() + 86400000 * (i + 3)).toISOString() })));
  await seed(db, 'projects', Array.from({ length: 12 }, (_, i) => ({ id: `demo-project-${i + 1}`, departmentId: `demo-dept-${BET_DEPARTMENTS[i % BET_DEPARTMENTS.length][0]}` })));

  await seed(db, 'module_tasks', Array.from({ length: 12 }, (_, i) => ({ id: `demo-task-${i + 1}`, assignedTo: [identity.uid], ownerId: identity.uid, dueDate: new Date(Date.now() + (i % 5 === 0 ? -86400000 : i * 3600000)).toISOString() })));

  await seed(db, 'approvals', Array.from({ length: 14 }, (_, i) => ({ ...common, id: `demo-approval-${i + 1}`, title: ['Payout excepcional','Mudança de odds','Nova campanha','Fornecedor PSP','Regra AML','Acesso privilegiado','Comissão affiliate','Alteração de limite','Release produção','KYC exception','Refund de alto valor','Nova automação','Contrato comercial','Risk override'][i], description: 'Pedido submetido para revisão interna e auditoria.', state: i % 5 === 0 ? 'APPROVED' : i % 4 === 0 ? 'CHANGES_REQUESTED' : 'PENDING', status: i % 5 === 0 ? 'approved' : i % 4 === 0 ? 'changes_requested' : 'pending', mode: i % 3 === 0 ? 'sequential' : 'single', approverId: identity.uid, requesterId: identity.uid, entityType: ['payment','trading','campaign','compliance','security'][i % 5], entityId: `demo-entity-${i + 1}`, dueDate: new Date(Date.now() + 86400000 * ((i % 5) + 1)).toISOString(), steps: [{ id: `step-${i + 1}`, approverId: identity.uid, status: i % 5 === 0 ? 'APPROVED' : 'PENDING' }] })));

  const notifications = db.collection('notifications').doc(identity.uid).collection('items');
  const batch = db.batch();
  for (let i = 0; i < 20; i += 1) {
    batch.set(notifications.doc(`demo-inbox-${i + 1}`), { id: `demo-inbox-${i + 1}`, companyId: identity.companyId, userId: identity.uid, category: ['task','approval','alert','mention','request'][i % 5], severity: ['info','medium','high','critical'][i % 4], title: ['Nova tarefa crítica','Aprovação pendente','Alerta operacional','Nova menção no Trading','Solicitação de Finance'][i % 5], body: ['Rever exposição pré-live','Payout aguarda decisão','PSP apresenta degradação de 2 minutos','Foste mencionado na revisão de trading','Reconciliação aguarda confirmação'][i % 5], entityType: ['task','approval','incident','trading','payment'][i % 5], entityId: `demo-entity-${i + 1}`, actionUrl: '/dashboard/inbox', read: i > 8, channels: ['in-app'], createdAt: new Date(Date.now() - i * 3600000) }, { merge: true });
  }
  await batch.commit();

  await marker.set({ version: 4, seededAt: ts, seededBy: identity.uid, note: 'enriched command center and approval queue' }, { merge: true });
}
