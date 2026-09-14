'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { OryonBadge, OryonPanel, OryonButton, OryonEmptyState } from '@/components/oryon-ui';

type Job = { id: string; status?: string; trigger?: string; attempts?: number; error?: string; createdAt?: string };
export default function WorkflowExecutionLog(){
 const [jobs,setJobs]=useState<Job[]>([]); const [loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{const r=await fetch('/api/automation-engine?resource=jobs',{cache:'no-store',credentials:'include'});const p=await r.json();if(r.ok)setJobs(Array.isArray(p.data)?p.data.slice(0,12):[]);}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 return <OryonPanel className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-label">Execution log</p><h2 className="mt-1 text-h2">Recent runs</h2></div><OryonButton variant="ghost" size="sm" onClick={()=>void load()} disabled={loading}><RefreshCw className="h-3.5 w-3.5"/>Refresh</OryonButton></div>{loading?<div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/></div>:jobs.length===0?<div className="mt-3"><OryonEmptyState icon={<Clock3 className="h-5 w-5"/>} title="No executions yet" description="As soon as a workflow runs, its operational state will appear here."/></div>:<div className="mt-4 overflow-hidden rounded-[8px] border border-border"><div className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.7fr] border-b border-border bg-surface-1 px-3 py-2 text-label"><span>Job</span><span>Status</span><span>Attempts</span><span>Trigger</span></div>{jobs.map(job=><div key={job.id} className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.7fr] items-center border-b border-border/70 px-3 py-2.5 text-[11px] last:border-b-0"><span className="truncate text-foreground">{job.id}</span><span>{job.status==='succeeded'?<OryonBadge tone="success"><CheckCircle2 className="mr-1 h-3 w-3"/>succeeded</OryonBadge>:job.status==='dead'?<OryonBadge tone="danger"><XCircle className="mr-1 h-3 w-3"/>dead</OryonBadge>:<OryonBadge tone="neutral">{job.status??'queued'}</OryonBadge>}</span><span className="text-muted-foreground tabular-nums">{job.attempts??0}</span><span className="truncate text-muted-foreground">{job.trigger??'manual'}</span>{job.error?<span className="col-span-4 mt-1 truncate text-[10px] text-[hsl(var(--status-danger))]">{job.error}</span>:null}</div>)}</div>}</OryonPanel>;
}
