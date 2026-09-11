
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTasksForUser, getCurrentUser, users, campaigns } from '@/lib/data';
import { Plus, ArrowUpDown, LayoutGrid, List, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ContextTag } from '@/components/ui/context-tag';
import type { Context } from '@/lib/types';

const currentUser = getCurrentUser();
const userTasks = getTasksForUser(currentUser.id);

export default function TasksPage() {
    const { toast } = useToast();

    const handleNewTask = () => {
        toast({
            title: "Funcionalidade em desenvolvimento",
            description: "A criação de novas tarefas estará disponível em breve.",
        });
    }

    return (
        <div className="p-6 fade-in h-full flex flex-col">
            <div className="flex justify-between items-center mb-8 flex-shrink-0">
                <h1 className="text-3xl font-bold text-foreground">Minhas Tarefas</h1>
                 <Button className="btn-primary-gradient" onClick={handleNewTask}>
                    <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
                </Button>
            </div>

            <Tabs defaultValue="board" className="flex-grow flex flex-col">
                 <div className="flex justify-start">
                    <TabsList className="grid w-full grid-cols-2 max-w-sm mb-6 bg-card/80 border border-border">
                        <TabsTrigger value="board"><LayoutGrid className="mr-2 h-4 w-4" />Quadro</TabsTrigger>
                        <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />Lista</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="board" className="flex-grow overflow-hidden">
                    <TasksBoardView />
                </TabsContent>
                <TabsContent value="list" className="flex-grow overflow-y-auto custom-scrollbar">
                    <TasksListView />
                </TabsContent>
            </Tabs>
        </div>
    );
}

const TasksBoardView = () => {
    const tasksBacklog = userTasks.filter(t => t.status === 'backlog');
    const tasksTodo = userTasks.filter(t => t.status === 'todo');
    const tasksInProgress = userTasks.filter(t => t.status === 'in-progress');
    const tasksDone = userTasks.filter(t => t.status === 'done');
    const tasksBlocked = userTasks.filter(t => t.status === 'blocked');

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 h-full">
            <TaskColumn title="Backlog" tasks={tasksBacklog} />
            <TaskColumn title="A Fazer" tasks={tasksTodo} />
            <TaskColumn title="Em Progresso" tasks={tasksInProgress} />
            <TaskColumn title="Bloqueado" tasks={tasksBlocked} />
            <TaskColumn title="Concluído" tasks={tasksDone} />
        </div>
    );
}

