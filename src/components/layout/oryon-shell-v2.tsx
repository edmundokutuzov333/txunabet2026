'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Activity, BarChart3, Bell, BookOpen, BriefcaseBusiness, CalendarDays, CheckSquare2, ChevronDown, CreditCard, FileText, FolderKanban, FormInput, Goal, Inbox, LayoutDashboard, Menu, MessageSquare, MoreHorizontal, Network, Plus, Search, Settings2, ShieldAlert, ShieldCheck, Sparkles, Trophy, UserRound, Users, WalletCards, Workflow, X, Zap } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';
import { cn } from '@/lib/utils';
import AiAssistant from '@/components/ai-assistant';
import StartCallDialog from '@/components/start-call-dialog';
import TxunaLogo from '../icons/txuna-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { OryonButton, OryonDialog, OryonIconButton, OryonPopover, type NotificationItem } from '@/components/oryon-ui';

export type OryonShellNavItem = { href: string; label: string; icon: React.ElementType; permission?: string; description?: string };
type OryonSection = { title: string; items: OryonShellNavItem[] };
type ShellContextValue = { sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void; commandOpen: boolean; setCommandOpen: (open: boolean) => void };
const ShellContext = React.createContext<ShellContextValue | null>(null);

export function OryonShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen((value) => !value); }
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return <ShellContext.Provider value={{ sidebarOpen, setSidebarOpen, commandOpen, setCommandOpen }}>{children}</ShellContext.Provider>;
}

export function useOryonShell() { const value = React.useContext(ShellContext); if (!value) throw new Error('useOryonShell must be used inside OryonShellProvider'); return value; }

const sections: OryonSection[] = [
  { title: 'COMMAND', items: [
    { href: '/dashboard', label: 'Command Center', icon: LayoutDashboard, description: 'Visão operacional do dia e indicadores executivos.' },
    { href: '/dashboard/inbox', label: 'Inbox', icon: Inbox, description: 'Tudo o que pede atenção, aprovação ou resposta.' },
  ] },
  { title: 'BETTING OPERATIONS', items: [
    { href: '/dashboard/sportsbook', label: 'Sportsbook', icon: Trophy, description: 'Trading, odds, handle, liability e hold.' },
    { href: '/dashboard/players', label: 'Players', icon: UserRound, description: 'Contas, KYC, segmentos, LTV e estado.' },
    { href: '/dashboard/payments', label: 'Payments', icon: WalletCards, description: 'Depósitos, levantamentos, PSPs e reconciliação.' },
    { href: '/dashboard/risk', label: 'Risk & Fraud', icon: ShieldAlert, description: 'Risco de jogador, fraude e abuso.' },
    { href: '/dashboard/responsible-gaming', label: 'Responsible Gaming', icon: ShieldCheck, description: 'Protecção do jogador e intervenções.' },
    { href: '/dashboard/vip', label: 'CRM & VIP', icon: Users, description: 'Valor, retenção, tiers e carteira VIP.' },
    { href: '/dashboard/affiliates', label: 'Affiliates', icon: Network, description: 'Parceiros, CPA, RevShare e compliance.' },
    { href: '/dashboard/support', label: 'Customer Support', icon: MessageSquare, description: 'Tickets, SLAs e atendimento.' },
  ] },
  { title: 'WORK', items: [
    { href: '/dashboard/tasks', label: 'My Work', icon: CheckSquare2, permission: 'operations.read', description: 'Tarefas, prioridades e execução.' },
    { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban, permission: 'operations.read', description: 'Projectos e equipas de entrega.' },
    { href: '/dashboard/goals', label: 'Goals', icon: Goal, permission: 'operations.read', description: 'Objectivos e progresso operacional.' },
    { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays, permission: 'operations.read', description: 'Agenda, reuniões e compromissos.' },
  ] },
  { title: 'COLLABORATE', items: [
    { href: '/dashboard/chat/general', label: 'Chat', icon: MessageSquare, permission: 'chat.read', description: 'Canais e conversas de trabalho.' },
    { href: '/dashboard/meetings', label: 'Meetings', icon: BriefcaseBusiness, permission: 'operations.read', description: 'Reuniões e inteligência de reunião.' },
    { href: '/dashboard/team', label: 'People', icon: Users, permission: 'users.read', description: 'Directório e contexto de pessoas.' },
  ] },
  { title: 'KNOWLEDGE', items: [
    { href: '/dashboard/search', label: 'Search', icon: Search, description: 'Pesquisa unificada no Oryon.' },
    { href: '/dashboard/documents', label: 'Docs', icon: FileText, permission: 'documents.read', description: 'Documentos, versões e conhecimento.' },
    { href: '/dashboard/cloud', label: 'Files', icon: BookOpen, permission: 'files.read', description: 'Ficheiros e recursos da empresa.' },
  ] },
  { title: 'AUTOMATE', items: [
    { href: '/dashboard/workflows', label: 'Workflows', icon: Workflow, permission: 'automation.read', description: 'Orquestração de processos.' },
    { href: '/dashboard/automations', label: 'Automations', icon: Zap, permission: 'automation.read', description: 'Automações recorrentes e alertas.' },
    { href: '/dashboard/forms', label: 'Forms', icon: FormInput, permission: 'operations.read', description: 'Entrada estruturada de trabalho.' },
  ] },
  { title: 'INTELLIGENCE', items: [
    { href: '/dashboard/oryon-ai', label: 'OryonAI', icon: Sparkles, description: 'Inteligência operacional.' },
    { href: '/dashboard/pulse', label: 'Pulse', icon: Activity, permission: 'operations.read', description: 'Sinais e saúde operacional.' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, permission: 'reporting.read', description: 'Performance, tendências e KPIs.' },
  ] },
  { title: 'ENTERPRISE', items: [
    { href: '/dashboard/admin/enterprise', label: 'Admin', icon: Network, permission: 'company.admin', description: 'Controlo empresarial e configuração.' },
    { href: '/dashboard/security', label: 'Security', icon: ShieldCheck, permission: 'company.admin', description: 'Segurança, acessos e políticas.' },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings2, description: 'Preferências da plataforma.' },
  ] },
];
const allNav = sections.flatMap((section) => section.items);
const departments = ['marketing','finance','hr','it','operations','compliance','security','trading','payments','risk','responsible-gaming','crm-vip','customer-support','product','data-bi','legal','affiliate','procurement','strategy'];
const departmentLabels: Record<string, string> = { 'responsible-gaming': 'Responsible Gaming', 'crm-vip': 'CRM & VIP', 'customer-support': 'Customer Support', 'data-bi': 'Data & BI' };

