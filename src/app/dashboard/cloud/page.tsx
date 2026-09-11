
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, File as FileIcon, FileArchive, FileText, FileVideo, Folder, MoreVertical, Share2, Trash2, UploadCloud, Plus, ArrowUpDown, FolderPlus, Loader2 } from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';


const fileIcons: { [key: string]: React.ReactNode } = {
    pdf: <FileText className="w-5 h-5 text-red-400" />,
    docx: <FileText className="w-5 h-5 text-blue-400" />,
    word: <FileText className="w-5 h-5 text-blue-500" />,
    powerpoint: <FileVideo className="w-5 h-5 text-orange-400" />,
    excel: <FileText className="w-5 h-5 text-green-400" />,
    zip: <FileArchive className="w-5 h-5 text-yellow-400" />,
    figma: <FileIcon className="w-5 h-5 text-purple-400" />,
    folder: <Folder className="w-5 h-5 text-yellow-500" />,
    default: <FileIcon className="w-5 h-5" />,
}

type File = {
  id: string,
  name: string,
  type: string,
  size: number, // size in bytes
  url: string,
  ownerId: string,
  createdAt: string,
  lastModified: string
};
type Folder = { id: string, name: string, type: 'folder', lastModified: string, size: string };

export default function CloudPage() {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userFilesCollection = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        return collection(firestore, 'users', user.uid, 'files');
    }, [firestore, user?.uid]);
    
    const { data: files, isLoading: areFilesLoading } = useCollection<File>(userFilesCollection);

    const [folders, setFolders] = useState<Folder[]>([
        { id: 'folder-1', name: 'Relatórios Q3', type: 'folder', lastModified: '2024-11-10T11:00:00Z', size: '--' },
    ]);

    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState({ key: 'name', order: 'asc' });
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const newFolderNameRef = useRef<HTMLInputElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);

    const filesAndFolders = useMemo(() => {
        const fileItems = files ? files.map(f => ({ ...f, size: (f.size / (1024*1024)).toFixed(2) + ' MB' })) : [];
        return [...fileItems, ...folders];
    }, [files, folders]);

    const totalStorage = 20; // GB
    const usedStorage = useMemo(() => files ? files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024 * 1024) : 0, [files]);
    const usedPercentage = (usedStorage / totalStorage) * 100;
    
    const sortedAndFilteredItems = useMemo(() => {
        return [...filesAndFolders]
            .filter(item => item.name.toLowerCase().includes(filter.toLowerCase()))
            .sort((a, b) => {
                const aValue = a[sort.key as keyof typeof a] as any;
                const bValue = b[sort.key as keyof typeof b] as any;

                if (sort.key === 'size') {
                    const sizeA = a.type === 'folder' ? -1 : parseFloat(a.size);
                    const sizeB = b.type === 'folder' ? -1 : parseFloat(b.size);
                     if (sizeA < sizeB) return sort.order === 'asc' ? -1 : 1;
                    if (sizeA > sizeB) return sort.order === 'asc' ? 1 : -1;
                    return 0;
                }
                
                const valA = new Date(aValue).getTime();
                const valB = new Date(bValue).getTime();

                if (sort.key === 'lastModified' && !isNaN(valA) && !isNaN(valB)) {
                  if (valA < valB) return sort.order === 'asc' ? -1 : 1;
                  if (valA > valB) return sort.order === 'asc' ? 1 : -1;
                  return 0;
                }

                if (aValue < bValue) return sort.order === 'asc' ? -1 : 1;
                if (aValue > bValue) return sort.order === 'asc' ? 1 : -1;
                return 0;
            });
    }, [filesAndFolders, filter, sort]);

    const handleSort = (key: string) => {
        setSort(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleCreateFolder = () => {
        const folderName = newFolderNameRef.current?.value;
        if (folderName?.trim()) {
            const newFolder: Folder = {
                id: `folder-${Date.now()}`,
                name: folderName.trim(),
                type: 'folder',
                lastModified: new Date().toISOString(),
                size: '--'
            };
            setFolders(prev => [newFolder, ...prev]);
            toast({ title: 'Pasta Criada', description: `A pasta "${folderName}" foi criada.` });
            setIsNewFolderOpen(false);
        } else {
             toast({ title: 'Nome inválido', description: 'Por favor, insira um nome para a pasta.', variant: 'destructive' });
        }
    };

    const handleUploadClick = () => {
        uploadInputRef.current?.click();
    }
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            toast({ title: 'Upload Iniciado', description: `A carregar o ficheiro "${file.name}".`});
            // Simulate upload
            setTimeout(() => {
                 toast({ title: 'Upload Concluído', description: `"${file.name}" foi carregado.`});
            }, 2000);
        }
    };
    
    const handleDelete = (itemId: string, itemName: string) => {
        toast({ title: 'Item Apagado', description: `"${itemName}" foi movido para o lixo.`, variant: 'destructive'});
    }

    const handleAction = (action: string, itemName: string) => {
        toast({ title: `${action} iniciado`, description: `A ${action.toLowerCase()} "${itemName}".`});
    }

    return (
        <div className="p-6 fade-in">
             <input type="file" ref={uploadInputRef} onChange={handleFileChange} className="hidden" />
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-foreground">Minha Nuvem</h1>
                <div className="flex gap-2">
                    <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="bg-card/80">
                                <FolderPlus className="mr-2 h-4 w-4" /> Nova Pasta
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                            <DialogTitle>Criar Nova Pasta</DialogTitle>
                            <DialogDescription>
                                Dê um nome à sua nova pasta.
                            </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                    Nome
                                    </Label>
                                    <Input id="name" ref={newFolderNameRef} className="col-span-3 bg-card" placeholder="Ex: Relatórios Trimestrais" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={handleCreateFolder} className="btn-primary-gradient">Criar Pasta</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button className="btn-primary-gradient" onClick={handleUploadClick}>
                        <UploadCloud className="mr-2 h-4 w-4" /> Upload
                    </Button>
                </div>
            </div>

            <Card className="gradient-surface border-0 rounded-2xl mb-8">
                <CardHeader>
                    <CardTitle>Uso do Armazenamento</CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={usedPercentage} className="h-3" />
                    <div className="flex justify-between text-sm text-muted-foreground mt-2">
                        <span>{usedStorage.toFixed(2)} GB de {totalStorage} GB utilizados</span>
                        <span>{usedPercentage.toFixed(1)}%</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="gradient-surface border-0 rounded-2xl">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Meus Ficheiros</CardTitle>
                        <div className="flex gap-2">
                             <Input 
                                placeholder="Filtrar por nome..."
                                className="w-64 bg-card border-border"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                             />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-border hover:bg-transparent">
                                <TableHead onClick={() => handleSort('name')} className="cursor-pointer"><span className="flex items-center gap-2">Nome <ArrowUpDown className="w-4 h-4"/></span></TableHead>
                                <TableHead onClick={() => handleSort('size')} className="cursor-pointer"><span className="flex items-center gap-2">Tamanho <ArrowUpDown className="w-4 h-4"/></span></TableHead>
                                <TableHead onClick={() => handleSort('lastModified')} className="cursor-pointer"><span className="flex items-center gap-2">Última Modificação <ArrowUpDown className="w-4 h-4"/></span></TableHead>
                                <TableHead>Partilhado com</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(isUserLoading || areFilesLoading) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isUserLoading && !areFilesLoading && sortedAndFilteredItems.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Nenhum ficheiro encontrado. Comece a carregar!
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isUserLoading && !areFilesLoading && sortedAndFilteredItems.map(item => (
                                <TableRow key={item.id} className="border-b-border/50 hover:bg-muted/50">
                                    <TableCell className="font-medium text-foreground flex items-center gap-3">
                                        {fileIcons[item.type] || fileIcons.default}
                                        {item.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.size}</TableCell>
                                    <TableCell className="text-muted-foreground">{new Date(item.lastModified).toLocaleDateString('pt-PT')}</TableCell>
                                    <TableCell>
                                        {/* Placeholder for shared users */}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleAction('Partilhar', item.name)}><Share2 className="w-4 h-4 text-primary/80" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleAction('Download', item.name)}><Download className="w-4 h-4 text-primary/80" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-400/80" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta ação não pode ser desfeita. O ficheiro será apagado permanentemente.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(item.id, item.name)} className="bg-destructive hover:bg-destructive/90">Apagar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
