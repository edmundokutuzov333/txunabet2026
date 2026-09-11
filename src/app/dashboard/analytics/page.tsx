
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ProjectProgressChart = dynamic(
  () => import('./_components/project-progress-chart'),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-80 w-full" />
  }
);

const UserActivityChart = dynamic(
  () => import('./_components/user-activity-chart'),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-80 w-full" />
  }
);

export default function AnalyticsPage() {
  return (
    <div className="p-6 fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-8">Analytics</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
             <Card className="gradient-surface border-0 rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Progresso dos Projetos Ativos</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                    <ProjectProgressChart />
                </CardContent>
            </Card>
            <Card className="gradient-surface border-0 rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Atividade dos Utilizadores (Últimos 7 Dias)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                    <UserActivityChart />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
