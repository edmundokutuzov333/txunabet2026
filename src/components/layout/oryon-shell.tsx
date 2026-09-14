'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare2,
  ChevronDown,
  FileText,
  FolderKanban,
  FormInput,
  Goal,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Network,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';
import { cn } from '@/lib/utils';
import AiAssistant from '@/components/ai-assistant';
import StartCallDialog from '@/components/start-call-dialog';
import TxunaLogo from '../icons/txuna-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  OryonButton,
  OryonIconButton,
  OryonInput,
  OryonPopover,
  OryonNotificationPanel,
  OryonCommand,
  type NotificationItem,
} from '@/components/oryon-ui';

export type OryonShellNavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
  description?: string;
  shortcut?: string;
};

type OryonShellSection = {
  title: string;
  items: OryonShellNavItem[];
};

type OryonShellContextValue = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
};

const OryonShellContext = React.createContext<OryonShellContextValue | null>(null);

export function OryonShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <OryonShellContext.Provider value={{ sidebarOpen, setSidebarOpen, commandOpen, setCommandOpen }}>{children}</OryonShellContext.Provider>;
}

export function useOryonShell() {
  const context = React.useContext(OryonShellContext);
  if (!context) throw new Error('useOryonShell must be used inside OryonShellProvider');
  return context;
}

const sections: OryonShellSection[] = [
  {
    title: 'COMMAND',
    items: [
      { href: '/dashboard', label: 'Command Center', icon: LayoutDashboard, description: 'A visão operacional do dia.' },
      { href: '/dashboard/inbox', label: 'Inbox', icon: Inbox, description: 'Tudo o que pede atenção.' },
    ],
  },
  {
    title: 'WORK',
    items: [
      { href: '/dashboard/tasks', label: 'My Work', icon: CheckSquare2, permission: 'operations.read', description: 'Tarefas, prioridades e execução.' },
      { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban, permission: 'operations.read', description: 'Projectos e equipas de entrega.' },
      { href: '/dashboard/goals', label: 'Goals', icon: Goal, permission: 'operations.read', description: 'Objectivos e progresso operacional.' },
      { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays, permission: 'operations.read', description: 'Agenda, reuniões e compromissos.' },
    ],
  },
  {
    title: 'COLLABORATE',
    items: [
      { href: '/dashboard/chat/general', label: 'Chat', icon: MessageSquare, permission: 'chat.read', description: 'Canais e conversas de trabalho.' },
      { href: '/dashboard/meetings', label: 'Meetings', icon: BriefcaseBusiness, permission: 'operations.read', description: 'Reuniões e inteligência de reunião.' },
      { href: '/dashboard/team', label: 'People', icon: Users, permission: 'users.read', description: 'Directório e contexto de pessoas.' },
    ],
  },
  {
    title: 'KNOWLEDGE',
    items: [
      { href: '/dashboard/search', label: 'Search', icon: Search, description: 'Pesquisar em todo o Oryon.' },
      { href: '/dashboard/documents', label: 'Docs', icon: FileText, permission: 'documents.read', description: 'Documentos e conteúdo estruturado.' },
      { href: '/dashboard/cloud', label: 'Files', icon: BookOpen, permission: 'files.read', description: 'Ficheiros e recursos partilhados.' },
    ],
  },
  {
    title: 'AUTOMATE',
    items: [
      { href: '/dashboard/workflows', label: 'Workflows', icon: Workflow, permission: 'automation.read', description: 'Orquestração visual de processos.' },
      { href: '/dashboard/automations', label: 'Automations', icon: Zap, permission: 'automation.read', description: 'Automações activas e recorrentes.' },
      { href: '/dashboard/forms', label: 'Forms', icon: FormInput, permission: 'operations.read', description: 'Captura estruturada e entrada de trabalho.' },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { href: '/dashboard/oryon-ai', label: 'OryonAI', icon: Sparkles, description: 'Inteligência operacional do Oryon.' },
      { href: '/dashboard/pulse', label: 'Pulse', icon: Activity, permission: 'operations.read', description: 'Sinais e saúde operacional.' },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, permission: 'reporting.read', description: 'Métricas, tendências e desempenho.' },
    ],
  },
  {
    title: 'ENTERPRISE',
    items: [
      { href: '/dashboard/admin/enterprise', label: 'Admin', icon: Network, permission: 'company.admin', description: 'Controlo e configuração empresarial.' },
      { href: '/dashboard/security', label: 'Security', icon: ShieldCheck, permission: 'company.admin', description: 'Segurança, acessos e políticas.' },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings2, description: 'Preferências da plataforma.' },
    ],
  },
];

