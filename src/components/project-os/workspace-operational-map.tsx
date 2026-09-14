'use client';

import { useEffect, useState } from 'react';
import { Activity, BarChart3, BookOpen, CalendarDays, FileText, Folder, ListTodo, MessageSquare, Network, Target, Users, Video, Workflow } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectOsView from './project-os-view';

interface ModuleRow { label: string; collection: string; count: number }
interface WorkspaceRow { id: string; name?: unknown; modules: ModuleRow[] }

const icons: Record<string, typeof Folder> = { Projects: Folder, Tasks: ListTodo, Campaigns: Target, Goals: Target, Calendar: CalendarDays, Docs: FileText, Files: Folder, Chat: MessageSquare, Meetings: Video, Forms: FileText, Workflows: Workflow, Dashboards: BarChart3, Knowledge: BookOpen };

export default function WorkspaceOperationalMap() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  useEffect(() => { void fetch('/api/project-os?resource=workspace-map', { cache: 'no-store', credentials: 'include' }).then(async (response) => { if (!response.ok) return; const result = await response.json() as { data: WorkspaceRow[] }; setWorkspaces(result.data); }).catch(() => undefined); }, []);
  return <div className="space-y-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Network className="h-5 w-5"/>Workspace operational map</CardTitle></CardHeader><CardContent className="space-y-4">{workspaces.length ? workspaces.map((workspace) => <div key={workspace.id} className="rounded-xl border p-4"><div className="font-semibold">{String(workspace.name ?? 'Workspace')}</div><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3">{workspace.modules.map((module) => { const Icon = icons[module.label] ?? Activity; return <div key={module.collection} className="rounded-lg border p-3"><Icon className="h-4 w-4 text-muted-foreground"/><div className="text-sm font-medium mt-2">{module.label}</div><div className="text-xs text-muted-foreground mt-1">{module.count} registos</div></div>; })}</div></div>) : <div className="text-sm text-muted-foreground">Ainda não existem Workspaces operacionais.</div>}</CardContent></Card><ProjectOsView /></div>;
}
