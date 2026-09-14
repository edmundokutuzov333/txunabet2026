import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/server/firebase/admin';
import type { AuthenticatedIdentity } from '@/server/authorization';

const SEED_VERSION = 3;
const now = () => new Date();
const iso = (daysAgo: number, hour: number) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(hour, 0, 0, 0); return d.toISOString(); };

export const BET_DEPARTMENTS = [
  ['marketing', 'Marketing', 'Aquisição, marca, campanhas, CRM e retenção.', 950000],
  ['finance', 'Finance', 'Contabilidade, tesouraria, pagamentos e reconciliação.', 1250000],
  ['hr', 'HR', 'Pessoas, recrutamento, formação e cultura.', 680000],
  ['it', 'IT', 'Infraestrutura, suporte, sistemas e produtividade.', 880000],
  ['operations', 'Operations', 'Operação diária, suporte ao sportsbook e incidentes.', 1100000],
  ['compliance', 'Compliance', 'Licenciamento, AML, KYC, políticas e reporting regulatório.', 820000],
  ['security', 'Security', 'SOC, fraude, IAM, segurança applicacional e resposta.', 920000],
  ['trading', 'Trading & Sportsbook', 'Pricing, odds, liability, trading pré-jogo e live.', 1450000],
  ['payments', 'Payments & Treasury', 'PSPs, depósitos, levantamentos, chargebacks e liquidez.', 1320000],
  ['risk', 'Risk & Fraud', 'Risco de jogador, fraude, abuso de bónus e integridade.', 980000],
  ['responsible-gaming', 'Responsible Gaming', 'Protecção do jogador, limites, auto-exclusão e intervenção.', 620000],
  ['crm-vip', 'CRM & VIP', 'Segmentação, lifecycle, VIP, loyalty e retenção.', 760000],
  ['customer-support', 'Customer Support', 'Atendimento omnicanal, reclamações e SLA.', 710000],
  ['product', 'Product', 'Roadmap, experiência de jogador, backoffice e produto.', 1180000],
  ['data-bi', 'Data & BI', 'Data warehouse, reporting, modelos e inteligência operacional.', 930000],
  ['legal', 'Legal', 'Contratos, pareceres, regulatory affairs e contencioso.', 540000],
  ['affiliate', 'Affiliates & Partnerships', 'Afiliados, parceiros, CPA, RevShare e pagamentos de comissão.', 590000],
  ['procurement', 'Procurement', 'Fornecedores, compras, contratos e gestão de inventário.', 470000],
  ['strategy', 'Strategy & Executive', 'Planeamento, performance, expansão e comité executivo.', 830000],
] as const;

const people = [
  'Ana Mucavel','Carlos Matola','Marta Chissano','João Tembe','Elisa Nhantumbo','Ricardo Sitoe','Paulo Macamo','Sara Bila','Daniel Mussa','Lídia Cossa',
  'Nelson Muianga','Teresa Zandamela','Filipe Manjate','Rita Massango','Edson Chivambo','Cláudia Nhamatanda','Bruno Langa','Mónica Matusse','Tomás Balói','Inês Mabote',
  'Arlindo Mabunda','Carla Uamusse','Dário Cossa','Helena Massingue','Jorge Mahumane','Sílvia Nhalungo','Abel Macuácua','Nádia Nhaca','Vasco Mavume','Célia Mucavele',
  'Henrique Sitoe','Joana Matola','Miguel Chongo','Natércia Cuambe','Armando Bambo','Ema Matusse','Gerson Vilanculos','Laura Bila','Mário Mandlate','Yara Salimo',
];

const roles = ['Head of Department','Senior Manager','Manager','Senior Analyst','Analyst','Specialist'];
const projectNames = [
  'Sportsbook Q4 Trading Optimisation','Payment Success Recovery','KYC Automation v2','VIP Retention Wave 3','Affiliate Growth 2026','Responsible Gaming Controls','Mobile App Release 4.8','CRM Personalisation Engine','Live Betting Reliability','Finance Reconciliation Automation','SOC Detection Upgrade','Data Mart Executive KPIs',
];

