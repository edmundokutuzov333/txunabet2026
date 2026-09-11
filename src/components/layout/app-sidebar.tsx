

'use client';
import {
  GaugeCircle,
  ListTodo,
  Network,
  Video,
  Calendar,
  Users,
  Cloud,
  Plus,
  Megaphone,
  LineChart,
  User,
  Server,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  MessagesSquare,
  Book,
  Folder,
  BarChart3,
  PieChart,
  Workflow,
  Bot,
  Plug,
  FileText,
  UserCog,
  MoreVertical,
  LogOut,
  Briefcase,
  Radio,
  Target, // Campaign Icon
  Gamepad2, // Game Operations Icon
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { departments, menuItems, users as mockUsers } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { ROLES } from '@/config/roles';
import { motion } from 'framer-motion';
import TxunaLogo from '../icons/txuna-logo';


const statusClasses: { [key: string]: string } = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  dnd: 'bg-purple-500',
  offline: 'bg-slate-500',
};

const iconMap: { [key: string]: React.ElementType } = {
  dashboard: GaugeCircle,
  pulse: Radio,
  workspaces: Briefcase,
  tasks: ListTodo,
  campaigns: Target,
  operations: Gamepad2,
  meetings: Video,
  calendar: Calendar,
  team: Users,
  cloud: Cloud,
  documents: FileText,
  'departments/marketing': Megaphone,
  'departments/finance': LineChart,
  'departments/hr': Users,
  'departments/it': Server,
  'departments/operations': SettingsIcon,
  'departments/compliance': Shield,
  'departments/security': ShieldCheck,
  'chat/general': MessagesSquare,
  'chat/department': Users,
  'chat/direct': MessagesSquare,
  'knowledge-base': Book,
  reports: BarChart3,
  analytics: PieChart,
  workflows: Workflow,
  automations: Bot,
  integrations: Plug,
  'document-editor': FileText,
  profile: UserCog,
  settings: SettingsIcon,
  security: Shield,
};

const NavLink = ({ href, children, icon, badge }: { href: string; children: React.ReactNode; icon: React.ElementType; badge?: number | string }) => {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href) && (href !== '/dashboard' || pathname === '/dashboard');
  const Icon = icon;

  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center p-2 rounded-lg text-sm transition-all text-foreground/80 hover:bg-muted/50 relative",
        isActive && "bg-primary/20 text-primary font-medium"
      )}>
        <Icon className="mr-3 w-5 h-5 flex-shrink-0" />
        <span className="flex-grow">{children}</span>
        {badge && (
          <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
};

export default function AppSidebar() {
  const auth = useAuth();
  const { user } = useUser();
  
  const currentUserData = mockUsers.find(u => u.email === user?.email);

  const userHasPermission = (requiredPermissions?: string[]) => {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No specific permissions required
    }
    if (!currentUserData) return false;
    if (currentUserData.role === ROLES.ADMIN) {
      return true; // Admin has all permissions
    }
    return requiredPermissions.some(p => p === currentUserData.role);
  }
  
  const avatarUrl = user ? PlaceHolderImages.find(p => p.id === `user-avatar-${currentUserData?.id}`)?.imageUrl : undefined;

  return (
    <aside className="w-64 h-full flex flex-col flex-shrink-0 gradient-surface shadow-2xl transition-all duration-300 fixed md:relative z-40 md:translate-x-0 -translate-x-full">
       <div className="p-6 flex flex-col justify-center h-24 border-b border-border pl-6">
        <Link href="/dashboard" className="block w-fit">
            <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            >
            <TxunaLogo className="w-40 h-12" />
            </motion.div>
        </Link>
        <motion.p
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
           className="text-xs text-muted-foreground mt-1"
        >
            Powered by ORYON.
        </motion.p>
      </div>

      <nav className="flex-grow p-4 overflow-y-auto custom-scrollbar">
        {menuItems.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase flex justify-between items-center">
              <span>{section.title}</span>
              {section.action && <button className="text-xs text-primary hover:text-foreground"><Plus className="w-4 h-4" /></button>}
            </h2>
            <div className="space-y-1">
              {section.items.filter(item => userHasPermission(item.permissions)).map((item) => {
                const department = item.department ? departments.find(d => d.slug === item.department) : null;
                const href = item.id === 'dashboard' ? '/dashboard' : `/dashboard/${item.id}`;
                return (
                  <NavLink key={item.id} href={href} icon={iconMap[item.id] || SettingsIcon} badge={item.badge}>
                    <div className={cn("flex items-center w-full", department && `department-${department.slug} border-dept -ml-2 pl-2`)}>
                      <span className={cn(department && `text-dept`)}>{item.title}</span>
                      {item.status && <span className={cn("ml-auto h-2 w-2 rounded-full", statusClasses[item.status])}></span>}
                    </div>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-primary">
              <AvatarImage src={avatarUrl} alt={currentUserData?.name} data-ai-hint="person portrait" />
              <AvatarFallback>{currentUserData?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className={cn("absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-card", statusClasses[currentUserData?.status || 'offline'])} />
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">{currentUserData?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUserData?.role}</p>
          </div>
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-muted/50 text-foreground/80">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut(auth)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
