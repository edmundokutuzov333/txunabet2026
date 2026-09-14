'use client';

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { apiFetch } from '@/lib/client/api';

type AnalyticsResponse = { data: { totals: Record<string, number>; activity: { date: string; count: number }[] } };

export default function ProjectProgressChart() {
    const { data, isLoading } = useQuery({
        queryKey: ['analytics'],
        queryFn: () => apiFetch<AnalyticsResponse>('/api/analytics'),
    });

    const totals = data?.data.totals ?? {};
    const projectData = [
        { name: 'Projects', value: Number(totals.projects ?? 0) },
        { name: 'Tasks', value: Number(totals.tasks ?? 0) },
        { name: 'Goals', value: Number(totals.goals ?? 0) },
        { name: 'Campaigns', value: Number(totals.campaigns ?? 0) },
    ];
    if (isLoading) return <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">A carregar analytics...</div>;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectData}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                    cursor={{ fill: 'hsla(var(--primary) / 0.1)' }}
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))'
                    }}
                />
                <Bar dataKey="value" name="Registos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
