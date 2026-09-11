'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, UploadCloud, Download, Trash2, FolderPlus, Folder, File as FileIcon, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type CloudItem = { id: string; type?: string; name?: string; size?: number; mimeType?: string; storagePath?: string; folderId?: string | null };

export default function ProductionCloudView() {
  const { toast } = useToast();
  const [items, setItems] = useState<CloudItem[]>([]);
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/modules/cloud', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Falha ao carregar ficheiros');
      setItems(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Cloud', description: error instanceof Error ? error.message : 'Falha ao carregar' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/modules/cloud/upload', { method: 'POST', body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Falha no upload');
      toast({ title: 'Upload concluído', description: `${file.name} foi guardado no Storage.` });
      await load();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload falhou', description: error instanceof Error ? error.message : 'Falha no upload' });
    } finally { setUploading(false); }
  };

  const createFolder = async () => {
    if (!folderName.trim()) return;
    try {
      const response = await fetch('/api/modules/cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: folderName.trim(), type: 'folder' }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Falha ao criar pasta');
      setFolderName('');
      await load();
    } catch (error) { toast({ variant: 'destructive', title: 'Cloud', description: error instanceof Error ? error.message : 'Falha' }); }
  };

  const download = async (item: CloudItem) => {
    try {
      const response = await fetch(`/api/modules/cloud/download?id=${encodeURIComponent(item.id)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Falha no download');
      window.open(payload.url, '_blank', 'noopener,noreferrer');
    } catch (error) { toast({ variant: 'destructive', title: 'Download', description: error instanceof Error ? error.message : 'Falha' }); }
  };

  const remove = async (item: CloudItem) => {
    try {
      const response = await fetch(`/api/modules/cloud?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      if (!response.ok) { const payload = await response.json(); throw new Error(payload.error ?? 'Falha ao apagar'); }
      await load();
    } catch (error) { toast({ variant: 'destructive', title: 'Cloud', description: error instanceof Error ? error.message : 'Falha' }); }
  };

  const files = items.filter((item) => item.type !== 'folder');
  const used = files.reduce((sum, item) => sum + Number(item.size ?? 0), 0);

  return (
    <div className="p-6 fade-in space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h1 className="text-3xl font-bold">Minha Nuvem</h1><p className="text-muted-foreground mt-1">Storage empresarial real, com metadados persistidos no Firestore.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/> Actualizar</Button><label className="inline-flex cursor-pointer"><input type="file" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ''; }}/><Button asChild disabled={uploading}><span><UploadCloud className="mr-2 h-4 w-4"/>{uploading ? 'A carregar...' : 'Upload'}</span></Button></label></div></div>
      <div className="grid gap-4 md:grid-cols-3"><Card className="gradient-surface border-0 rounded-2xl"><CardContent className="p-6"><div className="text-sm text-muted-foreground">Ficheiros</div><div className="text-3xl font-bold mt-1">{files.length}</div></CardContent></Card><Card className="gradient-surface border-0 rounded-2xl"><CardContent className="p-6"><div className="text-sm text-muted-foreground">Armazenamento utilizado</div><div className="text-3xl font-bold mt-1">{(used / 1073741824).toFixed(2)} GB</div></CardContent></Card><Card className="gradient-surface border-0 rounded-2xl"><CardContent className="p-6"><div className="text-sm text-muted-foreground">Pastas</div><div className="text-3xl font-bold mt-1">{items.filter((item) => item.type === 'folder').length}</div></CardContent></Card></div>
      <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><FolderPlus className="h-5 w-5"/> Nova pasta</CardTitle></CardHeader><CardContent className="flex gap-2"><Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Nome da pasta"/><Button onClick={() => void createFolder()}>Criar</Button></CardContent></Card>
      <Card className="gradient-surface border-0 rounded-2xl"><CardHeader><CardTitle>Conteúdo</CardTitle></CardHeader><CardContent>{loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin"/></div> : items.length === 0 ? <div className="py-16 text-center text-muted-foreground">A nuvem está vazia. Faça o primeiro upload ou crie uma pasta.</div> : <div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/60 p-4"><div className="flex min-w-0 items-center gap-3">{item.type === 'folder' ? <Folder className="h-5 w-5 text-primary"/> : <FileIcon className="h-5 w-5"/>}<div className="min-w-0"><div className="font-medium truncate">{item.name}</div><div className="text-xs text-muted-foreground">{item.type === 'folder' ? 'Pasta' : `${(Number(item.size ?? 0) / 1048576).toFixed(2)} MB · ${item.mimeType ?? 'ficheiro'}`}</div></div></div><div className="flex gap-2">{item.type !== 'folder' && <Button variant="ghost" size="icon" onClick={() => void download(item)} aria-label="Download"><Download className="h-4 w-4"/></Button>}<Button variant="ghost" size="icon" onClick={() => void remove(item)} aria-label="Apagar"><Trash2 className="h-4 w-4 text-destructive"/></Button></div></div>)}</div>}</CardContent></Card>
    </div>
  );
}