function allowed(identity: { role?: string; permissions: string[] } | null, loading: boolean, permission?: string) { if (!permission) return true; if (loading || !identity) return false; return identity.role === 'owner' || identity.role === 'admin' || identity.permissions.includes(permission); }

function NavItem({ item, closeMobile, canAccess }: { item: OryonShellNavItem; closeMobile: () => void; canAccess: boolean }) {
  const pathname = usePathname(); const reduced = useReducedMotion(); const [preview, setPreview] = React.useState(false); if (!canAccess) return null;
  const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href); const Icon = item.icon;
  return <div className="relative" onMouseEnter={() => setPreview(true)} onMouseLeave={() => setPreview(false)}><Link href={item.href} onClick={closeMobile}><span className={cn('relative flex h-9 items-center gap-2.5 rounded-[7px] px-2.5 text-[12px] transition-colors', active ? 'bg-primary/[0.10] text-foreground' : 'text-muted-foreground hover:bg-surface-1 hover:text-foreground')}>{active ? <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"/> : null}<Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}/><span className="min-w-0 flex-1 truncate">{item.label}</span></span></Link>{preview && item.description ? <motion.div initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="pointer-events-none absolute left-[calc(100%+10px)] top-0 z-50 hidden w-60 rounded-[10px] border border-border bg-surface-3 p-3 shadow-lg lg:block"><p className="text-[12px] font-semibold">{item.label}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.description}</p></motion.div> : null}</div>;
}

