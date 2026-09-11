
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { File as FileIcon, FileText, Folder, MoreVertical, Plus, Search, UploadCloud, FileSpreadsheet, FileVideo, Globe, HardDrive, Trash2, Download, Share2, Loader2, ArrowUpDown } from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, serverTimestamp, doc, query, where } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ROLES } from '@/config/roles';

const fileTypeIcons: { [key: string]: React.ReactNode } = {
  'doc': <FileText className="w-5 h-5 text-blue-400" />,
  'sheet': <FileSpreadsheet className="w-5 h-5 text-green-400" />,
  'ppt': <FileVideo className="w-5 h-5 text-orange-400" />,
  'board': <FileIcon className="w-5 h-5 text-purple-400" />,
  'pdf': <FileText className="w-5 h-5 text-red-400" />,
  'image': <FileIcon className="w-5 h-5 text-pink-400" />,
  'folder': <Folder className="w-5 h-5 text-yellow-500" />,
  'default': <FileIcon className="w-5 h-5" />,
};

const getFileIcon = (fileType: string) => {
    if (fileType === 'folder') return fileTypeIcons.folder;
    const match = Object.keys(fileTypeIcons).find(key => fileType.startsWith(key));
    return match ? fileTypeIcons[match] : fileTypeIcons.default;
}

type FileData = {
  id: string;
  title: string;
  type: string;
  size: number;
  url?: string;
  owner: string;
  members: string[];
  createdAt: any;
  updatedAt: any;
};

type FolderData = { 
  id: string; 
  title: string; 
  type: 'folder'; 
  updatedAt: any; 
  size: number;
  owner: string;
};


