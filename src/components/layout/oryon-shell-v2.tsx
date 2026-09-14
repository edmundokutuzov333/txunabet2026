'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { Activity, BarChart3, Bell, BookOpen, BriefcaseBusiness, CalendarDays, CheckSquare2, ChevronDown, FileText, FolderKanban, FormInput, Goal, Inbox, LayoutDashboard, Menu, MessageSquare, Network, Plus, Search, Settings2, ShieldAlert, ShieldCheck, Sparkles, Trophy, UserRound, Users, WalletCards, Workflow, X, Zap } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';
import { cn } from '@/lib/utils';
import AiAssistant from '@/components/ai-assistant';
import StartCallDialog from '@/components/start-call-dialog';
import TxunaLogo from '../icons/txuna-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OryonBadge } from '@/components/oryon-ui';

export type OryonShellNavItem = { href: string; label: string; icon: React.ElementType; permission?: string; description?: string };
type OryonSection = { title: string; items: OryonShellNavItem[] };
type ShellContextValue = { sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void; commandOpen: boolean; setCommandOpen: (open: boolean) => void };
const ShellContext = React.createContext<ShellContextValue | null>(null);

export function OryonShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen((value) => !value); }
      if (event.key === 'Escape') { setSidebarOpen(false); setCommandOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return <ShellContext.Provider value={{ sidebarOpen, setSidebarOpen, commandOpen, setCommandOpen }}>{children}</ShellContext.Provider>;
}

export function useOryonShell() {
  const context = React.useContext(ShellContext);
  if (!context) throw new Error('useOryonShell must be used inside OryonShellProvider');
  return context;
}

const sections: OryonSection[] = [
  { title: 'COMMAND', items: [
    { href: '/dashboard', label: 'Command Center', icon: LayoutDashboard, description: 'Visão executiva e operacional do dia.' },
    { href: '/dashboard/inbox', label: 'Inbox', icon: Inbox, description: 'Aprovações, alertas, pedidos e menções.' },
  ] },
  { title: 'BETTING OPERATIONS', items: [
    { href: '/dashboard/sportsbook', label: 'Sportsbook', icon: Trophy, description: 'Trading, handle, liability, hold e mercados.' },
    { href: '/dashboard/players', label: 'Players', icon: UserRound, description: 'Jogadores, KYC, valor e risco.' },
    { href: '/dashboard/payments', label: 'Payments', icon: WalletCards, description: 'Depósitos, levantamentos e PSPs.' },
    { href: '/dashboard/risk', label: 'Risk & Fraud', icon: ShieldAlert, description: 'Fraude, abuso, sinais e investigação.' },
    { href: '/dashboard/responsible-gaming', label: 'Responsible Gaming', icon: ShieldCheck, description: 'Protecção do jogador e intervenção.' },
    { href: '/dashboard/vip', label: 'CRM & VIP', icon: Users, description: 'Valor, retenção e carteira VIP.' },
    { href: '/dashboard/affiliates', label: 'Affiliates', icon: Network, description: 'CPA, RevShare e parceiros.' },
    { href: '/dashboard/support', label: 'Customer Support', icon: MessageSquare, description: 'Tickets e SLA de atendimento.' },
  ] },
  { title: 'WORK', items: [
    { href: '/dashboard/tasks', label: 'My Work', icon: CheckSquare2, description: 'Tarefas e execução pessoal.' },
    { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban, description: 'Projectos e iniciativas.' },
    { href: '/dashboard/goals', label: 'Goals', icon: Goal, description: 'Objectivos e progresso.' },
    { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays, description: 'Agenda e compromissos.' },
  ] },
  { title: 'COLLABORATE', items: [
    { href: '/dashboard/chat/general', label: 'Chat', icon: MessageSquare, description: 'Canais e conversas.' },
    { href: '/dashboard/meetings', label: 'Meetings', icon: BriefcaseBusiness, description: 'Reuniões e follow-up.' },
    { href: '/dashboard/team', label: 'People', icon: Users, description: 'Directório da empresa.' },
  ] },
  { title: 'KNOWLEDGE', items: [
    { href: '/dashboard/search', label: 'Search', icon: Search, description: 'Pesquisa unificada.' },
    { href: '/dashboard/documents', label: 'Docs', icon: FileText, description: 'Documentos e versões.' },
    { href: '/dashboard/cloud', label: 'Files', icon: BookOpen, description: 'Ficheiros e recursos.' },
  ] },
  { title: 'AUTOMATE', items: [
    { href: '/dashboard/workflows', label: 'Workflows', icon: Workflow, description: 'Orquestração e execução.' },
    { href: '/dashboard/automations', label: 'Automations', icon: Zap, description: 'Alertas e automações.' },
    { href: '/dashboard/forms', label: 'Forms', icon: FormInput, description: 'Entrada estruturada.' },
  ] },
  { title: 'INTELLIGENCE', items: [
    { href: '/dashboard/oryon-ai', label: 'OryonAI', icon: Sparkles, description: 'Inteligência operacional.' },
    { href: '/dashboard/pulse', label: 'Pulse', icon: Activity, description: 'Sinais de saúde.' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, description: 'KPIs e tendências.' },
  ] },
  { title: 'ENTERPRISE', items: [
    { href: '/dashboard/admin/enterprise', label: 'Admin', icon: Network, permission: 'company.admin', description: 'Governance empresarial.' },
    { href: '/dashboard/security', label: 'Security', icon: ShieldCheck, permission: 'company.admin', description: 'Segurança da conta.' },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings2, description: 'Configurações.' },
  ] },
];
const allNav = sections.flatMap((section) => section.items);
const departmentSlugs = ['marketing','finance','hr','it','operations','compliance','security','trading','payments','risk','responsible-gaming','crm-vip','customer-support','product','data-bi','legal','affiliate','procurement','strategy'];
const departmentLabels: Record<string, string> = { 'responsible-gaming':'Responsible Gaming','crm-vip':'CRM & VIP','customer-support':'Customer Support','data-bi':'Data & BI' };

