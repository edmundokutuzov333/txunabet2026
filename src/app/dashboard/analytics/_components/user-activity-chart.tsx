'use client';

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { apiFetch } from '@/lib/client/api';

type AnalyticsResponse = { data: { totals: Record<string, number>; activity: { date: string; count: number }[] } };

export default function UserActivityChart() {
    const { data, isLoading } = useQuery({
        queryKey: ['analytics'],
        queryFn: () => apiFetch<AnalyticsResponse>('/api/analytics'),
    });

    const activity = data?.data.activity ?? [];
    if (isLoading) return <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">A carregar analytics...</div>;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activity}>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                    cursor={{ fill: 'hsla(var(--primary) / 0.1)' }}
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))'
                    }}
                />
                <Bar dataKey="count" name="Actividade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
