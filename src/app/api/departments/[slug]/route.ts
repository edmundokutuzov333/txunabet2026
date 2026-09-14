import { NextResponse } from 'next/server';
import { requireIdentity } from '@/server/authorization';
import { getAdminDb } from '@/server/firebase/admin';
import { BET_DEPARTMENTS } from '@/server/services/demo-seed';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const identity = await requireIdentity();
    const { slug } = await context.params;
    const definition = BET_DEPARTMENTS.find(([value]) => value === slug);
    if (!definition) return NextResponse.json({ error: 'DEPARTMENT_NOT_FOUND' }, { status: 404 });

    const db = getAdminDb();
    const departmentId = `demo-dept-${slug}`;
    const [departmentSnap, membersSnap, projectsSnap, tasksSnap] = await Promise.all([
      db.collection('departments').doc(departmentId).get(),
      db.collection('users').where('companyId', '==', identity.companyId).where('departmentIds', 'array-contains', slug).limit(100).get(),
      db.collection('projects').where('companyId', '==', identity.companyId).where('departmentId', '==', departmentId).limit(50).get(),
      db.collection('module_tasks').where('companyId', '==', identity.companyId).where('departmentId', '==', departmentId).limit(100).get(),
    ]);

    const department = departmentSnap.exists ? departmentSnap.data() : { id: departmentId, companyId: identity.companyId, slug, name: definition[1], description: `Área de ${String(definition[1]).toLowerCase()} da operação Txuna Bet.`, budget: 0, goals: [] };
    const members = membersSnap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
    const projects = projectsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const tasks = tasksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const completedTasks = tasks.filter((task) => ['done', 'completed'].includes(String(task.status ?? '').toLowerCase())).length;
    const blockedTasks = tasks.filter((task) => ['blocked', 'waiting'].includes(String(task.status ?? '').toLowerCase())).length;
    const highPriority = tasks.filter((task) => ['high', 'critical', 'urgent'].includes(String(task.priority ?? '').toLowerCase())).length;

    return NextResponse.json({
      department: { ...department, id: department.id ?? departmentId, slug, memberCount: members.length, projects: projects.length },
      members,
      projects,
      tasks,
      metrics: { totalTasks: tasks.length, completedTasks, blockedTasks, highPriority, completionRate: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0 },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'DEPARTMENT_LOAD_FAILED';
    return NextResponse.json({ error: code }, { status: code === 'UNAUTHENTICATED' ? 401 : 500 });
  }
}
