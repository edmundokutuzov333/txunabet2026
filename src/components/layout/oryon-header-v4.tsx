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
  '/dashboard': 'Command Center',
  '/dashboard/inbox': 'Inbox',
  '/dashboard/tasks': 'My Work',
  '/dashboard/projects': 'Projects',
  '/dashboard/goals': 'Goals',
  '/dashboard/calendar': 'Calendar',
  '/dashboard/chat/general': 'Chat',
  '/dashboard/meetings': 'Meetings',
  '/dashboard/team': 'People',
  '/dashboard/search': 'Search',
  '/dashboard/documents': 'Docs',
  '/dashboard/cloud': 'Files',
  '/dashboard/workflows': 'Workflows',
  '/dashboard/automations': 'Automations',
  '/dashboard/forms': 'Forms',
  '/dashboard/oryon-ai': 'OryonAI',
  '/dashboard/pulse': 'Pulse',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/admin/enterprise': 'Admin',
  '/dashboard/security': 'Security',
  '/dashboard/settings': 'Settings',
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
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
};

function toNotification(item: BackendNotification, index: number): NotificationItem {
  const id = item.id ?? `notification-${index}`;
  const actorName = item.actor?.name ?? item.actorName ?? 'Oryon';
  const message = item.message ?? item.body ?? item.title ?? 'Nova actividade no Oryon.';
  const entity = item.entity;
  const pieces = entity ? [message.replace(entity, ''), { entity }] : [message];
  return {
    id,
    actor: { name: actorName, avatar: item.actor?.avatar ?? item.actorAvatar },
    kind: kindFor(item.type),
    body: pieces,
    time: timeFor(item.createdAt),
    context: item.context,
    unread: !item.read,
    archived: Boolean(item.archived),
  };
}

function CommandEntry({ icon: Icon, title, description, href, onSelect }: { icon: React.ElementType; title: string; description: string; href: string; onSelect: () => void }) {
  return <Link href={href} onClick={onSelect} className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-border bg-surface-1 text-muted-foreground"><Icon className="h-4 w-4" /></span>
    <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-foreground">{title}</span><span className="block truncate text-[10px] text-muted-foreground">{description}</span></span>
  </Link>;
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

  return <div role="dialog" aria-modal="true" aria-labelledby="oryon-command-title" className="contents">
    <div className={cn('fixed inset-0 z-50 bg-black/55', !commandOpen && 'hidden')} onClick={() => setCommandOpen(false)} />
    <div className={cn('fixed left-1/2 top-[10vh] z-[51] w-[min(680px,calc(100vw-24px))] -translate-x-1/2 rounded-[14px] border border-border bg-surface-3 p-4 shadow-[var(--elevation-modal)]', !commandOpen && 'hidden')}>
      <div className="flex items-center justify-between"><div><h2 id="oryon-command-title" className="text-h2">Command</h2><p className="mt-1 text-body-small text-muted-foreground">Navega, pesquisa e executa sem sair do contexto.</p></div><kbd className="rounded-[5px] border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">ESC</kbd></div>
      <div className="mt-4 flex h-10 items-center gap-2 rounded-[8px] border border-border bg-surface-1 px-3 focus-within:border-primary/60"><Search className="h-4 w-4 text-muted-foreground" /><input autoFocus={commandOpen} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar trabalho, pessoas, knowledge ou comandos…" className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/65" /></div>
      <div className="mt-4 max-h-[420px] overflow-y-auto custom-scrollbar">
        {actions.length ? <section><p className="px-2 text-label">Acções</p><div className="mt-1 grid gap-0.5">{actions.map((item) => <CommandEntry key={item.title} {...item} onSelect={() => setCommandOpen(false)} />)}</div></section> : null}
        {nav.length ? <section className="mt-4"><p className="px-2 text-label">Navegação</p><div className="mt-1 grid gap-0.5">{nav.map(([href, label]) => <CommandEntry key={href} icon={LayoutDashboard} title={label} description="Abrir no Oryon" href={href} onSelect={() => setCommandOpen(false)} />)}</div></section> : null}
        {!actions.length && !nav.length ? <p className="px-3 py-12 text-center text-xs text-muted-foreground">Nenhum resultado para “{query}”.</p> : null}
      </div>
    </div>
  </div>;
}

