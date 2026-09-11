
'use client';
import { useState, useMemo, useEffect } from 'react';
import { Menu, Search, Bot, Bell, Video, Plus, User, Key, CheckCircle, FilePlus, FolderPlus, Trash2, Folder, ListTodo, FileText as FileTextIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { menuItems, users, projects, tasks, documents, departments } from '@/lib/data';
import AiAssistant from '@/components/ai-assistant';
import Link from 'next/link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import StartCallDialog from '../start-call-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const getBreadcrumb = (pathname: string) => {
  const pathParts = pathname.split('/').filter(p => p);
  if (pathParts.length < 2) return 'Dashboard';
  
  // Handle /dashboard case
  if (pathParts.length === 1 && pathParts[0] === 'dashboard') return 'Dashboard';

  // Handle dynamic routes before generic ones
  if (pathParts[1] === 'call' && pathParts.length > 2) return 'Chamada';
  if (pathParts[1] === 'workspaces' && pathParts.length > 2) return 'Workspace';
  if (pathParts[1] === 'departments' && pathParts.length > 2) {
      const dept = departments.find(d => d.slug === pathParts[2]);
      return dept ? dept.name : 'Departamento';
  }
   if (pathParts[1] === 'chat' && pathParts[2] === 'direct' && pathParts.length > 3) {
    const user = users.find(u => u.id === Number(pathParts[3]));
    return user ? `Chat com ${user.name}` : 'Mensagem Direta';
  }


  const pageId = pathParts.slice(1).join('/');

  for (const section of menuItems) {
    const item = section.items.find(i => i.id === pageId);
    if (item) return item.title;
  }

  return 'Dashboard';
}

const notifications = [
    { id: 1, type: 'task', content: 'Você atualizou a tarefa "Criar campanha..." para "Em Progresso".', time: 'há 2 horas', icon: <CheckCircle className="w-4 h-4 text-primary"/>, read: false, category: 'tasks'},
    { id: 2, type: 'security', content: 'Sessão iniciada a partir de um novo dispositivo.', time: 'há 1 dia', icon: <Key className="w-4 h-4 text-success-500"/>, read: false, category: 'security' },
    { id: 3, type: 'mention', content: 'Você foi mencionado por Maria Silva no canal de Marketing.', time: 'há 3 dias', icon: <User className="w-4 h-4 text-accent-500"/>, read: true, category: 'mentions' },
];

export default function Header() {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumb(pathname);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isStartCallOpen, setIsStartCallOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 0) {
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return null;

    const lowerCaseQuery = searchQuery.toLowerCase();

    const foundUsers = users.filter(u => u.name.toLowerCase().includes(lowerCaseQuery)).slice(0, 3);
    const foundProjects = projects.filter(p => p.name.toLowerCase().includes(lowerCaseQuery)).slice(0, 3);
    const foundTasks = tasks.filter(t => t.title.toLowerCase().includes(lowerCaseQuery)).slice(0, 3);
    const foundDocs = documents.filter(d => d.title.toLowerCase().includes(lowerCaseQuery)).slice(0, 3);

    const results = {
      users: foundUsers,
      projects: foundProjects,
      tasks: foundTasks,
      documents: foundDocs,
    };

    const total = foundUsers.length + foundProjects.length + foundTasks.length + foundDocs.length;

    return total > 0 ? results : null;
  }, [searchQuery]);
  
  return (
    <>
      <header className="flex-shrink-0 p-4 gradient-surface z-10 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu />
          </Button>
          <div className="text-lg font-light text-muted-foreground">
            <Link href="/dashboard" className="text-foreground transition-colors hover:text-primary">Dashboard</Link>
            {breadcrumb !== 'Dashboard' && (
              <>
                <span className="mx-2">/</span>
                <span className="text-foreground font-medium">{breadcrumb}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
           <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
             <PopoverAnchor asChild>
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Pesquisar no Oryon... (Ctrl+K)"
                    className="pl-10 pr-4 py-2 w-64 lg:w-96 h-auto bg-card border-border rounded-xl focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </PopoverAnchor>
              <PopoverContent className="w-[550px] p-2 mt-2" align="center">
                {searchResults ? (
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="all">Todos</TabsTrigger>
                        <TabsTrigger value="users">Pessoas</TabsTrigger>
                        <TabsTrigger value="projects">Projetos</TabsTrigger>
                        <TabsTrigger value="tasks">Tarefas</TabsTrigger>
                        <TabsTrigger value="docs">Docs</TabsTrigger>
                    </TabsList>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar mt-2">
                        <TabsContent value="all" className="m-0">
                           <div className="space-y-3">
                                {searchResults.users.length > 0 && <SearchResultsCategory title="Utilizadores" items={searchResults.users.map(u => ({ id: u.id, name: u.name, href: `/dashboard/team`, icon: <User className="w-4 h-4 text-primary"/>, context: u.role }))} />}
                                {searchResults.projects.length > 0 && <SearchResultsCategory title="Projetos" items={searchResults.projects.map(p => ({ id: p.id, name: p.name, href: `/dashboard/projects`, icon: <Folder className="w-4 h-4 text-primary"/>, context: p.department }))} />}
                                {searchResults.tasks.length > 0 && <SearchResultsCategory title="Tarefas" items={searchResults.tasks.map(t => ({ id: t.id, name: t.title, href: `/dashboard/tasks`, icon: <ListTodo className="w-4 h-4 text-primary"/>, context: `Prazo: ${new Date(t.dueDate).toLocaleDateString()}` }))} />}
                                {searchResults.documents.length > 0 && <SearchResultsCategory title="Documentos" items={searchResults.documents.map(d => ({ id: d.id, name: d.title, href: `/dashboard/documents`, icon: <FileTextIcon className="w-4 h-4 text-primary"/>, context: d.type }))} />}
                           </div>
                        </TabsContent>
                         <TabsContent value="users" className="m-0">
                             {searchResults.users.length > 0 ? <SearchResultsCategory items={searchResults.users.map(u => ({ id: u.id, name: u.name, href: `/dashboard/team`, icon: <User className="w-4 h-4 text-primary"/>, context: u.role }))} /> : <p className="text-center text-sm text-muted-foreground p-4">Nenhum utilizador encontrado.</p>}
                         </TabsContent>
                         <TabsContent value="projects" className="m-0">
                             {searchResults.projects.length > 0 ? <SearchResultsCategory items={searchResults.projects.map(p => ({ id: p.id, name: p.name, href: `/dashboard/projects`, icon: <Folder className="w-4 h-4 text-primary"/>, context: p.department }))} /> : <p className="text-center text-sm text-muted-foreground p-4">Nenhum projeto encontrado.</p>}
                         </TabsContent>
                         <TabsContent value="tasks" className="m-0">
                             {searchResults.tasks.length > 0 ? <SearchResultsCategory items={searchResults.tasks.map(t => ({ id: t.id, name: t.title, href: `/dashboard/tasks`, icon: <ListTodo className="w-4 h-4 text-primary"/>, context: `Prazo: ${new Date(t.dueDate).toLocaleDateString()}` }))} /> : <p className="text-center text-sm text-muted-foreground p-4">Nenhuma tarefa encontrada.</p>}
                         </TabsContent>
                          <TabsContent value="docs" className="m-0">
                             {searchResults.documents.length > 0 ? <SearchResultsCategory items={searchResults.documents.map(d => ({ id: d.id, name: d.title, href: `/dashboard/documents`, icon: <FileTextIcon className="w-4 h-4 text-primary"/>, context: d.type }))} /> : <p className="text-center text-sm text-muted-foreground p-4">Nenhum documento encontrado.</p>}
                         </TabsContent>
                    </div>
                  </Tabs>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhum resultado encontrado para "{searchQuery}".
                  </div>
                )}
              </PopoverContent>
            </Popover>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="rounded-full bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary" title="OryonAI" onClick={() => setIsAiAssistantOpen(true)}>
              <Bot />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-card/10 text-foreground hover:bg-card/20 relative" title="Notificações">
                  <Bell />
                  {notifications.filter(n => !n.read).length > 0 &&
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-destructive text-xs items-center justify-center">{notifications.filter(n => !n.read).length}</span>
                    </span>
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                 <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">Todas</TabsTrigger>
                        <TabsTrigger value="unread">Não Lidas</TabsTrigger>
                        <TabsTrigger value="mentions">Menções</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all" className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.map(n => <NotificationItem key={n.id} notification={n} />)}
                    </TabsContent>
                    <TabsContent value="unread" className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.filter(n => !n.read).map(n => <NotificationItem key={n.id} notification={n} />)}
                         {notifications.filter(n => !n.read).length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma notificação por ler.</p>}
                    </TabsContent>
                    <TabsContent value="mentions" className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                       {notifications.filter(n => n.category === 'mentions').map(n => <NotificationItem key={n.id} notification={n} />)}
                       {notifications.filter(n => n.category === 'mentions').length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma menção encontrada.</p>}
                    </TabsContent>
                </Tabs>
              </PopoverContent>
            </Popover>

            <Button size="icon" className="rounded-full btn-primary-gradient shadow-lg hover:shadow-xl" title="Iniciar Chamada" onClick={() => setIsStartCallOpen(true)}>
              <Video />
            </Button>

             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-card/10 text-foreground hover:bg-card/20" title="Criar Novo">
                  <Plus />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/tasks">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    <span>Nova Tarefa</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/projects">
                    <FolderPlus className="mr-2 h-4 w-4" />
                    <span>Novo Projeto</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/document-editor">
                    <FilePlus className="mr-2 h-4 w-4" />
                    <span>Novo Documento</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>
      </header>
      <AiAssistant isOpen={isAiAssistantOpen} onOpenChange={setIsAiAssistantOpen} />
      <StartCallDialog isOpen={isStartCallOpen} onOpenChange={setIsStartCallOpen} />
    </>
  );
}

const NotificationItem = ({ notification }: { notification: (typeof notifications)[0] }) => {
    return (
        <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 relative">
            {!notification.read && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full"></span>}
            <div className="p-2 bg-card rounded-full">{notification.icon}</div>
            <div className="flex-grow">
                <p className="text-sm text-foreground/90">{notification.content}</p>
                <p className="text-xs text-muted-foreground">{notification.time}</p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7"><CheckCircle className="w-4 h-4 text-success-500" title="Marcar como lida" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-4 h-4 text-destructive" title="Apagar"/></Button>
            </div>
        </div>
    );
};

const SearchResultsCategory = ({ title, items }: { title?: string; items: { id: number | string; name: string; href: string; icon: React.ReactNode, context: string }[] }) => (
    <div>
        {title && <h4 className="text-xs font-semibold text-muted-foreground px-2 mb-1">{title}</h4>}
        <div className="space-y-1">
            {items.map(item => (
                <Link href={item.href} key={item.id}>
                    <div className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-card rounded-md">{item.icon}</div>
                            <div>
                                <span className="text-sm font-medium text-foreground">{item.name}</span>
                                <p className="text-xs text-muted-foreground">{item.context}</p>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    </div>
);