function canAccess(identity: { role?: string; permissions: string[] } | null, loading: boolean, permission?: string) {
  if (!permission) return true;
  if (loading || !identity) return false;
  return identity.role === 'owner' || identity.role === 'admin' || identity.permissions.includes(permission);
}

function NavItem({ item, close }: { item: OryonShellNavItem; close: () => void }) {
  const pathname = usePathname();
  const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
  const Icon = item.icon;
  return <Link href={item.href} onClick={close} title={item.description} className={cn('relative flex h-9 items-center gap-2.5 rounded-[7px] px-2.5 text-[12px] transition-colors', active ? 'bg-primary/[0.10] text-foreground' : 'text-muted-foreground hover:bg-surface-1 hover:text-foreground')}><span className={cn('absolute left-0 top-2 bottom-2 w-0.5 rounded-full', active ? 'bg-primary' : 'bg-transparent')} /><Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} /><span className="min-w-0 flex-1 truncate">{item.label}</span></Link>;
}

function DepartmentContext({ close }: { close: () => void }) {
  const pathname = usePathname();
  const current = departmentSlugs.find((slug) => pathname.startsWith(`/dashboard/departments/${slug}`));
  return <details className="group rounded-[8px] border border-border bg-surface-1"><summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2"><span className="grid h-6 w-6 place-items-center rounded-[6px] bg-primary/10 text-primary"><Users className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Department Context</span><span className="block truncate text-[12px] font-medium">{current ? departmentLabels[current] ?? current : 'All departments'}</span></span><ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" /></summary><div className="max-h-[360px] overflow-y-auto border-t border-border p-1"><Link href="/dashboard/departments" onClick={close} className={cn('block rounded-[6px] px-2 py-2 text-[12px]', !current && 'bg-primary/10 text-primary')}>All departments</Link>{departmentSlugs.map((slug) => <Link key={slug} href={`/dashboard/departments/${slug}`} onClick={close} className={cn('block rounded-[6px] px-2 py-2 text-[12px] text-muted-foreground hover:bg-surface-2 hover:text-foreground', current === slug && 'bg-primary/10 text-primary')}>{departmentLabels[slug] ?? slug}</Link>)}</div></details>;
}