const departments = [
  { href: '/dashboard/departments/marketing', label: 'Marketing' },
  { href: '/dashboard/departments/finance', label: 'Finance' },
  { href: '/dashboard/departments/hr', label: 'HR' },
  { href: '/dashboard/departments/it', label: 'IT' },
  { href: '/dashboard/departments/operations', label: 'Operations' },
  { href: '/dashboard/departments/compliance', label: 'Compliance' },
  { href: '/dashboard/departments/security', label: 'Security' },
];

const allNavItems = sections.flatMap((section) => section.items);

function allowedBy(identity: { role?: string; permissions: string[] } | null, loading: boolean, permission?: string) {
  if (!permission) return true;
  if (loading || !identity) return false;
  if (identity.role === 'owner' || identity.role === 'admin') return true;
  return identity.permissions.includes(permission);
}

function NavItem({ item, allowed, onNavigate }: { item: OryonShellNavItem; allowed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [previewOpen, setPreviewOpen] = React.useState(false);
  if (!allowed) return null;
  const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <div className="relative" onMouseEnter={() => setPreviewOpen(true)} onMouseLeave={() => setPreviewOpen(false)}>
      <Link href={item.href} onClick={onNavigate} className="group block">
        <div className={cn(
          'relative flex h-9 items-center gap-2.5 rounded-[6px] px-2.5 text-[13px] transition-[background-color,color,transform] duration-150 ease-out',
          active ? 'bg-primary/[0.10] text-foreground' : 'text-muted-foreground hover:bg-surface-1 hover:text-foreground',
        )}>
          {active ? <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" /> : null}
          <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.shortcut ? <kbd className="hidden lg:inline-flex rounded-[4px] border border-border bg-surface-1 px-1.5 py-0.5 text-[9px] text-muted-foreground">{item.shortcut}</kbd> : null}
        </div>
      </Link>
      <AnimatePresence>
        {previewOpen && item.description ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, x: -4, y: 3 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -4 }}
            transition={reduced ? { duration: 0 } : { duration: 0.16 }}
            className="pointer-events-none absolute left-[calc(100%+10px)] top-0 z-50 hidden w-60 rounded-[10px] border border-border bg-surface-3 p-3 shadow-[var(--elevation-floating)] lg:block"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[7px] bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" /></span>
              <div className="min-w-0"><p className="text-[12px] font-semibold text-foreground">{item.label}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.description}</p></div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DepartmentSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = departments.find((department) => pathname.startsWith(department.href));
  return (
    <OryonPopover trigger={<button type="button" className="flex w-full items-center gap-2 rounded-[8px] border border-border bg-surface-1 px-2.5 py-2 text-left hover:border-border-strong" aria-label="Department context">
      <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-primary/10 text-primary"><Users className="h-3.5 w-3.5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Context</span><span className="block truncate text-[12px] font-medium text-foreground">{current?.label ?? 'All departments'}</span></span>
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
    </button>}>
      <div className="w-56">
        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Department context</p>
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center justify-between rounded-[6px] px-2 py-2 text-[12px] text-foreground hover:bg-surface-1">All departments</Link>
        {departments.map((department) => <Link key={department.href} href={department.href} onClick={onNavigate} className={cn('block rounded-[6px] px-2 py-2 text-[12px] text-muted-foreground hover:bg-surface-1 hover:text-foreground', current?.href === department.href && 'text-primary')}>{department.label}</Link>)}
      </div>
    </OryonPopover>
  );
}

