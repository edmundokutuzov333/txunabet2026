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
  if (current.exists && Number(current.data()?.version) >= 7) return;
  const ts = FieldValue.serverTimestamp();
  const common = { companyId: identity.companyId, createdBy: identity.uid, updatedBy: identity.uid, createdAt: ts, updatedAt: ts, status: 'active', version: 1 };

  for (const [collection, names] of Object.entries(catalog)) {
    await seed(db, collection, names.map((name, i) => {
      const row: Record<string, unknown> = { ...common, id: `demo-${collection}-${i + 1}`, description: `Registo operacional de ${name}.`, department: BET_DEPARTMENTS[i % BET_DEPARTMENTS.length][0] };
      if (collection === 'module_knowledge_articles') row.title = name; else row.name = name;
      if (collection === 'module_integrations') { row.connected = true; row.health = i === 2 ? 'degraded' : 'healthy'; }
      if (collection === 'module_automations') row.active = true;
      return row;
    }));
  }
  await seed(db, 'module_cloud_files', Array.from({ length: 20 }, (_, i) => ({ ...common, id: `demo-cloud-${i + 1}`, name: ['Trading shift files','Finance close pack','Compliance evidence','Marketing creative','VIP reports','Security evidence'][i % 6], type: 'folder', ownerId: identity.uid, sharedWith: [], storagePath: `demo/folders/${i + 1}`, mimeType: 'application/x-directory', size: 0 })));
  await seed(db, 'capacity_allocations', Array.from({ length: 36 }, (_, i) => ({ ...common, id: `demo-capacity-${i + 1}`, userId: identity.uid, projectId: `demo-project-${(i % 12) + 1}`, weekStart: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10), availableHours: 40, allocatedHours: 24 + (i % 14) })));
  await seed(db, 'time_entries', Array.from({ length: 36 }, (_, i) => ({ ...common, id: `demo-time-${i + 1}`, projectId: `demo-project-${(i % 12) + 1}`, taskId: `demo-task-${(i % 72) + 1}`, startedAt: new Date(Date.now() - 86400000 * (i % 8)).toISOString(), endedAt: new Date(Date.now() - 86400000 * (i % 8) + 3600000).toISOString(), minutes: 45 + (i % 4) * 15, note: 'Registo de trabalho operacional.' })));
  await seed(db, 'project_milestones', Array.from({ length: 18 }, (_, i) => ({ ...common, id: `demo-milestone-${i + 1}`, projectId: `demo-project-${(i % 12) + 1}`, title: ['Discovery complete','Trading rules approved','PSP UAT','Security sign-off','Go-live'][i % 5], varianceDays: (i % 7) - 2, dueDate: new Date(Date.now() + 86400000 * (i + 3)).toISOString() })));

  const extraProjects = BET_DEPARTMENTS.flatMap(([slug, name], i) => [
    { ...common, id: `dept-project-${slug}-1`, name: `${name} Performance Cycle`, description: `Iniciativa contínua de performance e controlo para ${name}.`, objective: `Melhorar os indicadores de ${name}.`, departmentId: `demo-dept-${slug}`, workspaceId: `demo-workspace-${(i % 6) + 1}`, ownerId: identity.uid, budget: 220000 + i * 7500, budgetSpent: 92000 + i * 3200, startDate: new Date(Date.now() - 86400000 * 100).toISOString(), dueDate: new Date(Date.now() + 86400000 * 45).toISOString(), health: i % 6 === 0 ? 'AT_RISK' : 'HEALTHY', healthScore: i % 6 === 0 ? 74 : 90 }),
    { ...common, id: `dept-project-${slug}-2`, name: `${name} Q4 Controls`, description: `Plano de melhoria operacional e governance de ${name}.`, objective: 'Reduzir risco e aumentar consistência operacional.', departmentId: `demo-dept-${slug}`, workspaceId: `demo-workspace-${((i + 1) % 6) + 1}`, ownerId: identity.uid, budget: 175000 + i * 6000, budgetSpent: 51000 + i * 2700, startDate: new Date(Date.now() - 86400000 * 60).toISOString(), dueDate: new Date(Date.now() + 86400000 * 70).toISOString(), health: 'HEALTHY', healthScore: 93 },
  ]);
  await seed(db, 'projects', extraProjects);
  await seed(db, 'projects', Array.from({ length: 12 }, (_, i) => ({ id: `demo-project-${i + 1}`, departmentId: `demo-dept-${BET_DEPARTMENTS[i % BET_DEPARTMENTS.length][0]}` })));
  await seed(db, 'module_tasks', Array.from({ length: 12 }, (_, i) => ({ id: `demo-task-${i + 1}`, assignedTo: [identity.uid], ownerId: identity.uid, dueDate: new Date(Date.now() + (i % 5 === 0 ? -86400000 : i * 3600000)).toISOString() })));
  await seed(db, 'documents', Array.from({ length: 20 }, (_, i) => ({ id: `demo-doc-${i + 1}`, content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Documento operacional Txuna Bet com procedimentos, métricas, ownership e histórico de alterações.' }] }] }, sharedDepartmentIds: [String(BET_DEPARTMENTS[i % BET_DEPARTMENTS.length][0])], textPreview: 'Documento operacional com procedimentos e métricas actualizadas.', ownerId: identity.uid, sharedCompany: true })));
  await seed(db, 'incidents', Array.from({ length: 14 }, (_, i) => ({ ...common, id: `demo-incident-${i + 1}`, title: ['PSP latency spike','Odds feed timeout','KYC provider degradation','Support queue breach','SOC suspicious login','Trading exposure alert','CRM sync delay'][i % 7], description: 'Incidente operacional acompanhado pela equipa responsável.', severity: ['low','medium','high','critical'][i % 4], status: i % 5 === 0 ? 'open' : i % 4 === 0 ? 'investigating' : 'resolved', ownerId: identity.uid, createdAt: new Date(Date.now() - i * 7200000) })));
  await seed(db, 'event_outbox', Array.from({ length: 20 }, (_, i) => ({ ...common, id: `demo-outbox-${i + 1}`, eventName: i % 9 === 0 ? 'workflow.failed' : 'task.updated', entityType: i % 4 === 0 ? 'workflow' : 'task', entityId: `demo-entity-${i + 1}`, status: i % 9 === 0 ? 'failed' : 'published', occurredAt: new Date(Date.now() - i * 3600000), payload: { title: i % 9 === 0 ? 'Workflow de reconciliação falhou' : 'Actualização de tarefa', message: 'Evento operacional gerado pelo sistema.' } })));
  await seed(db, 'security_events', Array.from({ length: 16 }, (_, i) => ({ ...common, id: `demo-security-event-${i + 1}`, userId: identity.uid, event: ['Sessão iniciada','MFA verificado','Password alterada','Login falhado','Token renovado','Sessão encerrada'][i % 6], status: i % 7 === 0 ? 'failed' : 'success', location: i % 5 === 0 ? 'Maputo, MZ' : 'Cloud region', device: ['Chrome Desktop','Safari iPhone','Firefox Desktop'][i % 3], createdAt: new Date(Date.now() - i * 3600000) })));
  await seed(db, 'security_sessions', Array.from({ length: 4 }, (_, i) => ({ ...common, id: `demo-session-${i + 1}`, userId: identity.uid, device: ['MacBook Pro','Windows Desktop','iPhone','Android'][i], browser: ['Chrome','Edge','Safari','Chrome'][i], location: 'Maputo, MZ', ip: `10.20.0.${10 + i}`, state: i === 3 ? 'idle' : 'active', lastActive: i === 0 ? 'Agora' : `${i + 1}h atrás` })));
  await marker.set({ version: 7, seededAt: ts, seededBy: identity.uid, note: 'complete departmental portfolio, documents, incidents and security telemetry' }, { merge: true });
}