function SidebarContent() {
  const auth = useAuth(); const { user } = useUser(); const { identity, loading } = useEnterpriseIdentity(); const { setSidebarOpen } = useOryonShell();
  const displayName = user?.displayName || identity?.email?.split('@')[0] || 'Utilizador';
  return <aside className="flex h-full w-[278px] flex-col border-r border-border bg-surface-0/98"><div className="flex h-[68px] shrink-0 items-center border-b border-border px-4"><Link href="/dashboard" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5"><TxunaLogo className="h-9 w-auto"/><span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground xl:block">Oryon Enterprise</span></Link></div><div className="shrink-0 border-b border-border p-3"><DepartmentContext close={() => setSidebarOpen(false)} /></div><nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">{sections.map((section) => <section key={section.title} className="mb-4"><p className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">{section.title}</p><div className="grid gap-0.5">{section.items.map((item) => canAccess(identity, loading, item.permission) ? <NavItem key={item.href} item={item} close={() => setSidebarOpen(false)} /> : null)}</div></section>)}</nav><div className="shrink-0 border-t border-border p-3"><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="flex w-full items-center gap-2.5 rounded-[8px] p-2 text-left hover:bg-surface-1"><Avatar className="h-8 w-8 rounded-[8px] border border-border"><AvatarImage src={user?.photoURL ?? undefined} /><AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium">{displayName}</span><span className="block truncate text-[10px] text-muted-foreground">{identity?.role ?? 'member'}</span></span></button></DropdownMenuTrigger><DropdownMenuContent side="top" align="end"><DropdownMenuItem asChild><Link href="/dashboard/profile">Perfil</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/dashboard/settings">Settings</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => void signOut(auth)}>Terminar sessão</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></aside>;
}

export function AppSidebar() {
  const { sidebarOpen, setSidebarOpen } = useOryonShell();
  return <><div className="hidden h-full md:block"><SidebarContent /></div>{sidebarOpen ? <div className="fixed inset-0 z-50 md:hidden"><button type="button" aria-label="Fechar navegação" className="absolute inset-0 bg-black/55" onClick={() => setSidebarOpen(false)} /><div className="relative h-full w-fit"><SidebarContent /></div></div> : null}</>;
}