export default function DocumentsPage() {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userFilesQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        return query(
            collection(firestore, 'docs'),
            where('members', 'array-contains', user.uid)
        );
    }, [firestore, user?.uid]);
    
    const { data: files, isLoading: areFilesLoading, error: filesError } = useCollection<FileData>(userFilesQuery);

    const [folders, setFolders] = useState<FolderData[]>([]);
    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState({ key: 'title', order: 'asc' });
    const uploadInputRef = useRef<HTMLInputElement>(null);
    
    const normalizedItems = useMemo(() => {
      const fileItems = files ? files.map(f => ({ ...f, itemType: 'file' as const })) : [];
      const folderItems = folders.map(f => ({
          ...f,
          itemType: 'folder' as const,
          id: f.id,
          title: f.title,
          type: 'folder' as const,
          size: f.size,
          owner: f.owner,
          members: [f.owner],
          createdAt: f.updatedAt,
          updatedAt: f.updatedAt,
          url: '',
      }));
      return [...fileItems, ...folderItems];
    }, [files, folders]);

    const sortedAndFilteredItems = useMemo(() => {
        return [...normalizedItems]
            .filter(item => item.title.toLowerCase().includes(filter.toLowerCase()))
            .sort((a, b) => {
                const getSortableValue = (item: any, key: string) => {
                    const value = item[key as keyof typeof item];
                     if (key === 'owner') {
                        // Assuming you might want to fetch user names later, for now, use UID
                        const ownerValue = item.owner || '';
                        return ownerValue;
                    }
                    if (key === 'updatedAt' || key === 'createdAt') {
                         if (!value) return 0;
                         if (typeof value.toDate === 'function') { // Firebase Timestamp
                            return value.toDate().getTime();
                         }
                         if (typeof value === 'string') { // ISO String from local folders
                            const date = new Date(value);
                            return isNaN(date.getTime()) ? 0 : date.getTime();
                         }
                         return 0;
                    }
                    return value ?? '';
                };

                const aValue = getSortableValue(a, sort.key);
                const bValue = getSortableValue(b, sort.key);
                
                if (aValue < bValue) return sort.order === 'asc' ? -1 : 1;
                if (aValue > bValue) return sort.order === 'asc' ? 1 : -1;
                return 0;
            });
    }, [normalizedItems, filter, sort]);


    const handleSort = (key: string) => {
        setSort(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };
    
    const handleUploadClick = () => uploadInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !user?.uid || !firestore) return;
        
        const file = e.target.files[0];
        const storage = getStorage();
        const filePath = `docs/${user.uid}/${Date.now()}_${file.name}`;
        const fileStorageRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileStorageRef, file);

        toast({ title: 'Upload Iniciado', description: `A carregar o ficheiro "${file.name}".`});

        uploadTask.on('state_changed', 
            (snapshot) => { /* can be used for progress bar */ }, 
            (error) => {
                console.error("Upload error:", error);
                toast({ title: 'Erro no Upload', description: `Não foi possível carregar "${file.name}".`, variant: 'destructive'});
            }, 
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    const fileDocRef = doc(collection(firestore, 'docs'));
                    const newFile: Omit<FileData, 'id'> = {
                        title: file.name,
                        type: file.type || 'default',
                        size: file.size,
                        owner: user.uid,
                        members: [user.uid], // Start with the owner as a member
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        url: downloadURL
                    };
                    setDocumentNonBlocking(fileDocRef, newFile, { merge: true });
                    toast({ title: 'Upload Concluído', description: `"${file.name}" foi carregado com sucesso.`});
                });
            }
        );
        // Reset file input to allow uploading the same file again
        e.target.value = '';
    };

    const handleDelete = (itemId: string) => {
        if (!user?.uid || !firestore) return;
        const docRef = doc(firestore, 'docs', itemId);
        deleteDocumentNonBlocking(docRef);
        toast({ title: 'Item Apagado', description: `O ficheiro foi movido para o lixo.`, variant: 'destructive'});
    };

    const QuickActionCard = ({ icon: Icon, title, description, href, onClick, comingSoon }: { icon: React.ElementType, title: string, description: string, href?: string, onClick?: () => void, comingSoon?: boolean }) => {
        const { toast } = useToast();
        const content = (
             <Card className="gradient-surface border-0 rounded-2xl text-left h-full hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div>
                        <div className="p-2 bg-primary/20 text-primary rounded-lg w-fit mb-4"><Icon className="w-5 h-5"/></div>
                        <h3 className="font-semibold text-foreground">{title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{description}</p>
                    </div>
                     {comingSoon && <Badge variant="outline" className="mt-4 w-fit">Em Breve</Badge>}
                </CardContent>
            </Card>
        );

        const handleClick = () => {
            if (comingSoon) {
                toast({ title: "Funcionalidade em desenvolvimento", description: `${title} estará disponível em breve.` });
            } else if (onClick) {
                onClick();
            }
        };

        if (href && !comingSoon) {
            return <Link href={href}>{content}</Link>;
        }
        return <button onClick={handleClick} className="w-full h-full disabled:opacity-50" disabled={comingSoon}>{content}</button>;
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '-';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    const formatDate = (date: any) => {
        if (!date) return '-';
        if (typeof date.toDate === 'function') { // Firebase Timestamp
            return date.toDate().toLocaleDateString('pt-PT');
        }
        if (typeof date === 'string') { // ISO String
            return new Date(date).toLocaleDateString('pt-PT');
        }
        return '-';
    };


    return (
        <div className="p-6 fade-in">
             <input type="file" ref={uploadInputRef} onChange={handleFileChange} className="hidden" />
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Pesquisar documentos..." className="w-64 bg-card border-border pl-10 h-10" value={filter} onChange={e => setFilter(e.target.value)} />
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="btn-primary-gradient">
                                <Plus className="mr-2 h-4 w-4" /> Novo
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                             <DropdownMenuItem asChild>
                                <Link href="/dashboard/document-editor"><FileText className="mr-2 h-4 w-4" />Documento</Link>
                             </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => toast({title: "Em breve!"})}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" />Planilha
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => toast({title: "Em breve!"})}>
                                <FileVideo className="mr-2 h-4 w-4" />Apresentação
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem onSelect={handleUploadClick}>
                                <UploadCloud className="mr-2 h-4 w-4" />Carregar Ficheiro
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <QuickActionCard icon={FileText} title="Documento" description="Crie um novo documento de texto." href="/dashboard/document-editor" />
                <QuickActionCard icon={FileSpreadsheet} title="Planilha" description="Crie uma nova planilha." comingSoon />
                <QuickActionCard icon={FileVideo} title="Apresentação" description="Crie uma nova apresentação." comingSoon />
                <QuickActionCard icon={HardDrive} title="Do meu computador" description="Carregue ficheiros do seu dispositivo." onClick={handleUploadClick} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <QuickActionCard icon={Globe} title="Do Google Drive" description="Importe do Google Drive." comingSoon />
                <QuickActionCard icon={HardDrive} title="Do Dropbox" description="Importe do Dropbox." comingSoon />
            </div>

            <Card className="gradient-surface border-0 rounded-2xl">
                <CardContent className="p-4">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-border hover:bg-transparent">
                                <TableHead onClick={() => handleSort('title')} className="cursor-pointer"><span className="flex items-center gap-2">Nome <ArrowUpDown className="w-4 h-4"/></span></TableHead>
                                <TableHead onClick={() => handleSort('owner')} className="cursor-pointer"><span className="flex items-center gap-2">Proprietário <ArrowUpDown className="w-4 h-4"/></span></TableHead>
                                <TableHead onClick={() => handleSort('updatedAt')} className="cursor-pointer"><span className="flex items-center gap-2">Última Modificação <ArrowUpDown className="w-4 h-4"/></span></TableHead>
                                <TableHead onClick={() => handleSort('size')} className="cursor-pointer"><span className="flex items-center gap-2">Tamanho <ArrowUpDown className="w-4 h-4"/></span></TableHead>
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
                            {filesError && (
                                <TableRow>
                                  <TableCell colSpan={5} className="h-24 text-center text-red-400">
                                      Erro ao carregar documentos: Permissões insuficientes. Contacte o administrador.
                                  </TableCell>
                                </TableRow>
                            )}
                            {!isUserLoading && !areFilesLoading && !filesError && sortedAndFilteredItems.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center">
                                        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                        <h3 className="mt-4 text-lg font-semibold text-foreground">Sem documentos ainda</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">Comece por criar um novo documento ou carregar um ficheiro.</p>
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isUserLoading && !areFilesLoading && !filesError && sortedAndFilteredItems.map(item => (
                                <TableRow key={item.id} className="border-b-border/50 hover:bg-muted/50">
                                    <TableCell className="font-medium text-foreground flex items-center gap-3">
                                        {getFileIcon(item.type)}
                                        {item.title}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.owner === user?.uid ? 'Eu' : 'Outro'}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDate(item.updatedAt)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{formatSize(item.size)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => toast({title: "Funcionalidade em breve"})}><Share2 className="w-4 h-4 text-primary/80" /></Button>
                                        <a href={item.url} download={item.title} target="_blank" rel="noopener noreferrer">
                                            <Button variant="ghost" size="icon" disabled={item.type === 'folder'}><Download className="w-4 h-4 text-primary/80" /></Button>
                                        </a>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-red-400/80" /></Button>
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