function DepartmentContext({ closeMobile }: { closeMobile: () => void }) {
  const pathname = usePathname();
  const current = departments.find((slug) => pathname.startsWith(`/dashboard/departments/${slug}`));
  return <OryonPopover trigger={<button type="button" className="flex w-full items-center gap-2 rounded-[8px] border border-border bg-surface-1 px-2.5 py-2 text-left hover:border-border-strong"><span className="grid h-6 w-6 place-items-center rounded-[6px] bg-primary/10 text-primary"><Users className="h-3.5 w-3.5"/></span><span className="min-w-0 flex-1"><span className="block text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Department Context</span><span className="block truncate text-[12px] font-medium">{current ? departmentLabels[current] ?? current : 'All departments'}</span></span><ChevronDown className="h-3.5 w-3.5 text-muted-foreground"/></button>}><div className="w-[230px] max-h-[440px] overflow-y-auto p-1"><p className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Department context</p><Link href="/dashboard" onClick={closeMobile} className={cn('block rounded-[6px] px-2 py-2 text-[12px]', !current && 'bg-primary/10 text-primary')}>All departments</Link>{departments.map((slug) => <Link key={slug} href={`/dashboard/departments/${slug}`} onClick={closeMobile} className={cn('block rounded-[6px] px-2 py-2 text-[12px] capitalize text-muted-foreground hover:bg-surface-1 hover:text-foreground', current === slug && 'bg-primary/10 text-primary')}>{departmentLabels[slug] ?? slug}</Link>)}</div></OryonPopover>;
}

export function AppSidebar() {
  const auth = useAuth(); const { user } = useUser(); const { identity, loading } = useEnterpriseIdentity(); const { sidebarOpen, setSidebarOpen } = useOryonShell(); const reduced = useReducedMotion();
  const displayName = user?.displayName || identity?.email?.split('@')[0] || 'Utilizador'; const role = identity?.role || 'member';
  const content = <aside className="flex h-full w-[278px] flex-col border-r border-border bg-surface-0/98"><div className="flex h-[68px] shrink-0 items-center border-b border-border px-4"><Link href="/dashboard" onClick={() => setSidebarOpen(false)} className="flex min-w-0 items-center gap-2.5"><TxunaLogo className="h-9 w-auto"/><span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground xl:block">Oryon Enterprise</span></Link><OryonIconButton className="ml-auto md:hidden" label="Fechar navegação" size="sm" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4"/></OryonIconButton></div><div className="shrink-0 border-b border-border p-3"><DepartmentContext closeMobile={() => setSidebarOpen(false)}/></div><nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">{sections.map((section) => <div key={section.title} className="mb-4"><p className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">{section.title}</p><div className="grid gap-0.5">{section.items.map((item) => <NavItem key={item.href} item={item} closeMobile={() => setSidebarOpen(false)} canAccess={allowed(identity, loading, item.permission)}/>)}</div></div>)}</nav><div className="shrink-0 border-t border-border p-3"><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="flex w-full items-center gap-2.5 rounded-[8px] p-2 text-left hover:bg-surface-1"><Avatar className="h-8 w-8 rounded-[8px] border border-border"><AvatarImage src={user?.photoURL ?? undefined}/><AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium">{displayName}</span><span className="block truncate text-[10px] text-muted-foreground">{role}</span></span><MoreHorizontal className="h-4 w-4 text-muted-foreground"/></button></DropdownMenuTrigger><DropdownMenuContent side="top" align="end"><DropdownMenuItem asChild><Link href="/dashboard/profile">Perfil</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/dashboard/settings">Settings</Link></DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onSelect={() => void signOut(auth)}>Terminar sessão</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></aside>;
  return <><div className="hidden h-full md:block">{content}</div><AnimatePresence>{sidebarOpen ? <><motion.button type="button" aria-label="Fechar navegação" className="fixed inset-0 z-40 bg-black/55 md:hidden" onClick={() => setSidebarOpen(false)} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/><motion.div className="fixed inset-y-0 left-0 z-50 md:hidden" initial={reduced ? false : { x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 420, damping: 38 }}>{content}</motion.div></> : null}</AnimatePresence></>;
}

function CommandMenu() {
  const { commandOpen, setCommandOpen } = useOryonShell(); const [query, setQuery] = React.useState(''); const q = query.trim().toLowerCase();
  const nav = allNav.filter((item) => !q || `${item.label} ${item.description ?? ''}`.toLowerCase().includes(q)).slice(0, 14);
  return <OryonDialog open={commandOpen} onOpenChange={setCommandOpen} title="Command" description="Pesquisa e execução rápida no Oryon."><div className="flex h-10 items-center gap-2 rounded-[8px] border border-border bg-surface-1 px-3"><Search className="h-4 w-4 text-muted-foreground"/><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar trabalho, betting, pessoas ou comandos…" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></div><div className="mt-3 max-h-[420px] overflow-y-auto">{nav.map((item) => <Link key={item.href} href={item.href} onClick={() => setCommandOpen(false)} className="flex items-center gap-3 rounded-[8px] p-3 hover:bg-surface-1"><item.icon className="h-4 w-4 text-primary"/><div><p className="text-[12px] font-medium">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.description}</p></div></Link>)}{!nav.length && <p className="p-8 text-center text-xs text-muted-foreground">Nenhum resultado.</p>}</div></OryonDialog>;
}

