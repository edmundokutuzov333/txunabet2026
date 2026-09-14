import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';
import { requireIdentity } from '@/server/authorization';
import { getAdminDb } from '@/server/firebase/admin';
import { listInbox } from './notification';

const ROLE_SURFACES = {
  owner: ['Company', 'Finance', 'Marketing', 'Operations', 'People', 'Risks', 'Goals'],
  admin: ['Company', 'Finance', 'Marketing', 'Operations', 'People', 'Risks', 'Goals'],
  manager: ['Team', 'Projects', 'Tasks', 'Meetings', 'Approvals', 'Workload'],
  member: ['My work', 'Messages', 'Meetings', 'Tasks', 'Approvals', 'Personal goals'],
  viewer: ['My work', 'Messages', 'Meetings', 'Tasks', 'Approvals', 'Personal goals'],
} as const;

function millis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return Date.parse(value) || 0;
  return 0;
}

function dateKey(value: unknown): string { const ms = millis(value); return ms ? new Date(ms).toISOString().slice(0, 10) : ''; }
function humanTitle(item: Record<string, unknown>, fallback: string) { return String(item.title ?? item.name ?? item.subject ?? fallback); }

async function queryCompany(collection: string, companyId: string, limit = 100) {
  try {
    return await getAdminDb().collection(collection).where('companyId', '==', companyId).limit(limit).get();
  } catch {
    return { docs: [] } as const;
  }
}