const TasksListView = () => {
    type SortKey = 'title' | 'priority' | 'dueDate' | 'status' | 'context';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'priority', direction: 'ascending' });

    const priorityOrder: { [key: string]: number } = { urgent: 4, high: 3, medium: 2, low: 1 };
    const statusOrder: { [key: string]: number } = { 'in-progress': 1, todo: 2, blocked: 3, backlog: 4, done: 5 };

    const sortedTasks = useMemo(() => {
        let sortableItems = [...userTasks];
        sortableItems.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortConfig.key) {
                case 'priority':
                    aValue = priorityOrder[a.priority] || 0;
                    bValue = priorityOrder[b.priority] || 0;
                    break;
                case 'dueDate':
                    aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                    bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                    if (sortConfig.direction === 'ascending') {
                        if (aValue === Infinity && bValue !== Infinity) return 1;
                        if (aValue !== Infinity && bValue === Infinity) return -1;
                    } else {
                        if (aValue === Infinity && bValue !== Infinity) return -1;
                        if (aValue !== Infinity && bValue === Infinity) return 1;
                    }
                    break;
                case 'status':
                    aValue = statusOrder[a.status] || 0;
                    bValue = statusOrder[b.status] || 0;
                    break;
                case 'context':
                    aValue = a.context?.name || 'zzzz';
                    bValue = b.context?.name || 'zzzz';
                    return aValue.localeCompare(bValue) * (sortConfig.direction === 'ascending' ? 1 : -1);
                default: // title
                    aValue = a.title;
                    bValue = b.title;
                    return aValue.localeCompare(bValue) * (sortConfig.direction === 'ascending' ? 1 : -1);
            }
            
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;

            return 0;
        });
        return sortableItems;
    }, [sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const priorityStyles: { [key: string]: string } = {
        urgent: 'text-destructive',
        high: 'text-destructive',
        medium: 'text-accent-500',
        low: 'text-green-500',
    };
     const statusStyles: { [key: string]: string } = {
        'in-progress': 'text-accent-500',
        blocked: 'text-destructive',
        todo: 'text-primary',
        backlog: 'text-slate-400',
        done: 'text-green-500',
    };

    const priorityIcons: { [key: string]: string } = { urgent: '🔴', high: '🔴', medium: '🟡', low: '🟢' };


    return (
        <Card className="gradient-surface border-0 rounded-2xl h-full">
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-border hover:bg-transparent">
                            <TableHead onClick={() => requestSort('title')} className="cursor-pointer">
                                <span className="flex items-center gap-2">Tarefa <ArrowUpDown className="w-4 h-4"/></span>
                            </TableHead>
                            <TableHead onClick={() => requestSort('context')} className="cursor-pointer">
                                <span className="flex items-center gap-2">Contexto <ArrowUpDown className="w-4 h-4"/></span>
                            </TableHead>
                             <TableHead onClick={() => requestSort('priority')} className="cursor-pointer">
                                <span className="flex items-center gap-2">Prioridade <ArrowUpDown className="w-4 h-4"/></span>
                            </TableHead>
                            <TableHead onClick={() => requestSort('status')} className="cursor-pointer">
                                <span className="flex items-center gap-2">Status <ArrowUpDown className="w-4 h-4"/></span>
                            </TableHead>
                            <TableHead onClick={() => requestSort('dueDate')} className="cursor-pointer text-right">
                                <span className="flex items-center gap-2 justify-end">Prazo <ArrowUpDown className="w-4 h-4"/></span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTasks.map(task => {
                             return (
                                <TableRow key={task.id} className="border-b-border/50 hover:bg-muted/50">
                                    <TableCell className="font-medium text-foreground">{task.title}</TableCell>
                                    <TableCell>
                                        <ContextTag context={task.context} />
                                    </TableCell>
                                    <TableCell className={cn('font-medium capitalize', priorityStyles[task.priority])}>
                                        <span className="flex items-center gap-2">{priorityIcons[task.priority]} {task.priority}</span>
                                    </TableCell>
                                    <TableCell className={cn('font-medium capitalize', statusStyles[task.status])}>
                                        {task.status.replace('-', ' ')}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function TaskColumn({title, tasks}: {title: string, tasks: typeof userTasks}) {
    const columnStyles: { [key: string]: { border: string } } = {
        "Backlog": { border: "border-slate-500" },
        "A Fazer": { border: "border-primary" },
        "Em Progresso": { border: "border-accent-500" },
        "Bloqueado": { border: "border-destructive" },
        "Concluído": { border: "border-green-500" },
    }
    const style = columnStyles[title] || { border: "border-gray-400" };
    return (
        <div className="flex flex-col h-full bg-card/30 rounded-lg">
            <div className={`flex-shrink-0 p-3 border-l-4 ${style.border}`}>
                <h2 className="text-base font-semibold text-foreground">{title} <span className="text-sm text-muted-foreground font-normal">({tasks.length})</span></h2>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto custom-scrollbar p-3">
                {tasks.map(task => <TaskCard key={task.id} task={task} />)}
                 {tasks.length === 0 && <div className="text-sm text-muted-foreground text-center pt-10 px-4">Nenhuma tarefa nesta coluna.</div>}
            </div>
        </div>
    )
}

function TaskCard({ task }: { task: (typeof userTasks)[0] }) {
  const priorityStyles: { [key: string]: { text: string; icon: string } } = {
    urgent: { text: 'text-destructive', icon: '🔴' },
    high: { text: 'text-destructive', icon: '🔴' },
    medium: { text: 'text-accent-500', icon: '🟡' },
    low: { text: 'text-green-500', icon: '🟢' },
  };
   const assignedUsers = task.assignedTo.map(userId => users.find(u => u.id === userId)).filter(Boolean);
   const isDone = task.status === 'done';

  return (
    <div className={cn("p-4 bg-card/80 rounded-lg shadow-sm cursor-grab active:cursor-grabbing", { 'opacity-60': isDone }, { 'border-l-2 border-destructive': task.status === 'blocked'})}>
        <div className="flex justify-between items-start">
            <p className={cn("font-semibold text-foreground text-sm mb-2", {'line-through text-muted-foreground': isDone})}>
                {task.title}
            </p>
        </div>

        {task.context && (
           <div className="mb-3">
             <ContextTag context={task.context} />
           </div>
        )}
        
        {task.status === 'blocked' && (
            <p className="text-xs font-semibold text-destructive mt-2">Bloqueio: Aguardando aprovação do orçamento.</p>
        )}

        <p className={cn("text-xs text-muted-foreground mt-2 line-clamp-2", {'line-through': isDone})}>{task.description}</p>
        
        {task.checklist && task.checklist.length > 0 && (
             <div className="mt-3 space-y-1">
                 {task.checklist.map(item => (
                     <div key={item.id} className={cn("flex items-center gap-2 text-xs", item.checked ? 'text-muted-foreground line-through' : 'text-foreground')}>
                         <div className={cn("w-3.5 h-3.5 rounded-sm flex items-center justify-center border", item.checked ? "bg-primary border-primary" : "bg-card/80 border-border")}>
                            {item.checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                         </div>
                         <span>{item.text}</span>
                     </div>
                 ))}
             </div>
        )}

        <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-xs">
                {task.priority && (
                    <span className={cn('font-semibold flex items-center gap-1', priorityStyles[task.priority]?.text)}>
                        {priorityStyles[task.priority]?.icon} {task.priority}
                    </span>
                )}
                {task.dueDate && (
                     <span className="text-muted-foreground">| {new Date(task.dueDate).toLocaleDateString('pt-PT', {day: '2-digit', month: 'short'})}</span>
                )}
            </div>
            <div className="flex -space-x-2">
                {assignedUsers.map(user => {
                    if (!user) return null;
                    const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${user.id}`)?.imageUrl;
                    return (
                        <Avatar key={user.id} className="h-6 w-6 border-2 border-background" title={user.name}>
                            <AvatarImage src={avatar} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    );
                })}
            </div>
        </div>
         {task.labels && task.labels.length > 0 && (
             <div className="mt-3 flex flex-wrap gap-1">
                 {task.labels.map(label => (
                     <Badge key={label} variant="secondary" className="text-xs bg-primary/10 text-primary/90">#{label}</Badge>
                 ))}
             </div>
         )}
    </div>
  );
};