function Notifications() {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store', credentials: 'include' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'NOTIFICATIONS_FAILED');
      const nextItems = Array.isArray(payload.notifications) ? payload.notifications.map(toNotification) : [];
      setItems(nextItems);
      setUnreadCount(Number(payload.unreadCount ?? nextItems.filter((item) => item.unread).length));
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const markAllRead = async () => {
    setItems((current) => current.map((item) => ({ ...item, unread: false })));
    setUnreadCount(0);
    try { await fetch('/api/notifications', { method: 'PATCH', credentials: 'include' }); } catch { void load(); }
  };

  return <OryonPopover trigger={<span className="relative inline-flex"><OryonIconButton label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ''}`}><Bell className="h-4 w-4" />{unreadCount > 0 ? <span className="absolute right-0.5 top-0.5 min-w-1.5 rounded-full bg-primary px-1 text-[8px] font-bold leading-3 text-primary-foreground">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}</OryonIconButton></span>}>
    <div className="w-[min(430px,calc(100vw-32px))]">
      {loading ? <div className="p-8 text-center text-xs text-muted-foreground">A carregar notificações…</div> : <OryonNotificationPanel items={items} maxHeight={440} onMarkAllRead={() => void markAllRead()} />}
    </div>
  </OryonPopover>;
}

export function Header() {
  const pathname = usePathname();
  const { setSidebarOpen, setCommandOpen } = useOryonShell();
  const [aiOpen, setAiOpen] = React.useState(false);
  const [callOpen, setCallOpen] = React.useState(false);
  const label = routeLabels[pathname] ?? Object.entries(routeLabels).find(([href]) => pathname.startsWith(`${href}/`))?.[1] ?? 'Oryon';

  return <>
    <header className="sticky top-0 z-30 grid min-h-[68px] shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-surface-0/90 px-3 backdrop-blur-xl sm:px-4 lg:px-5">
      <div className="flex min-w-0 items-center gap-2 lg:min-w-[220px]"><OryonIconButton className="md:hidden" label="Abrir navegação" onClick={() => setSidebarOpen(true)}><Menu className="h-4 w-4" /></OryonIconButton><div className="hidden min-w-0 items-center gap-2 text-[11px] md:flex"><span className="text-muted-foreground">Oryon</span><span className="text-muted-foreground/35">/</span><span className="truncate font-medium text-foreground">{label}</span></div></div>
      <button type="button" onClick={() => setCommandOpen(true)} aria-label="Pesquisar no Oryon" className="mx-auto flex h-9 min-w-0 w-full max-w-[620px] items-center gap-2.5 rounded-[8px] border border-border bg-surface-1 px-3 text-left hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"><Search className="h-4 w-4 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">Pesquisar no Oryon…</span><kbd className="hidden rounded-[5px] border border-border bg-surface-2 px-1.5 py-0.5 text-[9px] text-muted-foreground sm:inline-flex">⌘ K</kbd></button>
      <div className="flex items-center gap-1.5 lg:min-w-[220px] lg:justify-end"><OryonButton variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Abrir OryonAI" onClick={() => setAiOpen(true)}><Sparkles className="h-4 w-4 text-primary" /></OryonButton><Notifications /><OryonButton className="hidden sm:inline-flex" size="sm" onClick={() => setCallOpen(true)}>Call</OryonButton><DropdownMenu><DropdownMenuTrigger asChild><OryonButton size="sm"><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Create</span></OryonButton></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuItem asChild><Link href="/dashboard/tasks">Nova tarefa</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/dashboard/projects">Novo projecto</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/dashboard/document-editor"><FileText className="mr-2 h-4 w-4" />Novo documento</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setCommandOpen(true)}><Inbox className="mr-2 h-4 w-4" />Mais comandos…</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
    </header>
    <CommandMenu /><AiAssistant isOpen={aiOpen} onOpenChange={setAiOpen} /><StartCallDialog isOpen={callOpen} onOpenChange={setCallOpen} />
  </>;
}

export default Header;