function CommandMenu() {
  const { commandOpen, setCommandOpen } = useOryonShell(); const [query, setQuery] = React.useState(''); const filtered = allNav.filter((item) => `${item.label} ${item.description ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 20);
  return <Dialog open={commandOpen} onOpenChange={setCommandOpen}><DialogContent><DialogHeader><DialogTitle>Command</DialogTitle></DialogHeader><div className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2"><Search className="h-4 w-4 text-muted-foreground"/><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Pesquisar no Oryon…"/></div><div className="max-h-[420px] overflow-y-auto py-2">{filtered.map((item) => <Link key={item.href} href={item.href} onClick={() => setCommandOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-1"><item.icon className="h-4 w-4 text-primary"/><span><span className="block text-sm font-medium">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span></Link>)}{filtered.length===0?<p className="p-6 text-center text-xs text-muted-foreground">Nenhum resultado.</p>:null}</div></DialogContent></Dialog>;
}

function Notifications() {
  const [open, setOpen] = React.useState(false); const [items, setItems] = React.useState<Array<{id:string;title:string;body:string;read:boolean}>>([]);
  React.useEffect(() => { fetch('/api/notifications',{credentials:'include',cache:'no-store'}).then((response)=>response.json()).then((payload)=>setItems(Array.isArray(payload.notifications)?payload.notifications.map((item:any,index:number)=>({id:String(item.id??index),title:String(item.title??'Nova actividade'),body:String(item.message??item.body??''),read:Boolean(item.read)})):[])).catch(()=>setItems([])); },[]);
  return <div className="relative"><Button variant="ghost" size="icon" onClick={()=>setOpen((v)=>!v)} aria-label="Notificações"><Bell className="h-4 w-4"/>{items.some((item)=>!item.read)?<span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary"/>:null}</Button>{open?<div className="absolute right-0 top-10 z-50 w-[min(400px,calc(100vw-32px))] rounded-xl border border-border bg-surface-1 p-2 shadow-xl">{items.length?<div className="max-h-[420px] overflow-y-auto">{items.map((item)=><div key={item.id} className={cn('rounded-lg p-3',!item.read&&'bg-primary/[0.05]')}><p className="text-xs font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.body}</p></div>)}</div>:<p className="p-8 text-center text-xs text-muted-foreground">Sem notificações.</p>}</div>:null}</div>;
}

export function Header() {
  const pathname = usePathname(); const { setSidebarOpen, setCommandOpen } = useOryonShell(); const [aiOpen,setAiOpen]=React.useState(false); const [callOpen,setCallOpen]=React.useState(false); const label=allNav.slice().sort((a,b)=>b.href.length-a.href.length).find((item)=>pathname.startsWith(item.href))?.label??'Oryon';
  return <><header className="sticky top-0 z-30 grid min-h-[68px] shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-surface-0/90 px-3 backdrop-blur-xl sm:px-4"><Button variant="ghost" size="icon" className="md:hidden" onClick={()=>setSidebarOpen(true)} aria-label="Abrir navegação"><Menu className="h-4 w-4"/></Button><div className="hidden items-center gap-2 md:flex text-[11px]"><span className="text-muted-foreground">Oryon</span><span className="text-muted-foreground/40">/</span><span className="font-medium">{label}</span></div><button type="button" onClick={()=>setCommandOpen(true)} className="mx-auto flex h-9 min-w-0 w-full max-w-[620px] items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 text-left"><Search className="h-4 w-4 text-muted-foreground"/><span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">Pesquisar no Oryon…</span><kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground sm:inline">⌘ K</kbd></button><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={()=>setAiOpen(true)} aria-label="OryonAI"><Sparkles className="h-4 w-4 text-primary"/></Button><Notifications/><Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={()=>setCallOpen(true)}>Call</Button><DropdownMenu><DropdownMenuTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5"/><span className="hidden sm:inline">Create</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href="/dashboard/tasks">Nova tarefa</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/dashboard/projects">Novo projecto</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/dashboard/document-editor">Novo documento</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/dashboard/sportsbook">Abrir Sportsbook</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header><CommandMenu/><AiAssistant isOpen={aiOpen} onOpenChange={setAiOpen}/><StartCallDialog isOpen={callOpen} onOpenChange={setCallOpen}/></>;
}

export function MobileBottomNav() { const pathname=usePathname(); const {setCommandOpen}=useOryonShell(); const items=[{href:'/dashboard',label:'Home',icon:LayoutDashboard},{href:'/dashboard/tasks',label:'Work',icon:CheckSquare2},{href:'/dashboard/sportsbook',label:'Betting',icon:Trophy},{href:'/dashboard/inbox',label:'Inbox',icon:Inbox}]; return <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface-0/95 px-1 pb-[max(env(safe-area-inset-bottom),4px)] pt-1 backdrop-blur-xl md:hidden">{items.map((item)=>{const active=item.href==='/dashboard'?pathname===item.href:pathname.startsWith(item.href);return <Link key={item.href} href={item.href} className={cn('flex min-h-12 flex-col items-center justify-center gap-1 rounded text-[9px] font-medium',active?'text-primary':'text-muted-foreground')}><item.icon className="h-4 w-4"/>{item.label}</Link>})}<button type="button" onClick={()=>setCommandOpen(true)} className="flex min-h-12 flex-col items-center justify-center gap-1 text-[9px] font-medium text-muted-foreground"><Search className="h-4 w-4"/>Command</button></nav>; }