export async function getCommandCenter() {
  const identity = await requireIdentity();
  const db = getAdminDb();
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endToday = today.getTime() + 86_400_000;

  const [tasksSnap, meetingsSnap, projectsSnap, campaignsSnap, approvalsSnap, risksSnap, incidentsSnap, goalsSnap, automationsSnap, outboxSnap, activitiesSnap, inbox] = await Promise.all([
    queryCompany('module_tasks', identity.companyId, 300),
    queryCompany('module_meetings', identity.companyId, 200),
    queryCompany('projects', identity.companyId, 200),
    queryCompany('module_campaigns', identity.companyId, 200),
    queryCompany('approvals', identity.companyId, 200),
    queryCompany('risks', identity.companyId, 100),
    queryCompany('incidents', identity.companyId, 100),
    queryCompany('goals', identity.companyId, 100),
    queryCompany('module_automations', identity.companyId, 100),
    queryCompany('event_outbox', identity.companyId, 300),
    queryCompany('activities', identity.companyId, 100),
    listInbox({ limit: 100 }),
  ]);

  const tasks = tasksSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
  const meetings = meetingsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
  const projects = projectsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
  const campaigns = campaignsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
  const approvals = approvalsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
  const risks = risksSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
  const incidents = incidentsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
  const goals = goalsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
  const automations = automationsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
  const outbox = outboxSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
  const activities = activitiesSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));

  const mine = (task: Record<string, unknown>) => [task.assigneeId, task.assignedTo, task.ownerId].some((value) => value === identity.uid);
  const myTasks = tasks.filter(mine).filter((task) => !['done', 'completed', 'cancelled'].includes(String(task.status ?? '')));
  const myMeetings = meetings.filter((meeting) => {
    const participants = Array.isArray(meeting.participants) ? meeting.participants.map(String) : [];
    return participants.includes(identity.uid) || meeting.ownerId === identity.uid || meeting.createdBy === identity.uid;
  });
  const dueToday = myTasks.filter((task) => { const due = millis(task.dueDate); return due >= today.getTime() && due < endToday; });
  const overdue = myTasks.filter((task) => { const due = millis(task.dueDate); return due > 0 && due < now; });
  const pendingApprovals = approvals.filter((approval) => ['pending', 'requested', 'awaiting'].includes(String(approval.status ?? '').toLowerCase()) && [approval.approverId, approval.assignedTo, approval.userId, approval.requesterId].includes(identity.uid));
  const critical = inbox.filter((item) => ['critical', 'high'].includes(String(item.severity ?? '')) && item.read !== true);
  const atRisk = [...projects, ...risks, ...incidents].filter((item) => ['at-risk', 'at_risk', 'critical', 'open', 'blocked'].includes(String(item.status ?? '').toLowerCase()) || item.atRisk === true).slice(0, 20);
  const blocked = myTasks.filter((task) => ['blocked', 'waiting'].includes(String(task.status ?? '').toLowerCase()));
  const failedWorkflows = outbox.filter((item) => String(item.eventName ?? '').includes('workflow.failed') || String(item.status ?? '') === 'failed');

  const pulse = [
    { label: 'Operations', value: tasks.length, href: '/dashboard/tasks' },
    { label: 'Marketing', value: campaigns.length, href: '/dashboard/campaigns' },
    { label: 'Projects', value: projects.length, href: '/dashboard/workspaces' },
    { label: 'Teams', value: identity.departmentIds.length, href: '/dashboard/team' },
    { label: 'Campaigns', value: campaigns.length, href: '/dashboard/campaigns' },
    { label: 'Incidents', value: incidents.length, href: '/dashboard/pulse' },
    { label: 'Goals', value: goals.length, href: '/dashboard/analytics' },
    { label: 'Automation', value: automations.filter((item) => item.active === true).length, href: '/dashboard/automations' },
  ];

  const activityFeed = activities.concat(outbox.map((item) => ({ id: `event_${item.id}`, eventName: item.eventName, entityType: item.entityType, entityId: item.entityId, createdAt: item.occurredAt, actorId: item.actorId, payload: item.payload })))
    .sort((a, b) => millis(b.createdAt) - millis(a.createdAt)).slice(0, 30)
    .map((item) => ({
      id: String(item.id),
      eventName: String(item.eventName ?? 'activity'),
      entityType: String(item.entityType ?? 'activity'),
      entityId: String(item.entityId ?? ''),
      actorId: String(item.actorId ?? ''),
      createdAt: dateKey(item.createdAt),
      title: humanTitle((item.payload ?? {}) as Record<string, unknown>, String(item.eventName ?? 'Atividade')), 
    }));

  const unread = inbox.filter((item) => item.read !== true);
  const categoryCount = (category: string) => unread.filter((item) => item.category === category).length;

  return {
    identity: { uid: identity.uid, email: identity.email, role: identity.role, companyId: identity.companyId, departmentIds: identity.departmentIds },
    surfaces: [...ROLE_SURFACES[identity.role]],
    today: {
      tasks: myTasks.slice(0, 10), meetings: myMeetings.slice(0, 10), messages: unread.filter((item) => ['mention', 'comment'].includes(String(item.category))).slice(0, 10), approvals: pendingApprovals.slice(0, 10), deadlines: dueToday.slice(0, 10), alerts: critical.slice(0, 10),
    },
    pulse,
    attention: {
      critical: critical.slice(0, 10),
      needsAction: unread.filter((item) => ['assignment', 'approval', 'task', 'form', 'request'].includes(String(item.category))).slice(0, 20),
      atRisk,
      blocked: blocked.slice(0, 10),
      waiting: unread.filter((item) => item.category === 'request').slice(0, 10),
    },
    briefing: {
      changed: activityFeed.slice(0, 5),
      failed: failedWorkflows.slice(0, 5),
      completed: tasks.filter((task) => ['done', 'completed'].includes(String(task.status ?? ''))).slice(-5),
      atRisk: atRisk.slice(0, 5),
      summary: `${unread.length} itens não lidos, ${overdue.length} tarefas em atraso, ${pendingApprovals.length} aprovações pendentes e ${atRisk.length} sinais de risco.`,
    },
    inbox: {
      items: inbox,
      counts: { totalUnread: unread.length, critical: critical.length, today: inbox.filter((item) => millis(item.createdAt) >= today.getTime()).length, informational: categoryCount('system') },
    },
    activityFeed,
    offline: { decisions: unread.filter((item) => item.category === 'decision').slice(0, 5), messages: unread.filter((item) => ['mention', 'comment'].includes(String(item.category))).slice(0, 5), tasks: unread.filter((item) => ['assignment', 'task'].includes(String(item.category))).slice(0, 5), approvals: unread.filter((item) => item.category === 'approval').slice(0, 5), projectsAtRisk: atRisk.slice(0, 5) },
  };
}
