'use client';

import {
  Activity, BarChart3, Book, Briefcase, Calendar, Cloud, FileText, FormInput, Gamepad2, GaugeCircle,
  Inbox as InboxIcon, LineChart, Megaphone, MessagesSquare, MoreVertical, PencilRuler, PieChart, Plug,
  Radio, Search, Server, Settings as SettingsIcon, Shield, ShieldCheck, Sparkles, Target, User,
  UserCog, Users, Video, Workflow, Bot, Goal, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';
import { motion } from 'framer-motion';
import TxunaLogo from '../icons/txuna-logo';
import { useState } from 'react';

type NavItem = { href: string; label: string; icon: React.ElementType; permission?: string };
type NavSection = { title: string; items: NavItem[] };

const statusClasses: Record<string, string> = {
  online: 'bg-green-500', away: 'bg-yellow-500', busy: 'bg-red-500', dnd: 'bg-purple-500', offline: 'bg-slate-500',
};

const sections: NavSection[] = [
  {
    title: 'WORK OS',
    items: [
      { href: '/dashboard', label: 'Command Center', icon: GaugeCircle },
      { href: '/dashboard/search', label: 'Search Oryon', icon: Search },
      { href: '/dashboard/inbox', label: 'Inbox', icon: InboxIcon },
      { href: '/dashboard/workspaces', label: 'Workspaces', icon: Briefcase, permission: 'operations.read' },
      { href: '/dashboard/projects', label: 'Projects', icon: Briefcase, permission: 'operations.read' },
      { href: '/dashboard/tasks', label: 'Tasks', icon: Target, permission: 'operations.read' },
      { href: '/dashboard/goals', label: 'Goals', icon: Goal, permission: 'operations.read' },
      { href: '/dashboard/meetings', label: 'Meetings Intelligence', icon: Video, permission: 'operations.read' },
      { href: '/dashboard/calendar', label: 'Calendar Intelligence', icon: Calendar, permission: 'operations.read' },
      { href: '/dashboard/team', label: 'Directory', icon: Users, permission: 'users.read' },
      { href: '/dashboard/cloud', label: 'Files', icon: Cloud, permission: 'files.read' },
      { href: '/dashboard/documents', label: 'Documents', icon: FileText, permission: 'documents.read' },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { href: '/dashboard/chat/general', label: 'Chat', icon: MessagesSquare, permission: 'chat.read' },
      { href: '/dashboard/chat/department', label: 'Department channels', icon: Users, permission: 'chat.read' },
      { href: '/dashboard/chat/direct', label: 'Direct messages', icon: MessagesSquare, permission: 'chat.read' },
      { href: '/dashboard/collaboration', label: 'Whiteboard + Clips', icon: PencilRuler, permission: 'operations.read' },
    ],
  },
  {
    title: 'KNOWLEDGE',
    items: [
      { href: '/dashboard/knowledge-base', label: 'Knowledge Base', icon: Book, permission: 'knowledge.read' },
      { href: '/dashboard/search', label: 'Knowledge Search', icon: Search, permission: 'knowledge.read' },
      { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, permission: 'reporting.read' },
    ],
  },
  {
    title: 'AUTOMATION OS',
    items: [
      { href: '/dashboard/forms', label: 'Forms', icon: FormInput, permission: 'operations.read' },
      { href: '/dashboard/workflows', label: 'Visual Workflows', icon: Workflow, permission: 'automation.read' },
      { href: '/dashboard/automations', label: 'Automations', icon: Bot, permission: 'automation.read' },
      { href: '/dashboard/automation-observability', label: 'Execution Observability', icon: Activity, permission: 'automation.read' },
      { href: '/dashboard/integrations', label: 'Integrations', icon: Plug, permission: 'automation.read' },
      { href: '/dashboard/marketplace', label: 'Automation Marketplace', icon: Sparkles, permission: 'automation.read' },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { href: '/dashboard/oryon-ai', label: 'OryonAI', icon: Sparkles },
      { href: '/dashboard/analytics', label: 'Analytics', icon: PieChart, permission: 'reporting.read' },
      { href: '/dashboard/pulse', label: 'Oryon Pulse', icon: Radio, permission: 'operations.read' },
    ],
  },
  {
    title: 'ENTERPRISE',
    items: [
      { href: '/dashboard/admin/enterprise', label: 'Admin Center', icon: Server, permission: 'company.admin' },
      { href: '/dashboard/observability', label: 'Observability', icon: Activity, permission: 'operations.read' },
      { href: '/dashboard/security', label: 'Security', icon: ShieldCheck, permission: 'company.admin' },
      { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

const departmentItems: NavItem[] = [
  { href: '/dashboard/departments/marketing', label: 'Marketing', icon: Megaphone, permission: 'marketing.read' },
  { href: '/dashboard/departments/finance', label: 'Finance', icon: LineChart, permission: 'operations.read' },
  { href: '/dashboard/departments/hr', label: 'HR', icon: Users, permission: 'users.read' },
  { href: '/dashboard/departments/it', label: 'IT', icon: Server, permission: 'operations.read' },
  { href: '/dashboard/departments/operations', label: 'Operations', icon: SettingsIcon, permission: 'operations.read' },
  { href: '/dashboard/departments/compliance', label: 'Compliance', icon: Shield, permission: 'operations.read' },
  { href: '/dashboard/departments/security', label: 'Security', icon: ShieldCheck, permission: 'company.admin' },
];

function NavLink({ item, allowed }: { item: NavItem; allowed: boolean }) {
  const pathname = usePathname();
  if (!allowed) return null;
  const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <div className={cn('flex items-center p-2 rounded-lg text-sm transition-all text-foreground/80 hover:bg-muted/50 relative', active && 'bg-primary/20 text-primary font-medium')}>
        <Icon className="mr-3 w-5 h-5 flex-shrink-0" />
        <span className="flex-grow truncate">{item.label}</span>
      </div>
    </Link>
  );
}

export default function AppSidebar() {
  const auth = useAuth();
  const { user } = useUser();
  const { identity, loading } = useEnterpriseIdentity();
  const [departmentsOpen, setDepartmentsOpen] = useState(false);

  const allowed = (permission?: string) => {
    if (!permission) return true;
    if (loading || !identity) return false;
    if (identity.role === 'owner' || identity.role === 'admin') return true;
    return identity.permissions.includes(permission);
  };

  const displayName = identity?.email?.split('@')[0] || user?.displayName || user?.email || 'Utilizador';
  const role = identity?.role || 'Utilizador';
  const status = 'online';

  return (
    <aside className="w-64 h-full flex flex-col flex-shrink-0 gradient-surface shadow-2xl transition-all duration-300 fixed md:relative z-40 md:translate-x-0 -translate-x-full">
      <div className="p-6 flex flex-col justify-center h-24 border-b border-border pl-6">
        <Link href="/dashboard" className="block w-fit">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, ease: 'easeOut' }}>
            <TxunaLogo className="w-40 h-12" />
          </motion.div>
        </Link>
        <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, delay: .1, ease: 'easeOut' }} className="text-xs text-muted-foreground mt-1">Powered by ORYON.</motion.p>
      </div>

      <nav className="flex-grow p-4 overflow-y-auto custom-scrollbar">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">{section.title}</h2>
            <div className="space-y-1">
              {section.items.map((item) => <NavLink key={item.href} item={item} allowed={allowed(item.permission)} />)}
            </div>
          </div>
        ))}

        <div className="mb-6">
          <button type="button" onClick={() => setDepartmentsOpen((open) => !open)} className="w-full flex items-center justify-between text-sm font-semibold mb-3 text-muted-foreground uppercase">
            <span>DEPARTMENTS</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', departmentsOpen && 'rotate-180')} />
          </button>
          {departmentsOpen ? <div className="space-y-1">{departmentItems.map((item) => <NavLink key={item.href} item={item} allowed={allowed(item.permission)} />)}</div> : null}
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-primary">
              <AvatarImage src={user?.photoURL ?? undefined} alt={displayName} />
              <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className={cn('absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-card', statusClasses[status])} />
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{role}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-muted/50 text-foreground/80"><MoreVertical className="h-5 w-5" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuItem asChild><Link href="/dashboard/profile"><User className="mr-2 h-4 w-4" /><span>Profile</span></Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/dashboard/settings"><SettingsIcon className="mr-2 h-4 w-4" /><span>Settings</span></Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void signOut(auth)}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
