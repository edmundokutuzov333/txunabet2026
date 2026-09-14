'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, Building2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DepartmentsIndexPage() {
  const [departments, setDepartments] = useState<Array<{ slug:string; name:string; description?:string; memberCount:number; projects:number; budget:number }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/departments', { credentials: 'include', cache: 'no-store' }).then((r) => r.json()).then((p) => setDepartments(Array.isArray(p.departments) ? p.departments : [])).finally(() => setLoading(false)); }, []);
  return <div className="grid gap-6"><div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><p className="text-xs uppercase tracking-[0.12em] text-primary">Organisation</p><h1 className="text-3xl font-bold">Departments</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Visão transversal das equipas que sustentam a operação de sportsbook, pagamentos, compliance, risco, produto e crescimento.</p></div><Button asChild variant="outline"><Link href="/dashboard">Command Center<ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div>{loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({length:9}).map((_,i)=><div key={i} className="h-36 animate-pulse rounded-2xl bg-surface-1"/>)}</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{departments.map((department)=><Link key={department.slug} href={`/dashboard/departments/${department.slug}`}><Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40"><CardHeader><div className="flex items-start justify-between gap-2"><CardTitle className="text-base">{department.name}</CardTitle><Badge variant="outline">Active</Badge></div><p className="text-xs text-muted-foreground">{department.description}</p></CardHeader><CardContent><div className="grid grid-cols-3 gap-2"><div className="rounded-lg border p-2"><Users className="h-3.5 w-3.5 text-primary"/><p className="mt-1 text-lg font-semibold">{department.memberCount}</p><p className="text-[10px] text-muted-foreground">People</p></div><div className="rounded-lg border p-2"><Building2 className="h-3.5 w-3.5 text-primary"/><p className="mt-1 text-lg font-semibold">{department.projects}</p><p className="text-[10px] text-muted-foreground">Projects</p></div><div className="rounded-lg border p-2"><Activity className="h-3.5 w-3.5 text-primary"/><p className="mt-1 text-lg font-semibold">MZN {Math.round(Number(department.budget ?? 0)/1000)}k</p><p className="text-[10px] text-muted-foreground">Budget</p></div></div></CardContent></Card></Link>)}</div>}</div>;
}
