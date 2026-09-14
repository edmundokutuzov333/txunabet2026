'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BriefcaseBusiness, CheckCircle2, CheckSquare2, FileText, FolderKanban, Inbox, LayoutDashboard, Menu, Plus, Search, Sparkles, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import AiAssistant from '@/components/ai-assistant';
import StartCallDialog from '@/components/start-call-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { OryonButton, OryonIconButton, OryonNotificationPanel, OryonPopover, type NotificationItem } from '@/components/oryon-ui';
import { useOryonShell } from './oryon-shell-v2';

type BackendNotification = {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  body?: string;
  actor?: { name?: string; avatar?: string };
  actorName?: string;
  actorAvatar?: string;
  entity?: string;
  createdAt?: string | { _seconds?: number };
  read?: boolean;
  archived?: boolean;
  context?: string[];
};

const routeLabels: Record<string, string> = {
  '/dashboard': 'Command Center', '/dashboard/inbox': 'Inbox', '/dashboard/tasks': 'My Work', '/dashboard/projects': 'Projects', '/dashboard/goals': 'Goals', '/dashboard/calendar': 'Calendar', '/dashboard/chat/general': 'Chat', '/dashboard/meetings': 'Meetings', '/dashboard/team': 'People', '/dashboard/search': 'Search', '/dashboard/documents': 'Docs', '/dashboard/cloud': 'Files', '/dashboard/workflows': 'Workflows', '/dashboard/automations': 'Automations', '/dashboard/forms': 'Forms', '/dashboard/oryon-ai': 'OryonAI', '/dashboard/pulse': 'Pulse', '/dashboard/analytics': 'Analytics', '/dashboard/admin/enterprise': 'Admin', '/dashboard/security': 'Security', '/dashboard/settings': 'Settings',
};

const kindFor = (type?: string): NotificationItem['kind'] => {
  if (type === 'mention' || type === 'comment' || type === 'edit' || type === 'file' || type === 'request' || type === 'join' || type === 'created' || type === 'due') return type;
  return 'created';
};

const timeFor = (createdAt?: BackendNotification['createdAt']) => {
  const millis = typeof createdAt === 'object' && createdAt?._seconds ? createdAt._seconds * 1000 : typeof createdAt === 'string' ? Date.parse(createdAt) : NaN;
  if (!Number.isFinite(millis)) return 'Agora';
  const diff = Math.max(0, Date.now() - millis);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
};

function toNotification(item: BackendNotification, index: number): NotificationItem {
  const id = item.id ?? `notification-${index}`;
  const actorName = item.actor?.name ?? item.actorName ?? 'Oryon';
  const message = item.message ?? item.body ?? item.title ?? 'Nova actividade no Oryon.';
  const pieces: NotificationItem['body'] = item.entity ? [message.replace(item.entity, ''), { entity: item.entity }] : [message];
  return { id, actor: { name: actorName, avatar: item.actor?.avatar ?? item.actorAvatar }, kind: kindFor(item.type), body: pieces, time: timeFor(item.createdAt), context: item.context, unread: !item.read, archived: Boolean(item.archived) };
}

function CommandEntry({ icon: Icon, title, description, href, onSelect }: { icon: React.ElementType; title: string; description: string; href: string; onSelect: () => void }) {
  return <Link href={href} onClick={onSelect} className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-border bg-surface-1 text-muted-foreground"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-foreground">{title}</span><span className="block truncate text-[10px] text-muted-foreground">{description}</span></span></Link>;
}

function CommandMenu() {
  const { commandOpen, setCommandOpen } = useOryonShell();
  const [query, setQuery] = React.useState('');
  React.useEffect(() => { if (!commandOpen) setQuery(''); }, [commandOpen]);
  const q = query.trim().toLowerCase();
  const match = (text: string) => !q || text.toLowerCase().includes(q);
  const actions = [
    { title: 'Create task', description: 'Criar uma nova tarefa', icon: CheckSquare2, href: '/dashboard/tasks' },
    { title: 'Create project', description: 'Criar um projecto', icon: FolderKanban, href: '/dashboard/projects' },
    { title: 'Start meeting', description: 'Abrir reuniões', icon: BriefcaseBusiness, href: '/dashboard/meetings' },
    { title: 'Open AI', description: 'Abrir OryonAI', icon: Sparkles, href: '/dashboard/oryon-ai' },
    { title: 'Create workflow', description: 'Construir uma automação', icon: Workflow, href: '/dashboard/workflows' },
  ].filter((item) => match(item.title) || match(item.description));
  const nav = Object.entries(routeLabels).filter(([href, label]) => match(label) || match(href)).slice(0, 12);

  return <div role="dialog" aria-modal="true" aria-labelledby="oryon-command-title" className="contents"><div className={cn('fixed inset-0 z-50 bg-black/55', !commandOpen && 'hidden')} onClick={() => setCommandOpen(false)} /><div className={cn('fixed left-1/2 top-[10vh] z-[51] w-[min(680px,calc(100vw-24px))] -translate-x-1/2 rounded-[14px] border border-border bg-surface-3 p-4 shadow-[var(--elevation-modal)]', !commandOpen && 'hidden')}><div className="flex items-center justify-between"><div><h2 id="oryon-command-title" className="text-h2">Command</h2><p className="mt-1 text-body-small text-muted-foreground">Navega, pesquisa e executa sem sair do contexto.</p></div><kbd className="rounded-[5px] border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">ESC</kbd></div><div className="mt-4 flex h-10 items-center gap-2 rounded-[8px] border border-border bg-surface-1 px-3 focus-within:border-primary/60"><Search className="h-4 w-4 text-muted-foreground" /><input autoFocus={commandOpen} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar trabalho, pessoas, knowledge ou comandos…" className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/65" /></div><div className="mt-4 max-h-[420px] overflow-y-auto custom-scrollbar">{actions.length ? <section><p className="px-2 text-label">Acções</p><div className="mt-1 grid gap-0.5">{actions.map((item) => <CommandEntry key={item.title} {...item} onSelect={() => setCommandOpen(false)} />)}</div></section> : null}{nav.length ? <section className="mt-4"><p className="px-2 text-label">Navegação</p><div className="mt-1 grid gap-0.5">{nav.map(([href, label]) => <CommandEntry key={href} icon={LayoutDashboard} title={label} description="Abrir no Oryon" href={href} onSelect={() => setCommandOpen(false)} />)}</div></section> : null}{!actions.length && !nav.length ? <p className="px-3 py-12 text-center text-xs text-muted-foreground">Nenhum resultado para “{query}”.</p> : null}</div></div></div>;
}