function Notifications() {
  const [items, setItems] = React.useState<NotificationItem[]>([]); const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { fetch('/api/notifications',{credentials:'include',cache:'no-store'}).then((r)=>r.json()).then((p)=>setItems(Array.isArray(p.notifications)?p.notifications.map((n:any,i:number)=>({id:String(n.id??i),actor:{name:n.actorName??'Oryon'},kind:n.type??'created',body:[n.message??n.title??'Nova actividade'],time:'recentemente',context:n.entity?[n.entity]:undefined,unread:!n.read}))):[]).catch(()=>setItems([])).finally(()=>setLoading(false)); },[]);
  return <OryonPopover trigger={<span className="relative"><OryonIconButton label="Notificações"><Bell className="h-4 w-4"/>{items.some((item)=>item.unread)?<span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary"/>:null}</OryonIconButton></span>}><div className="w-[min(420px,calc(100vw-32px))]">{loading?<div className="p-8 text-center text-xs text-muted-foreground">A carregar…</div>:<div className="max-h-[440px] overflow-y-auto">{items.length?<div className="p-2">{items.map((item)=><div key={item.id} className={cn('rounded-lg p-3',item.unread&&'bg-primary/[0.05]')}><p className="text-[12px] font-medium">{item.actor.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.body.map((part)=>typeof part==='string'?part:'').join('')}</p></div>)}</div>:<div className="p-8 text-center text-xs text-muted-foreground">Sem notificações.</div>}</div>}</div></OryonPopover>;
}

export function Header() {
  const pathname = usePathname(); const { setSidebarOpen, setCommandOpen } = useOryonShell(); const [aiOpen,setAiOpen]=React.useState(false); const [callOpen,setCallOpen]=React.useState(false);
  const label = [...allNav].sort((a,b)=>b.href.length-a.href.length).find((item)=>pathname.startsWith(item.href))?.label ?? 'Oryon';
  return <><header className="sticky top-0 z-30 grid min-h-[68px] shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-surface-0/90 px-3 backdrop-blur-xl sm:px-4 lg:px-5"><OryonIconButton className="md:hidden" label="Abrir navegação" onClick={()=>setSidebarOpen(true)}><Menu className="h-4 w-4"/></OryonIconButton><div className="hidden items-center gap-2 md:flex"><span className="text-[11px] text-muted-foreground">Oryon</span><span className="text-muted-foreground/40">/</span><span className="text-[11px] font-medium capitalize">{label}</span></div><button type="button" onClick={()=>setCommandOpen(true)} className="mx-auto flex h-9 min-w-0 w-full max-w-[620px] items-center gap-2.5 rounded-[8px] border border-border bg-surface-1 px-3 text-left hover:border-border-strong"><Search className="h-4 w-4 text-muted-foreground"/><span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">Pesquisar no Oryon…</span><kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground sm:inline">⌘ K</kbd></button><div className="flex items-center gap-1.5"><OryonButton variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Abrir OryonAI" onClick={()=>setAiOpen(true)}><Sparkles className="h-4 w-4 text-primary"/></OryonButton><Notifications/><OryonButton className="hidden sm:inline-flex" size="sm" onClick={()=>setCallOpen(true)}>Call</OryonButton><DropdownMenu><DropdownMenuTrigger asChild><OryonButton size="sm"><Plus className="h-3.5 w-3.5"/><span className="hidden sm:inline">Create</span></OryonButton></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href="/dashboard/tasks">Nova tarefa</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/dashboard/projects">Novo projecto</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/dashboard/document-editor">Novo documento</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/dashboard/sportsbook">Abrir Sportsbook</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header><CommandMenu/><AiAssistant isOpen={aiOpen} onOpenChange={setAiOpen}/><StartCallDialog isOpen={callOpen} onOpenChange={setCallOpen}/></>;
}

export function MobileBottomNav() { const pathname=usePathname(); const {setCommandOpen}=useOryonShell(); const items=[{href:'/dashboard',label:'Home',icon:LayoutDashboard},{href:'/dashboard/tasks',label:'Work',icon:CheckSquare2},{href:'/dashboard/sportsbook',label:'Betting',icon:Trophy},{href:'/dashboard/inbox',label:'Inbox',icon:Inbox}]; return <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface-0/95 px-1 pb-[max(env(safe-area-inset-bottom),4px)] pt-1 backdrop-blur-xl md:hidden">{items.map((item)=>{const active=item.href==='/dashboard'?pathname===item.href:pathname.startsWith(item.href);return <Link key={item.href} href={item.href} className={cn('flex min-h-12 flex-col items-center justify-center gap-1 rounded text-[9px] font-medium',active?'text-primary':'text-muted-foreground')}><item.icon className="h-4 w-4"/>{item.label}</Link>})}<button type="button" onClick={()=>setCommandOpen(true)} className="flex min-h-12 flex-col items-center justify-center gap-1 text-[9px] font-medium text-muted-foreground"><Search className="h-4 w-4"/>Command</button></nav>; }