async function seedBatch(companyId: string, path: (string | number)[], data: Record<string, unknown>[]) {
  const db = getAdminDb(); const batch = db.batch();
  data.forEach((row, index) => { const segments = [...path]; segments[segments.length - 1] = `${segments[segments.length - 1]}-${String(index + 1).padStart(3, '0')}`; const ref = segments.reduce((acc, segment) => acc.collection(String(segment)), db as any).doc(); batch.set(ref, row, { merge: true }); });
  if (data.length) await batch.commit();
}

export async function ensureDemoData(identity: AuthenticatedIdentity): Promise<void> {
  const db = getAdminDb();
  const marker = db.collection('companies').doc(identity.companyId).collection('system').doc('demo-seed');
  const existing = await marker.get();
  if (existing.exists && Number(existing.data()?.version) >= SEED_VERSION) return;

  const timestamp = FieldValue.serverTimestamp();
  const departments = BET_DEPARTMENTS.map(([slug, name, description, budget], index) => ({ id: `demo-dept-${slug}`, companyId: identity.companyId, name, slug, description, budget, status: 'active', memberCount: 0, projects: 0, goals: [`Melhorar eficiência de ${name.toLowerCase()}`, `Reduzir incidentes e tempos de resposta`, `Atingir SLA trimestral definido pelo comité`], createdAt: timestamp, updatedAt: timestamp, sortOrder: index }));
  await seedBatch(identity.companyId, ['departments', 'placeholder'], departments);

  const departmentIds = BET_DEPARTMENTS.map(([slug]) => `demo-dept-${slug}`);
  const userRows = people.map((name, index) => {
    const deptIndex = index % departmentIds.length;
    const slug = BET_DEPARTMENTS[deptIndex][0];
    const uid = `demo-user-${String(index + 1).padStart(3, '0')}`;
    return { uid, companyId: identity.companyId, email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')}@txunabet.com`, displayName: name, phone: `+258 84 ${String(2000000 + index * 137).slice(-7)}`, role: roles[index % roles.length], departmentId: `demo-dept-${slug}`, departmentIds: [slug], status: 'active', mfaRequired: true, photoURL: null, createdAt: timestamp, updatedAt: timestamp };
  });
  const currentProfile = { uid: identity.uid, companyId: identity.companyId, email: identity.email ?? 'admin@txunabet.com', displayName: 'Administrador Txuna Bet', role: identity.role, status: 'active', mfaRequired: true, createdAt: timestamp, updatedAt: timestamp };
  const profileBatch = db.batch();
  profileBatch.set(db.collection('users').doc(identity.uid), currentProfile, { merge: true });
  userRows.forEach((u) => profileBatch.set(db.collection('users').doc(String(u.uid)), u, { merge: true }));
  await profileBatch.commit();

  const memberBatch = db.batch();
  memberBatch.set(db.collection('companies').doc(identity.companyId).collection('members').doc(identity.uid), { userId: identity.uid, companyId: identity.companyId, role: identity.role, permissions: [], departmentIds: departmentIds.slice(0, 6), status: 'active', createdAt: timestamp, updatedAt: timestamp }, { merge: true });
  userRows.forEach((u, index) => memberBatch.set(db.collection('companies').doc(identity.companyId).collection('members').doc(String(u.uid)), { userId: u.uid, companyId: identity.companyId, role: index < 8 ? 'manager' : index % 9 === 0 ? 'viewer' : 'member', permissions: [], departmentIds: [String(u.departmentId).replace('demo-dept-', '')], status: 'active', createdAt: timestamp, updatedAt: timestamp }, { merge: true }));
  await memberBatch.commit();

  const common = { companyId: identity.companyId, createdBy: identity.uid, updatedBy: identity.uid, createdAt: timestamp, updatedAt: timestamp, status: 'active', version: 1 };
  const workspaceRows = ['Sportsbook Operations','Commercial Growth','Finance Control Room','Compliance Command','Technology Delivery','Executive Office'].map((name, i) => ({ ...common, id: `demo-workspace-${i + 1}`, name, description: `Workspace operacional de ${name.toLowerCase()}.`, ownerId: identity.uid }));
  await seedCollection(db, 'module_workspaces', workspaceRows);

  const projects = projectNames.map((name, i) => ({ ...common, id: `demo-project-${i + 1}`, name, description: `Iniciativa activa para suportar a operação Txuna Bet em ${2026}.`, objective: `Entregar impacto mensurável em ${['margem','conversão','reconciliação','retenção','compliance','resiliência'][i % 6]}.`, workspaceId: `demo-workspace-${(i % 6) + 1}`, ownerId: userRows[i % userRows.length].uid, budget: 150000 + i * 27500, budgetSpent: 52000 + i * 8300, startDate: iso(120 - i, 9), dueDate: iso(-(15 + i), 18), health: i % 7 === 0 ? 'AT_RISK' : 'HEALTHY', healthScore: i % 7 === 0 ? 73 : 92 - (i % 8) }));
  await seedCollection(db, 'projects', projects);

  const tasks = Array.from({ length: 64 }, (_, i) => ({ ...common, id: `demo-task-${i + 1}`, title: [`Rever exposição do jogo Real Madrid x Barcelona`,`Validar payout excepcional do jogador #P${10420+i}`,`Aprovar reconciliação PSP do dia`,`Investigar aumento de chargebacks`,`Actualizar matriz de risco AML`,`Preparar relatório de trading live`,`Rever campanha de retenção VIP`,`Validar alteração de odds`,`Fechar incidente SOC`,`Publicar relatório diário de operação`][i % 10], description: 'Item operacional gerado a partir do contexto diário da bet.', status: ['todo','in-progress','done','blocked','waiting'][i % 5], priority: ['low','medium','high','critical'][i % 4], dueDate: iso(i % 9 === 0 ? -1 : -(i % 8), 17), assignedTo: [userRows[i % userRows.length].uid], departmentId: `demo-dept-${BET_DEPARTMENTS[i % BET_DEPARTMENTS.length][0]}`, projectId: `demo-project-${(i % projects.length) + 1}` }));
  await seedCollection(db, 'module_tasks', tasks);

  const meetings = Array.from({ length: 18 }, (_, i) => ({ ...common, id: `demo-meeting-${i + 1}`, title: ['Daily Trading Stand-up','Finance Reconciliation Review','Risk Committee','CRM Performance Review','KYC Operations Review','SOC Threat Briefing','Executive Weekly','Product Discovery','Payments Incident Review'][i % 9], description: 'Reunião interna com agenda operacional e decisões pendentes.', date: iso(i % 7, 9 + (i % 5)), time: `${String(9 + (i % 6)).padStart(2,'0')}:00`, duration: 30 + (i % 3) * 30, status: i % 6 === 0 ? 'active' : 'scheduled', participants: userRows.slice(i % 5, (i % 5) + 5).map((u) => String(u.uid)), departmentId: `demo-dept-${BET_DEPARTMENTS[i % BET_DEPARTMENTS.length][0]}` }));
  await seedCollection(db, 'module_meetings', meetings);

  const events = Array.from({ length: 28 }, (_, i) => ({ ...common, id: `demo-calendar-${i + 1}`, title: ['Kickoff','Deadline','Compliance filing','Campaign launch','Trading review','Payroll','Provider call','PSP settlement'][i % 8], description: 'Evento de calendário operacional.', start: iso(i % 14, 8 + (i % 9)), end: iso(i % 14, 9 + (i % 9)), type: i % 4 === 0 ? 'compliance' : 'operations', participants: [identity.uid], createdBy: identity.uid }));
  await seedCollection(db, 'module_calendar_events', events);

  const modules: Record<string, { title?: string; name?: string; department?: string }[]> = {
    module_campaigns: Array.from({ length: 10 }, (_, i) => ({ name: ['Winback Weekend','Premier League Boost','VIP Reload','Bet Builder Acquisition','Mobile First','Casino Cross-sell','Referral Drive','Retention Sprint','New Market Awareness','Responsible Gaming Education'][i], department: BET_DEPARTMENTS[i % 5][0] })),
    module_reports: Array.from({ length: 14 }, (_, i) => ({ name: ['Daily Operations Pack','Trading P&L','PSP Reconciliation','KYC SLA Report','AML Monitoring Summary','Customer Support SLA','VIP Revenue Review','Affiliate Commission Statement','Marketing CAC Report','Security Incident Digest','Responsible Gaming Watchlist','Executive Flash','Liquidity Position','Data Quality Monitor'][i] })),
    module_knowledge_articles: Array.from({ length: 16 }, (_, i) => ({ title: ['Sportsbook Trading Manual','AML Escalation Guide','KYC Exceptions','PSP Reconciliation SOP','VIP Service Playbook','Chargeback Handling','Incident Response','Responsible Gaming Intervention','Affiliate Compliance','Campaign Approval Policy','Odds Change Protocol','Live Betting Checklist','Customer Complaint SOP','Access Control Standard','Executive Reporting Definitions','Data Dictionary'][i] })),
    module_workflows: Array.from({ length: 10 }, (_, i) => ({ name: ['Withdrawal Review','KYC Escalation','Chargeback Escalation','High Risk Player Review','Campaign Approval','Provider Incident','New Affiliate Approval','Daily Reconciliation','Critical Alert Routing','Employee Joiner'][i] })),
    module_automations: Array.from({ length: 12 }, (_, i) => ({ name: ['Daily NGR digest','Late withdrawal alert','KYC backlog alert','High exposure alert','PSP failure alert','VIP churn signal','AML queue summary','SOC critical event','Campaign budget threshold','Affiliate commission check','Responsible gaming queue','Weekly executive pack'][i] })),
    module_integrations: ['Odds Feed Primary','Odds Feed Backup','PSP M-Pesa','PSP E-Mola','PSP Visa/Mastercard','KYC Provider','Fraud Engine','CRM','Email Delivery','SMS Gateway','Data Warehouse','Alerting'].map((name) => ({ name })),
  };
  for (const [collection, rows] of Object.entries(modules)) await seedCollection(db, collection, rows.map((row, i) => ({ ...common, ...row, id: `demo-${collection}-${i + 1}`, connected: true, health: i % 9 === 0 ? 'degraded' : 'healthy' })));

  const docs = Array.from({ length: 16 }, (_, i) => ({ ...common, id: `demo-doc-${i + 1}`, title: ['Trading Shift Handover','Monthly Finance Close','AML Risk Assessment','KYC Operations Handbook','Campaign Brief Q4','VIP Tier Policy','Payments Reconciliation SOP','Incident Management Handbook','Responsible Gaming Policy','Affiliate Commercial Terms','IT Disaster Recovery Plan','Executive KPI Definitions','Customer Support Playbook','Data Governance Standard','Security Access Matrix','Sportsbook Limits Matrix'][i], ownerId: userRows[i % userRows.length].uid, contentVersion: 3 + (i % 4), currentVersion: 3 + (i % 4), sharedCompany: true, editorIds: [identity.uid], viewerIds: userRows.slice(i % 4, i % 4 + 4).map((u) => String(u.uid)), textPreview: 'Documento operacional com políticas, métricas e procedimentos actualizados.' }));
  await seedCollection(db, 'documents', docs);

  const goals = Array.from({ length: 20 }, (_, i) => ({ ...common, id: `demo-goal-${i + 1}`, title: ['Aumentar depósito aprovado','Reduzir tempo de KYC','Reduzir chargeback rate','Aumentar retenção D30','Melhorar hold sportsbook','Reduzir backlog de suporte','Zero incidentes críticos','Atingir reconciliação diária','Reduzir falsos positivos AML','Aumentar NGR por active'][i % 10], description: 'Objectivo operacional com ownership e progresso mensurável.', current: 42 + i * 3, target: 100, progress: Math.min(96, 42 + i * 3), status: i % 8 === 0 ? 'at-risk' : i % 6 === 0 ? 'completed' : 'in-progress', dueDate: iso(-(20 + i), 18), ownerId: userRows[i % userRows.length].uid }));
  await seedCollection(db, 'goals', goals);

  const riskRows = Array.from({ length: 18 }, (_, i) => ({ ...common, id: `demo-risk-${i + 1}`, title: ['Multi-accounting cluster','Chargeback spike','Odds feed divergence','Unusual withdrawal velocity','VPN/geolocation anomaly','Bonus abuse pattern','Provider latency','KYC document mismatch','Account takeover signal'][i % 9], description: 'Caso de risco acompanhado pela equipa operacional.', severity: ['low','medium','high','critical'][i % 4], status: i % 7 === 0 ? 'open' : 'investigating', playerId: `P${10500 + i}`, projectId: `demo-project-${(i % 12) + 1}` }));
  await seedCollection(db, 'risks', riskRows);

  const decisions = Array.from({ length: 15 }, (_, i) => ({ ...common, id: `demo-decision-${i + 1}`, title: ['Ajustar limite pré-live','Migrar PSP de fallback','Aprovar nova regra AML','Rever tier VIP','Congelar campanha','Activar odds provider B','Alterar SLA de suporte','Adoptar MFA obrigatório','Escalar incidente KYC','Revisar affiliate CPA'][i % 10], decision: 'Aprovado pelo responsável do domínio.', ownerId: userRows[i % userRows.length].uid }));
  await seedCollection(db, 'decisions', decisions);

  const activities = Array.from({ length: 60 }, (_, i) => ({ ...common, id: `demo-activity-${i + 1}`, actorId: userRows[i % userRows.length].uid, actorName: people[i % people.length], action: ['approved','updated','created','escalated','resolved','commented'][i % 6], description: ['Aprovou payout','Actualizou exposição','Criou tarefa','Escalou para Compliance','Resolveu alerta','Comentou o relatório'][i % 6], entityType: ['task','project','player','payment','risk','campaign'][i % 6], entityId: `demo-entity-${i + 1}`, createdAt: iso(i % 20, 7 + (i % 11)) }));
  await seedCollection(db, 'activities', activities);

  const payments = Array.from({ length: 40 }, (_, i) => ({ ...common, id: `demo-payment-${i + 1}`, playerId: `P${10400 + i}`, method: ['M-Pesa','e-Mola','Visa','Mastercard','Bank Transfer'][i % 5], type: i % 2 ? 'deposit' : 'withdrawal', amount: 350 + i * 125, currency: 'MZN', status: i % 11 === 0 ? 'review' : i % 9 === 0 ? 'failed' : 'completed', fee: 7 + (i % 4), createdAt: iso(i % 15, 8 + (i % 10)) }));
  await seedCollection(db, 'payments', payments);

  const players = Array.from({ length: 48 }, (_, i) => ({ ...common, id: `P${10400 + i}`, playerId: `P${10400 + i}`, name: `Cliente ${String.fromCharCode(65 + (i % 26))}${i + 10}`, country: 'MZ', segment: ['standard','active','high-value','VIP','at-risk'][i % 5], kycStatus: i % 13 === 0 ? 'review' : 'verified', balance: 250 + i * 415, lifetimeValue: 3400 + i * 920, lastBetAt: iso(i % 6, 22), riskScore: 18 + (i * 7) % 78, status: i % 17 === 0 ? 'suspended' : 'active' }));
  await seedCollection(db, 'players', players);

  const bets = Array.from({ length: 80 }, (_, i) => ({ ...common, id: `demo-bet-${i + 1}`, betId: `B${55000 + i}`, playerId: `P${10400 + (i % 48)}`, event: ['Real Madrid v Barcelona','Man City v Arsenal','Liverpool v Chelsea','PSG v Marseille','Inter v Milan','Benfica v Porto','Al Ahly v Mamelodi Sundowns'][i % 7], market: ['1X2','Over/Under 2.5','Both Teams To Score','Asian Handicap'][i % 4], stake: 120 + (i % 9) * 180, odds: Number((1.35 + (i % 11) * 0.21).toFixed(2)), status: ['won','lost','settled','cashout'][i % 4], live: i % 3 === 0, createdAt: iso(i % 12, 12 + (i % 12)) }));
  await seedCollection(db, 'bet_ledger', bets);

  const trading = Array.from({ length: 24 }, (_, i) => ({ ...common, id: `demo-trading-${i + 1}`, event: ['Real Madrid v Barcelona','Man City v Arsenal','Liverpool v Chelsea','Inter v Milan'][i % 4], market: ['1X2','O/U 2.5','BTTS'][i % 3], handle: 185000 + i * 13750, liability: 42000 + i * 3100, hold: Number((6.1 + (i % 9) * 0.42).toFixed(2)), status: i % 8 === 0 ? 'suspended' : 'open', trader: people[5 + (i % 12)] }));
  await seedCollection(db, 'trading_events', trading);

  const rg = Array.from({ length: 14 }, (_, i) => ({ ...common, id: `demo-rg-${i + 1}`, playerId: `P${10400 + i}`, trigger: ['deposit velocity','loss threshold','session duration','self-exclusion request','multiple affordability signals'][i % 5], severity: ['low','medium','high'][i % 3], status: i % 5 === 0 ? 'escalated' : 'open', lastReviewedAt: iso(i % 8, 15) }));
  await seedCollection(db, 'responsible_gaming_cases', rg);

  const vip = Array.from({ length: 16 }, (_, i) => ({ ...common, id: `demo-vip-${i + 1}`, playerId: `P${10420 + i}`, tier: ['Silver','Gold','Platinum','Diamond'][i % 4], monthlyHandle: 85000 + i * 11200, monthlyNgr: 6400 + i * 870, assignedManager: people[20 + (i % 8)], health: ['healthy','watch','churn-risk'][i % 3] }));
  await seedCollection(db, 'vip_accounts', vip);

  const affiliates = Array.from({ length: 12 }, (_, i) => ({ ...common, id: `demo-affiliate-${i + 1}`, name: ['BetRadar Africa','Moz Sports Network','Football MZ','Maputo Tips','Premium Odds Hub','Soccer Central','PlayMZ','Bet Creators'][i % 8], model: i % 2 ? 'RevShare' : 'CPA', commissionRate: i % 2 ? 0.28 + (i % 4) * 0.02 : 35 + i * 5, ftd: 110 + i * 17, active: true, complianceStatus: i % 7 === 0 ? 'review' : 'approved' }));
  await seedCollection(db, 'affiliates', affiliates);

  const support = Array.from({ length: 30 }, (_, i) => ({ ...common, id: `demo-ticket-${i + 1}`, ticket: `CS-${82000 + i}`, category: ['payment','kyc','settlement','bonus','technical','account'][i % 6], priority: ['low','medium','high','urgent'][i % 4], status: ['open','pending','waiting','resolved'][i % 4], playerId: `P${10400 + (i % 48)}`, assignee: people[12 + (i % 16)], slaMinutes: 30 + (i % 6) * 30, openedAt: iso(i % 7, 8 + (i % 11)) }));
  await seedCollection(db, 'support_tickets', support);

  const notifications = db.collection('notifications').doc(identity.uid).collection('items');
  const notificationBatch = db.batch();
  for (let i = 0; i < 18; i += 1) {
    notificationBatch.set(notifications.doc(`demo-${SEED_VERSION}-${i + 1}`), { id: `demo-notification-${i + 1}`, type: ['due','mention','request','created','file'][i % 5], title: ['Nova tarefa crítica','Mencionado no Risk Committee','Solicitação de pagamento','Relatório diário disponível','Ficheiro partilhado'][i % 5], message: ['Rever exposição antes do kickoff','referiu-te numa decisão de trading','aguarda aprovação','o pack executivo foi actualizado','foi adicionado ao workspace'][i % 5], actorName: people[i % people.length], entity: ['Sportsbook Q4 Trading Optimisation','Risk Committee','Withdrawal Review','Daily Operations Pack','Trading Shift Handover'][i % 5], read: i > 5, archived: false, createdAt: iso(i % 4, 8 + i % 10) }, { merge: true });
  }
  await notificationBatch.commit();

  for (let i = 0; i < 30; i += 1) await seedCollection(db, 'capacity_allocations', [{ ...common, id: `demo-capacity-${i + 1}`, userId: userRows[i % userRows.length].uid, projectId: `demo-project-${(i % 12) + 1}`, weekStart: new Date(Date.now() - 86400000 * 2).toISOString().slice(0,10), availableHours: 40, allocatedHours: 28 + (i % 13) }]);
  await seedCollection(db, 'time_entries', Array.from({ length: 36 }, (_, i) => ({ ...common, id: `demo-time-${i + 1}`, projectId: `demo-project-${(i % 12) + 1}`, taskId: `demo-task-${(i % 64) + 1}`, startedAt: iso(i % 9, 9), endedAt: iso(i % 9, 10 + (i % 3)), minutes: 45 + (i % 5) * 15, note: 'Registo de trabalho operacional.' })));

  await marker.set({ version: SEED_VERSION, seededAt: timestamp, seededBy: identity.uid, departments: BET_DEPARTMENTS.length, users: userRows.length, intent: 'realistic-demo-operating-environment' }, { merge: true });
}

async function seedCollection(db: FirebaseFirestore.Firestore, collection: string, rows: Record<string, unknown>[]) {
  const batch = db.batch(); rows.forEach((row) => { const id = String(row.id ?? `${collection}-${Math.random().toString(36).slice(2)}`); batch.set(db.collection(collection).doc(id), row, { merge: true }); }); await batch.commit();
}