function Notifications() {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const load = React.useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store', credentials: 'include' });
      const payload = await response.json() as { notifications?: BackendNotification[]; unreadCount?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'NOTIFICATIONS_FAILED');
      const nextItems = Array.isArray(payload.notifications) ? payload.notifications.map((item: BackendNotification, index: number) => toNotification(item, index)) : [];
      setItems(nextItems);
      setUnreadCount(Number(payload.unreadCount ?? nextItems.filter((item: NotificationItem) => item.unread).length));
    } catch { setItems([]); setUnreadCount(0); } finally { setLoading(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  const markAllRead = async () => {
    setItems((current) => current.map((item) => ({ ...item, unread: false })));
    setUnreadCount(0);
    try { await fetch('/api/notifications', { method: 'PATCH', credentials: 'include' }); } catch { void load(); }
  };
  return <OryonPopover trigger={<span className="relative inline-flex"><OryonIconButton label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ''}`}><Bell className="h-4 w-4" />{unreadCount > 0 ? <span className="absolute right-0.5 top-0.5 min-w-1.5 rounded-full bg-primary px-1 text-[8px] font-bold leading-3 text-primary-foreground">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}</OryonIconButton></span>}><div className="w-[min(430px,calc(100vw-32px))]">{loading ? <div className="p-8 text-center text-xs text-muted-foreground">A carregar notificações…</div> : <OryonNotificationPanel items={items} maxHeight={440} onMarkAllRead={() => void markAllRead()} />}</div></OryonPopover>;
}

export function Header() {
  const pathname = usePathname();
  const { setSidebarOpen, setCommandOpen } = useOryonShell();
  const [aiOpen, setAiOpen] = React.useState(false);
  const label = Object.entries(routeLabels).sort((a, b) => b[0].length - a[0].length).find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1] ?? 'Oryon';
  return <header className="oryon-header sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md md:px-5"><OryonIconButton label="Abrir menu" className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-4 w-4" /></OryonIconButton><div className="hidden min-w-[180px] items-center gap-2 md:flex"><span className="grid h-7 w-7 place-items-center rounded-[7px] bg-primary text-primary-foreground"><LayoutDashboard className="h-3.5 w-3.5" /></span><div><p className="text-[11px] font-semibold text-foreground">Oryon</p><p className="text-[9px] text-muted-foreground">{label}</p></div></div><button type="button" onClick={() => setCommandOpen(true)} className="mx-auto flex h-9 min-w-0 max-w-[620px] flex-1 items-center gap-2 rounded-[9px] border border-border bg-surface-1 px-3 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"><Search className="h-3.5 w-3.5 text-muted-foreground" /><span className="hidden truncate text-[11px] text-muted-foreground sm:block">Pesquisar trabalho, pessoas, documentos e comandos…</span><span className="truncate text-[11px] text-muted-foreground sm:hidden">Pesquisar…</span><kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[8px] text-muted-foreground sm:block">⌘K</kbd></button><div className="flex shrink-0 items-center gap-1.5"><OryonButton variant="ghost" size="icon" onClick={() => setAiOpen(true)} aria-label="Abrir OryonAI"><Sparkles className="h-4 w-4" /></OryonButton><Notifications /><Link href="/dashboard/tasks" className="hidden md:block"><OryonButton variant="primary" size="sm"><Plus className="h-3.5 w-3.5" />Criar</OryonButton></Link><DropdownMenu><DropdownMenuTrigger asChild><OryonButton variant="ghost" size="icon" aria-label="Menu de conta"><span className="text-[11px] font-semibold">OK</span></OryonButton></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href="/dashboard/settings">Settings</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/dashboard/security">Security</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><CommandMenu />{aiOpen ? <AiAssistant onClose={() => setAiOpen(false)} /> : null}<StartCallDialog /></header>;
}
