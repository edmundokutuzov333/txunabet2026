import { NextResponse } from 'next/server';
import { requireIdentity } from '@/server/authorization';
import { getAdminDb } from '@/server/firebase/admin';
import { BET_DEPARTMENTS } from '@/server/services/demo-seed';

export async function GET() {
  try {
    const identity = await requireIdentity();
    const db = getAdminDb();
    const [departmentSnap, usersSnap, projectsSnap] = await Promise.all([
      db.collection('departments').where('companyId', '==', identity.companyId).limit(100).get(),
      db.collection('users').where('companyId', '==', identity.companyId).limit(500).get(),
      db.collection('projects').where('companyId', '==', identity.companyId).limit(200).get(),
    ]);
    const departments = BET_DEPARTMENTS.map(([slug, name]) => {
      const doc = departmentSnap.docs.find((item) => item.id === `demo-dept-${slug}` || item.data()?.slug === slug);
      const data = doc?.data() ?? {};
      const memberCount = usersSnap.docs.filter((user) => Array.isArray(user.data()?.departmentIds) && user.data()?.departmentIds.includes(slug)).length;
      const projects = projectsSnap.docs.filter((project) => project.data()?.departmentId === `demo-dept-${slug}`).length;
      return { id: doc?.id ?? `demo-dept-${slug}`, slug, name, description: data.description ?? `Área de ${String(name).toLowerCase()} da operação Txuna Bet.`, budget: Number(data.budget ?? 0), memberCount, projects };
    });
    return NextResponse.json({ departments });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'DEPARTMENTS_LOAD_FAILED';
    return NextResponse.json({ error: code }, { status: code === 'UNAUTHENTICATED' ? 401 : 500 });
  }
}
