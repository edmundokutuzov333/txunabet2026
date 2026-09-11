'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Underline from '@tiptap/extension-underline';
import { Bold, Check, Cloud, FileDown, Heading1, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, MessageSquarePlus, Quote, Redo2, RotateCcw, Save, Send, Sparkles, Table2, Undo2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import LinkNext from 'next/link';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser } from '@/firebase';

type DocumentRole = 'owner' | 'editor' | 'viewer';
type JsonContent = Record<string, unknown>;
interface DirectoryUser { uid: string; displayName: string; email: string | null; role: string; departmentIds: string[]; }
interface DocumentVersion { id: string; version: number; createdBy: string; createdAt?: { _seconds?: number }; }
interface DocumentComment { id: string; authorId: string; body: string; selectedText?: string; resolved: boolean; createdAt?: { _seconds?: number }; }
interface LoadedDocument { id: string; companyId: string; title: string; content: JsonContent; contentVersion: number; currentVersion: number; sharedCompany: boolean; }
const EMPTY_DOC: JsonContent = { type: 'doc', content: [{ type: 'paragraph' }] };
const DRAFT_PREFIX = 'oryon-document-draft:';

function message(error: unknown): string { return error instanceof Error ? error.message : 'REQUEST_FAILED'; }
function dateText(value: unknown): string {
  if (!value || typeof value !== 'object' || !('_seconds' in value)) return 'agora';
  return new Date(Number((value as { _seconds: number })._seconds) * 1000).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}
function statsFor(text: string) { return { words: text.trim() ? text.trim().split(/\s+/).length : 0, characters: text.length }; }