export function AppSidebar() {
  const auth = useAuth();
  const { user } = useUser();
  const { identity, loading } = useEnterpriseIdentity();
  const { sidebarOpen, setSidebarOpen } = useOryonShell();
  const reduced = useReducedMotion();
  const displayName = identity?.email?.split('@')[0] || user?.displayName || user?.email || 'Utilizador';
  const role = identity?.role || 'Utilizador';

  const content = (
    <aside className="flex h-full w-[264px] flex-col border-r border-border bg-surface-0/95 backdrop-blur-xl">
      <div className="flex h-[68px] shrink-0 items-center border-b border-border px-4">
        <Link href="/dashboard" onClick={() => setSidebarOpen(false)} className="flex min-w-0 items-center gap-2.5">
          <TxunaLogo className="h-9 w-auto" />
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground xl:block">Oryon Enterprise</span>
        </Link>
        <OryonIconButton className="ml-auto md:hidden" label="Fechar navegação" size="sm" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></OryonIconButton>
      </div>

      <div className="shrink-0 border-b border-border px-3 py-3">
        <DepartmentSwitcher onNavigate={() => setSidebarOpen(false)} />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {sections.map((section) => (
          <div key={section.title} className="mb-4 last:mb-0">
            <p className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">{section.title}</p>
            <div className="grid gap-0.5">{section.items.map((item) => <NavItem key={item.href} item={item} allowed={allowedBy(identity, loading, item.permission)} onNavigate={() => setSidebarOpen(false)} />)}</div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex w-full items-center gap-2.5 rounded-[8px] p-2 text-left hover:bg-surface-1">
              <Avatar className="h-8 w-8 rounded-[8px] border border-border"><AvatarImage src={user?.photoURL ?? undefined} alt={displayName} /><AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
              <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-foreground">{displayName}</span><span className="block truncate text-[10px] text-muted-foreground">{role}</span></span>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" side="top">
            <DropdownMenuItem asChild><Link href="/dashboard/profile">Perfil</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/dashboard/settings">Settings</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut(auth)}>Terminar sessão</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden h-full md:block">{content}</div>
      <AnimatePresence>
        {sidebarOpen ? (
          <>
            <motion.button aria-label="Fechar navegação" type="button" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/55 md:hidden" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? { opacity: 0 } : { opacity: 0 }} />
            <motion.div className="fixed inset-y-0 left-0 z-50 md:hidden" initial={reduced ? false : { x: -280 }} animate={{ x: 0 }} exit={reduced ? { x: -280 } : { x: -280 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38 }}>{content}</motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

const notifications: NotificationItem[] = [
  { id: 'task-1', actor: { name: 'Oryon' }, kind: 'due', body: ['a tarefa ', { entity: 'Lançamento Q4' }, ' requer atenção'], time: 'há 18 min', context: ['Tasks'], unread: true, following: true, actions: [{ id: 'open', label: 'Abrir', tone: 'primary', resolved: 'Tarefa aberta' }] },
  { id: 'mention-1', actor: { name: 'Maria Silva' }, kind: 'mention', body: ['mencionou-te em ', { entity: 'Marketing' }], time: 'há 1 h', context: ['Chat'], unread: true },
  { id: 'request-1', actor: { name: 'Finance' }, kind: 'request', body: ['enviou uma solicitação para ', { entity: 'Relatório mensal' }], time: 'há 3 h', context: ['Reports'], following: true, actions: [{ id: 'approve', label: 'Aprovar', tone: 'primary', resolved: 'Solicitação aprovada' }, { id: 'deny', label: 'Rejeitar', tone: 'quiet', resolved: 'Solicitação rejeitada' }] },
];

function CommandRow({ icon: Icon, title, description, href, shortcut, onSelect }: { icon: React.ElementType; title: string; description: string; href?: string; shortcut?: string; onSelect?: () => void }) {
  const row = <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-border bg-surface-1 text-muted-foreground"><Icon className="h-4 w-4" /></span>
    <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-foreground">{title}</span><span className="block truncate text-[10px] text-muted-foreground">{description}</span></span>
    {shortcut ? <kbd className="rounded-[4px] border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">{shortcut}</kbd> : null}
  </button>;
  return href ? <Link href={href}>{row}</Link> : row;
}

function GlobalCommandMenu() {
  const { commandOpen, setCommandOpen } = useOryonShell();
  const [query, setQuery] = React.useState('');
  React.useEffect(() => { if (!commandOpen) setQuery(''); }, [commandOpen]);
  const normalized = query.trim().toLowerCase();
  const matches = (value: string) => !normalized || value.toLowerCase().includes(normalized);
  const nav = allNavItems.filter((item) => matches(item.label) || matches(item.description ?? '')).slice(0, 8);

  return (
    <OryonCommand open={commandOpen} onOpenChange={setCommandOpen} placeholder="Pesquisar trabalho, pessoas, conhecimento ou comandos…">
      <div className="mb-3 grid gap-1">
        <p className="px-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Acções</p>
        {[
          ['Create task', 'Criar uma nova tarefa', CheckSquare2, '/dashboard/tasks'],
          ['Create project', 'Abrir o fluxo de criação de projecto', FolderKanban, '/dashboard/projects'],
          ['Start meeting', 'Iniciar uma nova chamada', BriefcaseBusiness, '/dashboard/meetings'],
          ['Open AI', 'Abrir OryonAI', Sparkles, '/dashboard/oryon-ai'],
          ['Create workflow', 'Construir uma automação visual', Workflow, '/dashboard/workflows'],
        ].filter(([title, description]) => matches(String(title)) || matches(String(description))).map(([title, description, Icon, href]) => <CommandRow key={String(title)} title={String(title)} description={String(description)} icon={Icon as React.ElementType} href={String(href)} onSelect={() => setCommandOpen(false)} />)}
      </div>
      <div className="grid gap-1">
        <p className="px-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Navegação</p>
        {nav.map((item) => <CommandRow key={item.href} title={item.label} description={item.description ?? 'Abrir no Oryon'} icon={item.icon} href={item.href} onSelect={() => setCommandOpen(false)} />)}
      </div>
    </OryonCommand>
  );
}

function HeaderSearch() {
  const { setCommandOpen } = useOryonShell();
  return <button type="button" onClick={() => setCommandOpen(true)} className="group flex h-9 w-full max-w-[620px] items-center gap-2.5 rounded-[8px] border border-border bg-surface-1 px-3 text-left transition-[border-color,background-color] duration-150 hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
    <Search className="h-4 w-4 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">Pesquisar no Oryon…</span><kbd className="hidden items-center gap-1 rounded-[5px] border border-border bg-surface-2 px-1.5 py-0.5 text-[9px] text-muted-foreground sm:inline-flex"><span>⌘</span>K</kbd>
  </button>;
}

export function Header() {
  const pathname = usePathname();
  const { setSidebarOpen, setCommandOpen } = useOryonShell();
  const [aiOpen, setAiOpen] = React.useState(false);
  const [callOpen, setCallOpen] = React.useState(false);
  const breadcrumb = React.useMemo(() => {
    const last = pathname.split('/').filter(Boolean).at(-1);
    if (!last || last === 'dashboard') return 'Command Center';
    const item = allNavItems.find((candidate) => candidate.href.includes(`/${last}`));
    return item?.label ?? last.replace(/-/g, ' ');
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-[68px] shrink-0 items-center gap-3 border-b border-border bg-surface-0/90 px-3 backdrop-blur-xl sm:px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-2 lg:w-[220px]">
          <OryonIconButton className="md:hidden" label="Abrir navegação" onClick={() => setSidebarOpen(true)}><Menu className="h-4 w-4" /></OryonIconButton>
          <div className="hidden min-w-0 items-center gap-2 text-[11px] md:flex"><span className="truncate text-muted-foreground">Oryon</span><span className="text-muted-foreground/40">/</span><span className="truncate font-medium capitalize text-foreground">{breadcrumb}</span></div>
        </div>
        <div className="flex min-w-0 flex-1 justify-center"><HeaderSearch /></div>
        <div className="flex items-center gap-1.5 lg:w-[220px] lg:justify-end">
          <OryonButton variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Abrir OryonAI" onClick={() => setAiOpen(true)}><Sparkles className="h-4 w-4 text-primary" /></OryonButton>
          <OryonPopover trigger={<OryonIconButton label="Notificações"><Bell className="h-4 w-4" /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" /></OryonIconButton>}>
            <div className="w-[min(420px,calc(100vw-32px))]"><OryonNotificationPanel items={notifications} maxHeight={430} /></div>
          </OryonPopover>
          <OryonButton className="hidden sm:inline-flex" size="sm" onClick={() => setCallOpen(true)}><BriefcaseBusiness className="h-3.5 w-3.5" />Call</OryonButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><OryonButton variant="primary" size="sm"><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Create</span></OryonButton></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild><Link href="/dashboard/tasks">Nova tarefa</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/dashboard/projects">Novo projecto</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/dashboard/document-editor">Novo documento</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setCommandOpen(true)}>Mais comandos…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <GlobalCommandMenu />
      <AiAssistant isOpen={aiOpen} onOpenChange={setAiOpen} />
      <StartCallDialog isOpen={callOpen} onOpenChange={setCallOpen} />
    </>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { setCommandOpen } = useOryonShell();
  const items = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/dashboard/tasks', label: 'Work', icon: CheckSquare2 },
    { href: '/dashboard/inbox', label: 'Inbox', icon: Inbox },
    { href: '/dashboard/chat/general', label: 'Chat', icon: MessageSquare },
  ];
  return <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface-0/95 px-1 pb-[max(env(safe-area-inset-bottom),4px)] pt-1 backdrop-blur-xl md:hidden">
    {items.map((item) => { const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href); const Icon = item.icon; return <Link key={item.href} href={item.href} className={cn('flex min-h-12 flex-col items-center justify-center gap-1 rounded-[6px] text-[9px] font-medium', active ? 'text-primary' : 'text-muted-foreground')}><Icon className="h-4 w-4" />{item.label}</Link>; })}
    <button type="button" onClick={() => setCommandOpen(true)} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-[6px] text-[9px] font-medium text-muted-foreground"><Search className="h-4 w-4" />Command</button>
  </nav>;
}