export function DocumentWorkspaceV2({ initialDocumentId }: { initialDocumentId?: string }) {
  const { toast } = useToast();
  const { user } = useUser();
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [companyId, setCompanyId] = useState('');
  const [title, setTitle] = useState('Novo documento');
  const [role, setRole] = useState<DocumentRole>('owner');
  const [version, setVersion] = useState(1);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [stats, setStats] = useState({ words: 0, characters: 0 });
  const [aiAction, setAiAction] = useState('rewrite');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [commentText, setCommentText] = useState('');
  const [shareTarget, setShareTarget] = useState('');
  const [shareRole, setShareRole] = useState<'viewer' | 'editor'>('viewer');
  const [shareDepartment, setShareDepartment] = useState('');
  const [sharedCompany, setSharedCompany] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftDirty = useRef(false);
  const loadingRemote = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: EMPTY_DOC,
    immediatelyRender: false,
    editable: role !== 'viewer',
    onUpdate: ({ editor: currentEditor }) => {
      if (loadingRemote.current) return;
      setStats(statsFor(currentEditor.getText()));
      draftDirty.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { void save(false); }, 900);
    },
  });

  const fetchDocument = useCallback(async (id: string) => {
    const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'DOCUMENT_LOAD_FAILED');
    return payload as { document: LoadedDocument; role: DocumentRole };
  }, []);

  const refreshMeta = useCallback(async (id: string) => {
    const [versionResponse, commentResponse, directoryResponse] = await Promise.all([
      fetch(`/api/documents/${encodeURIComponent(id)}/versions`, { cache: 'no-store' }),
      fetch(`/api/documents/${encodeURIComponent(id)}/comments`, { cache: 'no-store' }),
      fetch('/api/users/directory', { cache: 'no-store' }),
    ]);
    if (versionResponse.ok) setVersions((await versionResponse.json()).versions ?? []);
    if (commentResponse.ok) setComments((await commentResponse.json()).comments ?? []);
    if (directoryResponse.ok) setDirectory((await directoryResponse.json()).users ?? []);
  }, []);

  const createDocument = useCallback(async () => {
    if (documentId) return documentId;
    const response = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content: EMPTY_DOC, textPreview: '' }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'DOCUMENT_CREATE_FAILED');
    setDocumentId(payload.document.id);
    setCompanyId(payload.document.companyId);
    setVersion(Number(payload.document.contentVersion ?? 1));
    return payload.document.id as string;
  }, [documentId, title]);

  useEffect(() => {
    if (typeof navigator !== 'undefined') setOffline(!navigator.onLine);
    const online = () => { setOffline(false); if (draftDirty.current) void save(true); };
    const offlineEvent = () => setOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offlineEvent);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offlineEvent); };
  }, []);

  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    const boot = async () => {
      try {
        const id = await createDocument();
        if (cancelled) return;
        const pendingKey = `${DRAFT_PREFIX}${id}`;
        const pending = localStorage.getItem(pendingKey);
        try {
          const loaded = await fetchDocument(id);
          if (cancelled) return;
          loadingRemote.current = true;
          setCompanyId(loaded.document.companyId);
          setRole(loaded.role);
          setTitle(loaded.document.title || 'Novo documento');
          setVersion(Number(loaded.document.contentVersion ?? 1));
          setSharedCompany(Boolean(loaded.document.sharedCompany));
          editor.commands.setEditable(loaded.role !== 'viewer');
          editor.commands.setContent(loaded.document.content || EMPTY_DOC, false);
          setStats(statsFor(editor.getText()));
          queueMicrotask(() => { loadingRemote.current = false; });
          await refreshMeta(id);
          if (pending && loaded.role !== 'viewer') {
            const draft = JSON.parse(pending) as { title: string; content: JsonContent; baseVersion: number };
            if (confirm('Existe trabalho local não sincronizado. Pretende recuperá-lo?')) {
              setTitle(draft.title || loaded.document.title);
              loadingRemote.current = true;
              editor.commands.setContent(draft.content || EMPTY_DOC, false);
              setVersion(draft.baseVersion || Number(loaded.document.contentVersion ?? 1));
              queueMicrotask(() => { loadingRemote.current = false; draftDirty.current = true; void save(true); });
            } else localStorage.removeItem(pendingKey);
          }
        } catch (error) {
          if (!pending) throw error;
          const draft = JSON.parse(pending) as { title: string; content: JsonContent; baseVersion: number };
          setTitle(draft.title || 'Rascunho recuperado');
          setVersion(draft.baseVersion || 1);
          loadingRemote.current = true;
          editor.commands.setContent(draft.content || EMPTY_DOC, false);
          queueMicrotask(() => { loadingRemote.current = false; draftDirty.current = true; });
          toast({ title: 'Modo offline', description: 'O rascunho local foi recuperado.' });
        }
      } catch (error) { toast({ title: 'Editor', description: message(error), variant: 'destructive' }); }
    };
    void boot();
    return () => { cancelled = true; };
  }, [editor, createDocument, fetchDocument, refreshMeta, toast]);

  const save = useCallback(async (checkpoint: boolean) => {
    if (!editor || !documentId || role === 'viewer') return;
    const content = editor.getJSON() as JsonContent;
    const text = editor.getText();
    const payload = { title: title.trim().slice(0, 240) || 'Novo documento', content, textPreview: text.slice(0, 500), checkpoint, expectedVersion: version };
    if (offline || !navigator.onLine) {
      localStorage.setItem(`${DRAFT_PREFIX}${documentId}`, JSON.stringify({ ...payload, baseVersion: version }));
      setLastSaved(null); return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'DOCUMENT_SAVE_FAILED');
      setVersion(Number(result.document.contentVersion ?? version));
      setLastSaved(new Date());
      draftDirty.current = false;
      localStorage.removeItem(`${DRAFT_PREFIX}${documentId}`);
      if (checkpoint) await refreshMeta(documentId);
    } catch (error) {
      const textError = message(error);
      localStorage.setItem(`${DRAFT_PREFIX}${documentId}`, JSON.stringify({ ...payload, baseVersion: version }));
      if (textError === 'DOCUMENT_VERSION_CONFLICT') toast({ title: 'Conflito de versão', description: 'O seu rascunho foi preservado localmente.', variant: 'destructive' });
    } finally { setSaving(false); }
  }, [editor, documentId, role, title, version, offline, refreshMeta, toast]);

  const requestAI = async () => {
    if (!editor || !documentId) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, '\n').trim();
    const source = selected || editor.getText().trim();
    if (!source) { toast({ title: 'OryonAI', description: 'Escreva ou seleccione texto primeiro.', variant: 'destructive' }); return; }
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: aiAction, prompt: source, contextType: 'document', contextId: documentId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'AI_REQUEST_FAILED');
      setAiSuggestion(result.suggestion ?? '');
    } catch (error) { toast({ title: 'OryonAI', description: message(error), variant: 'destructive' }); }
    finally { setAiLoading(false); }
  };

  const applySuggestion = () => {
    if (!editor || !aiSuggestion.trim() || role === 'viewer') return;
    const { from, to } = editor.state.selection;
    if (aiAction === 'title') setTitle(aiSuggestion.split('\n')[0].replace(/^#+\s*/, '').trim().slice(0, 240));
    else if (from !== to) editor.chain().focus().deleteRange({ from, to }).insertContent(aiSuggestion).run();
    else editor.chain().focus().insertContent(aiSuggestion).run();
    setAiSuggestion('');
    void save(true);
  };

  const addComment = async () => {
    if (!editor || !documentId || !commentText.trim() || role === 'viewer') return;
    const { from, to } = editor.state.selection;
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: commentText, selectedText: editor.state.doc.textBetween(from, to, ' ').slice(0, 1000), anchorFrom: from, anchorTo: to }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'COMMENT_FAILED');
      setComments((items) => [...items, result.comment]); setCommentText('');
    } catch (error) { toast({ title: 'Comentário', description: message(error), variant: 'destructive' }); }
  };

  const restore = async (targetVersion: number) => {
    if (!documentId || role === 'viewer') return;
    if (!confirm(`Restaurar a versão ${targetVersion}? Será criada uma nova versão.`)) return;
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/versions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: targetVersion }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'RESTORE_FAILED');
      loadingRemote.current = true; setTitle(result.document.title); setVersion(Number(result.document.contentVersion)); editor?.commands.setContent(result.document.content || EMPTY_DOC, false); queueMicrotask(() => { loadingRemote.current = false; }); await refreshMeta(documentId);
      toast({ title: 'Histórico', description: `Versão ${targetVersion} restaurada.` });
    } catch (error) { toast({ title: 'Histórico', description: message(error), variant: 'destructive' }); }
  };

  const share = async (kind: 'user' | 'department' | 'company') => {
    if (!documentId || role !== 'owner') return;
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, targetId: kind === 'user' ? shareTarget : kind === 'department' ? shareDepartment : undefined, role: shareRole }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'SHARE_FAILED');
      setSharedCompany(Boolean(result.document.sharedCompany)); toast({ title: 'Partilha', description: 'Permissões actualizadas.' });
    } catch (error) { toast({ title: 'Partilha', description: message(error), variant: 'destructive' }); }
  };

  const insertImage = async (file?: File) => {
    if (!editor || !documentId || !companyId || !user || role === 'viewer' || !file) return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { toast({ title: 'Imagem', description: 'Use uma imagem até 10 MB.', variant: 'destructive' }); return; }
    try {
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-120);
      const path = `companies/${companyId}/documents/${documentId}/${user.uid}/${Date.now()}_${safeName}`;
      const ref = storageRef(getStorage(), path);
      await uploadBytes(ref, file, { contentType: file.type });
      editor.chain().focus().setImage({ src: await getDownloadURL(ref), alt: file.name.slice(0, 120) }).run();
      void save(true);
    } catch (error) { toast({ title: 'Imagem', description: message(error), variant: 'destructive' }); }
  };

  const exportJson = async () => {
    if (!documentId) return;
    const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/export`);
    if (!response.ok) { toast({ title: 'Exportação', description: 'Não foi possível exportar.', variant: 'destructive' }); return; }
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${title || 'documento'}.json`; link.click(); URL.revokeObjectURL(url);
  };

  const collaborators = useMemo(() => directory.filter((entry) => entry.uid !== user?.uid), [directory, user?.uid]);
  const canEdit = role !== 'viewer';
  if (!editor) return <div className="p-8 text-muted-foreground">A preparar o editor...</div>;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="border-b border-border bg-card/70 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><LinkNext href="/dashboard/documents" className="text-xs text-muted-foreground">Documentos</LinkNext><span className="text-xs text-muted-foreground">/</span><Input value={title} disabled={!canEdit} onChange={(e) => { setTitle(e.target.value.slice(0, 240)); void save(false); }} className="h-8 max-w-xl border-transparent bg-transparent px-2 text-lg font-semibold" /></div><div className="flex items-center gap-3 px-2 text-[11px] text-muted-foreground">{saving ? <><Loader2 className="h-3 w-3 animate-spin" />A guardar...</> : lastSaved ? <><Check className="h-3 w-3" />Guardado</> : offline ? <><Cloud className="h-3 w-3" />Offline, rascunho local</> : <><Cloud className="h-3 w-3" />Autosave activo</>}<span>v{version}</span><span>{role === 'owner' ? 'Proprietário' : role === 'editor' ? 'Editor' : 'Visualizador'}</span></div></div>
          <Button variant="outline" size="sm" onClick={() => void save(true)} disabled={!canEdit || saving}><Save className="mr-2 h-4 w-4" />Checkpoint</Button><Button variant="outline" size="sm" onClick={() => void exportJson()}><FileDown className="mr-2 h-4 w-4" />Exportar</Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="sticky top-0 z-10 border-b border-border bg-background/95 p-2 backdrop-blur"><div className="flex flex-wrap items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!canEdit}><Undo2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!canEdit}><Redo2 className="h-4 w-4" /></Button><div className="mx-1 h-6 w-px bg-border" />
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!canEdit}><Bold className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!canEdit}><Italic className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!canEdit}><span className="underline font-bold">U</span></Button>
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!canEdit}><Heading1 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!canEdit}><Heading2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!canEdit}><List className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={!canEdit}><ListOrdered className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} disabled={!canEdit}><Quote className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { const url = prompt('URL do link'); if (url) editor.chain().focus().setLink({ href: url }).run(); }} disabled={!canEdit}><Link2 className="h-4 w-4" /></Button><label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted"><ImagePlus className="h-4 w-4" /><input type="file" className="hidden" accept="image/*" disabled={!canEdit} onChange={(e) => { void insertImage(e.target.files?.[0]); e.target.value = ''; }} /></label><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} disabled={!canEdit}><Table2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={addComment} disabled={!canEdit || !commentText.trim()}><MessageSquarePlus className="h-4 w-4" /></Button>
          </div></div>
          <article className="mx-auto max-w-5xl px-6 py-10 md:px-14"><EditorContent editor={editor} className="oryon-tiptap min-h-[70vh] outline-none" /></article>
          <footer className="sticky bottom-0 border-t border-border bg-background/95 px-5 py-2 text-xs text-muted-foreground"><div className="mx-auto flex max-w-5xl items-center justify-between"><span>{stats.words} palavras · {stats.characters} caracteres</span><span>{offline ? 'Sem ligação: rascunho local' : 'Sincronização automática'}</span></div></footer>
        </main>
        <aside className="hidden w-[360px] shrink-0 overflow-auto border-l border-border bg-card/30 xl:block"><Tabs defaultValue="ai" className="w-full"><TabsList className="m-3 grid w-[calc(100%-24px)] grid-cols-4"><TabsTrigger value="ai">IA</TabsTrigger><TabsTrigger value="comments">Comentários</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger><TabsTrigger value="share">Partilha</TabsTrigger></TabsList>
          <TabsContent value="ai" className="space-y-4 px-4 pb-6"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" />OryonAI</CardTitle></CardHeader><CardContent className="space-y-3"><Select value={aiAction} onValueChange={setAiAction}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['ask','write','rewrite','summarize','correct','translate','tone','expand','shorten','title','structure','extractTasks','extractDecisions'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Button className="w-full" onClick={() => void requestAI()} disabled={aiLoading}>{aiLoading ? 'A processar...' : 'Gerar sugestão'}</Button><Textarea value={aiSuggestion} onChange={(e) => setAiSuggestion(e.target.value)} className="min-h-44" placeholder="A sugestão aparece aqui para revisão." /><div className="flex gap-2"><Button className="flex-1" onClick={applySuggestion} disabled={!aiSuggestion.trim() || !canEdit}><Check className="mr-2 h-4 w-4" />Aplicar</Button><Button variant="outline" onClick={() => setAiSuggestion('')} disabled={!aiSuggestion}>Limpar</Button></div></CardContent></Card></TabsContent>
          <TabsContent value="comments" className="space-y-4 px-4 pb-6"><Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Comentário sobre a selecção..." disabled={!canEdit} /><Button className="w-full" onClick={() => void addComment()} disabled={!canEdit || !commentText.trim()}><Send className="mr-2 h-4 w-4" />Comentar</Button>{comments.map((comment) => <Card key={comment.id} className={comment.resolved ? 'opacity-60' : ''}><CardContent className="pt-5"><p className="whitespace-pre-wrap text-sm">{comment.body}</p>{comment.selectedText && <blockquote className="mt-3 border-l-2 border-primary pl-3 text-xs text-muted-foreground">{comment.selectedText}</blockquote>}<div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>{dateText(comment.createdAt)}</span><Button size="sm" variant="ghost" onClick={() => fetch(`/api/documents/${documentId}/comments`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commentId: comment.id, resolved: !comment.resolved }) }).then(() => setComments((items) => items.map((item) => item.id === comment.id ? { ...item, resolved: !item.resolved } : item)))}>{comment.resolved ? 'Reabrir' : 'Resolver'}</Button></div></CardContent></Card>)}</TabsContent>
          <TabsContent value="history" className="space-y-3 px-4 pb-6">{versions.map((entry) => <Card key={entry.id}><CardContent className="flex items-center justify-between gap-3 pt-5"><div><div className="font-medium">Versão {entry.version}</div><div className="text-xs text-muted-foreground">por {entry.createdBy.slice(0, 12)} · {dateText(entry.createdAt)}</div></div><Button size="sm" variant="outline" disabled={!canEdit || entry.version === version} onClick={() => void restore(entry.version)}><RotateCcw className="mr-2 h-3 w-3" />Restaurar</Button></CardContent></Card>)}</TabsContent>
          <TabsContent value="share" className="space-y-4 px-4 pb-6">{role !== 'owner' ? <p className="text-sm text-muted-foreground">A partilha é gerida pelo proprietário.</p> : <><Select value={shareTarget} onValueChange={setShareTarget}><SelectTrigger><SelectValue placeholder="Escolher colaborador" /></SelectTrigger><SelectContent>{collaborators.map((entry) => <SelectItem key={entry.uid} value={entry.uid}>{entry.displayName || entry.email || entry.uid}</SelectItem>)}</SelectContent></Select><Select value={shareRole} onValueChange={(value) => setShareRole(value as 'viewer' | 'editor')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="viewer">Visualizador</SelectItem><SelectItem value="editor">Editor</SelectItem></SelectContent></Select><Button className="w-full" onClick={() => void share('user')} disabled={!shareTarget}><Users className="mr-2 h-4 w-4" />Partilhar com pessoa</Button><Input value={shareDepartment} onChange={(e) => setShareDepartment(e.target.value)} placeholder="ID do departamento" /><Button className="w-full" variant="outline" onClick={() => void share('department')} disabled={!shareDepartment}>Partilhar com departamento</Button><Button className="w-full" variant={sharedCompany ? 'outline' : 'default'} onClick={() => void share('company')}>{sharedCompany ? 'Já partilhado com a empresa' : 'Partilhar com a empresa'}</Button></>}</TabsContent>
        </Tabs></aside>
      </div>
    </div>
  );
}
