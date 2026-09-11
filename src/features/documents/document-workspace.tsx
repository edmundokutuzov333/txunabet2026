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
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Clock3,
  Cloud,
  FileDown,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  MessageSquarePlus,
  Minus,
  MoreHorizontal,
  Plus,
  Quote,
  Redo2,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import LinkNext from 'next/link';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirebaseApp, useUser } from '@/firebase';

interface DirectoryUser { uid: string; displayName: string; email: string | null; role: string; departmentIds: string[]; }
interface DocumentVersion { id: string; version: number; createdBy: string; createdAt?: { _seconds?: number }; restoredFromVersion?: number; }
interface DocumentComment { id: string; authorId: string; body: string; selectedText?: string; resolved: boolean; createdAt?: { _seconds?: number }; }

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };
const DRAFT_PREFIX = 'oryon-document-draft:';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'REQUEST_FAILED';
}

function formatTimestamp(value: unknown): string {
  if (!value) return 'agora';
  const seconds = typeof value === 'object' && value !== null && '_seconds' in value ? Number((value as { _seconds: number })._seconds) : 0;
  if (!seconds) return 'agora';
  return new Date(seconds * 1000).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}

export function DocumentWorkspace({ documentId: initialDocumentId }: { documentId?: string }) {
  const { toast } = useToast();
  const { user } = useUser();
  const app = useFirebaseApp();
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [title, setTitle] = useState('Novo documento');
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer'>('owner');
  const [version, setVersion] = useState(1);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiAction, setAiAction] = useState('rewrite');
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [commentText, setCommentText] = useState('');
  const [shareTarget, setShareTarget] = useState('');
  const [shareRole, setShareRole] = useState<'viewer' | 'editor'>('viewer');
  const [shareDepartment, setShareDepartment] = useState('');
  const [sharedCompany, setSharedCompany] = useState(false);
  const [stats, setStats] = useState({ words: 0, characters: 0 });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkpointTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestState = useRef({ title, version, documentId });
  const applyingRemote = useRef(false);

  useEffect(() => { latestState.current = { title, version, documentId }; }, [title, version, documentId]);

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
    editable: true,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      if (applyingRemote.current) return;
      const text = currentEditor.getText();
      setStats({ words: text.trim() ? text.trim().split(/\s+/).length : 0, characters: text.length });
      scheduleSave(false);
    },
  });

  const fetchDocument = useCallback(async (id: string) => {
    const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'DOCUMENT_LOAD_FAILED');
    return payload as { document: { id: string; title: string; content: Record<string, unknown>; contentVersion: number; currentVersion: number; viewerIds: string[]; editorIds: string[]; sharedCompany: boolean }; role: 'owner' | 'editor' | 'viewer' };
  }, []);

  const refreshSideData = useCallback(async (id: string) => {
    const [versionsResponse, commentsResponse, directoryResponse] = await Promise.all([
      fetch(`/api/documents/${encodeURIComponent(id)}/versions`, { cache: 'no-store' }),
      fetch(`/api/documents/${encodeURIComponent(id)}/comments`, { cache: 'no-store' }),
      fetch('/api/users/directory', { cache: 'no-store' }),
    ]);
    if (versionsResponse.ok) setVersions((await versionsResponse.json()).versions ?? []);
    if (commentsResponse.ok) setComments((await commentsResponse.json()).comments ?? []);
    if (directoryResponse.ok) setDirectory((await directoryResponse.json()).users ?? []);
  }, []);

  const createIfNeeded = useCallback(async () => {
    if (documentId) return documentId;
    const response = await fetch('/api/documents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Novo documento', content: EMPTY_DOC, textPreview: '' }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'DOCUMENT_CREATE_FAILED');
    setDocumentId(payload.document.id);
    setVersion(payload.document.contentVersion ?? 1);
    return payload.document.id as string;
  }, [documentId]);

  const applyLoadedDocument = useCallback((payload: Awaited<ReturnType<typeof fetchDocument>>) => {
    applyingRemote.current = true;
    setTitle(payload.document.title || 'Novo documento');
    setRole(payload.role);
    setVersion(Number(payload.document.contentVersion ?? 1));
    setSharedCompany(Boolean(payload.document.sharedCompany));
    editor?.commands.setContent(payload.document.content || EMPTY_DOC, false);
    const text = editor?.getText() ?? '';
    setStats({ words: text.trim() ? text.trim().split(/\s+/).length : 0, characters: text.length });
    queueMicrotask(() => { applyingRemote.current = false; });
  }, [editor]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        const id = await createIfNeeded();
        if (cancelled || !id) return;
        const pending = typeof window !== 'undefined' ? localStorage.getItem(`${DRAFT_PREFIX}${id}`) : null;
        try {
          const remote = await fetchDocument(id);
          if (cancelled) return;
          applyLoadedDocument(remote);
          await refreshSideData(id);
          if (pending && remote.role !== 'viewer') {
            const draft = JSON.parse(pending) as { title: string; content: Record<string, unknown>; baseVersion: number };
            const applyDraft = confirm('Foi encontrado trabalho local ainda não sincronizado. Pretende recuperar esse rascunho?');
            if (applyDraft) {
              setTitle(draft.title || remote.document.title);
              applyingRemote.current = true;
              editor?.commands.setContent(draft.content || EMPTY_DOC, false);
              queueMicrotask(() => { applyingRemote.current = false; scheduleSave(true); });
            } else localStorage.removeItem(`${DRAFT_PREFIX}${id}`);
          }
        } catch (error) {
          const draft = pending ? JSON.parse(pending) as { title: string; content: Record<string, unknown>; baseVersion: number } : null;
          if (draft) {
            setTitle(draft.title || 'Rascunho recuperado');
            setVersion(draft.baseVersion || 1);
            applyingRemote.current = true;
            editor?.commands.setContent(draft.content || EMPTY_DOC, false);
            queueMicrotask(() => { applyingRemote.current = false; });
            toast({ title: 'Modo offline', description: 'O rascunho local foi recuperado e será sincronizado quando a ligação voltar.' });
          } else throw error;
        }
      } catch (error) {
        toast({ title: 'Erro no editor', description: errorText(error), variant: 'destructive' });
      }
    };
    if (editor) void boot();
    return () => { cancelled = true; };
  }, [editor, createIfNeeded, fetchDocument, applyLoadedDocument, refreshSideData, toast]);

  useEffect(() => {
    const onOnline = () => { setOffline(false); void saveNow(true); };
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  });

  const scheduleSave = useCallback((checkpoint: boolean) => {
    if (!editor || role === 'viewer') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveNow(checkpoint); }, 900);
  }, [editor, role]);

  const saveNow = useCallback(async (checkpoint: boolean) => {
    if (!editor || !documentId || role === 'viewer') return;
    const content = editor.getJSON() as Record<string, unknown>;
    const text = editor.getText();
    const currentTitle = title.trim() || 'Novo documento';
    const payload = { title: currentTitle, content, textPreview: text.slice(0, 500), checkpoint, expectedVersion: version };
    if (offline || !navigator.onLine) {
      localStorage.setItem(`${DRAFT_PREFIX}${documentId}`, JSON.stringify({ ...payload, baseVersion: version }));
      setLastSaved(null);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'DOCUMENT_SAVE_FAILED');
      setVersion(Number(result.document.contentVersion ?? version));
      setLastSaved(new Date());
      localStorage.removeItem(`${DRAFT_PREFIX}${documentId}`);
    } catch (error) {
      const message = errorText(error);
      if (message === 'DOCUMENT_VERSION_CONFLICT') {
        toast({ title: 'Conflito de edição', description: 'O documento mudou no servidor. O seu trabalho ficou guardado localmente para não ser perdido.', variant: 'destructive' });
      }
      localStorage.setItem(`${DRAFT_PREFIX}${documentId}`, JSON.stringify({ ...payload, baseVersion: version }));
      setLastSaved(null);
    } finally { setSaving(false); }
  }, [editor, documentId, role, title, version, offline, toast]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (checkpointTimer.current) clearTimeout(checkpointTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!editor || role === 'viewer') return;
    const handler = () => scheduleSave(false);
    const timer = setInterval(handler, 12_000);
    return () => clearInterval(timer);
  }, [editor, role, scheduleSave]);

  const callAI = async () => {
    if (!editor || !documentId) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, '\n').trim();
    const target = selected || editor.getText().trim();
    if (!target) { toast({ title: 'Sem conteúdo', description: 'Escreva ou selecione texto antes de chamar o OryonAI.', variant: 'destructive' }); return; }
    setAiLoading(aiAction);
    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: aiAction, prompt: target, contextType: 'document', contextId: documentId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'AI_REQUEST_FAILED');
      setAiSuggestion(result.suggestion ?? '');
    } catch (error) { toast({ title: 'OryonAI', description: errorText(error), variant: 'destructive' }); }
    finally { setAiLoading(null); }
  };

  const applyAISuggestion = () => {
    if (!editor || !aiSuggestion.trim()) return;
    if (aiAction === 'title') setTitle(aiSuggestion.split('\n')[0].replace(/^#+\s*/, '').slice(0, 240));
    else editor.chain().focus().insertContent(aiSuggestion.replace(/\n/g, '\n\n')).run();
    setAiSuggestion('');
    scheduleSave(true);
    toast({ title: 'Sugestão aplicada', description: 'A alteração passou pelo controlo do editor e será guardada.' });
  };

  const addComment = async () => {
    if (!editor || !documentId || !commentText.trim() || role === 'viewer') return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ').slice(0, 1000);
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: commentText, selectedText, anchorFrom: from, anchorTo: to }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'COMMENT_FAILED');
      setComments((prev) => [...prev, result.comment]);
      setCommentText('');
    } catch (error) { toast({ title: 'Comentário', description: errorText(error), variant: 'destructive' }); }
  };

  const resolveComment = async (commentId: string, resolved: boolean) => {
    if (!documentId) return;
    const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/comments`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commentId, resolved }) });
    if (response.ok) setComments((prev) => prev.map((comment) => comment.id === commentId ? { ...comment, resolved } : comment));
  };

  const restore = async (targetVersion: number) => {
    if (!documentId || role === 'viewer') return;
    if (!confirm(`Restaurar a versão ${targetVersion}? Será criada uma nova versão com o estado restaurado.`)) return;
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/versions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: targetVersion }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'RESTORE_FAILED');
      applyingRemote.current = true;
      setTitle(result.document.title);
      setVersion(result.document.contentVersion);
      editor?.commands.setContent(result.document.content || EMPTY_DOC, false);
      queueMicrotask(() => { applyingRemote.current = false; });
      await refreshSideData(documentId);
      toast({ title: 'Versão restaurada', description: `Versão ${targetVersion} restaurada com segurança.` });
    } catch (error) { toast({ title: 'Histórico', description: errorText(error), variant: 'destructive' }); }
  };

  const share = async (kind: 'user' | 'department' | 'company') => {
    if (!documentId || role !== 'owner') return;
    const targetId = kind === 'user' ? shareTarget : kind === 'department' ? shareDepartment : undefined;
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, targetId, role: shareRole }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'SHARE_FAILED');
      setSharedCompany(Boolean(result.document.sharedCompany));
      toast({ title: 'Partilha actualizada', description: kind === 'company' ? 'Documento partilhado com a empresa.' : 'Permissões actualizadas.' });
    } catch (error) { toast({ title: 'Partilha', description: errorText(error), variant: 'destructive' }); }
  };

  const insertImage = async (file?: File) => {
    if (!editor || !documentId || role === 'viewer' || !file || !app || !user) return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { toast({ title: 'Imagem inválida', description: 'Use uma imagem até 10 MB.', variant: 'destructive' }); return; }
    try {
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-120);
      const path = `companies/${latestState.current.documentId ? 'documents' : 'documents'}/${documentId}/${user.uid}/${Date.now()}_${safeName}`;
      const fileRef = storageRef(getStorage(app), path);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      editor.chain().focus().setImage({ src: url, alt: file.name.slice(0, 120) }).run();
      scheduleSave(true);
    } catch (error) { toast({ title: 'Imagem', description: errorText(error), variant: 'destructive' }); }
  };

  const exportDocument = async () => {
    if (!documentId) return;
    const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/export`);
    if (!response.ok) { toast({ title: 'Exportação', description: 'Não foi possível exportar o documento.', variant: 'destructive' }); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${title || 'documento'}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const usersByName = useMemo(() => directory.filter((entry) => entry.uid !== user?.uid), [directory, user?.uid]);
  const canEdit = role !== 'viewer';

  if (!editor) return <div className="p-8 text-muted-foreground">A preparar o editor...</div>;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="border-b border-border bg-card/70 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <LinkNext href="/dashboard/documents" className="text-xs text-muted-foreground hover:text-foreground">Documentos</LinkNext>
              <span className="text-xs text-muted-foreground">/</span>
              <Input aria-label="Título do documento" value={title} disabled={!canEdit} onChange={(e) => { setTitle(e.target.value.slice(0, 240)); scheduleSave(false); }} className="h-8 max-w-xl border-transparent bg-transparent px-2 text-lg font-semibold focus:border-border" />
            </div>
            <div className="flex items-center gap-3 px-2 text-[11px] text-muted-foreground">
              {saving ? <><Loader2 className="h-3 w-3 animate-spin" /> A guardar...</> : lastSaved ? <><Check className="h-3 w-3" /> Guardado {lastSaved.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</> : offline ? <><Cloud className="h-3 w-3" /> Offline, rascunho local</> : <><Cloud className="h-3 w-3" /> Pronto para guardar</>}
              <span>v{version}</span>
              <span>{role === 'owner' ? 'Proprietário' : role === 'editor' ? 'Editor' : 'Visualizador'}</span>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="outline" size="sm" onClick={() => void saveNow(true)} disabled={!canEdit || saving}><Save className="mr-2 h-4 w-4" />Checkpoint</Button>
            <Button variant="outline" size="sm" onClick={() => void exportDocument()}><FileDown className="mr-2 h-4 w-4" />Exportar</Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto">
          <div className="sticky top-0 z-10 border-b border-border bg-background/95 p-2 backdrop-blur">
            <div className="flex flex-wrap items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!canEdit} title="Desfazer"><Undo2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!canEdit} title="Refazer"><Redo2 className="h-4 w-4" /></Button>
              <div className="mx-1 h-6 w-px bg-border" />
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!canEdit} title="Bold"><Bold className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!canEdit} title="Italic"><Italic className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!canEdit} title="Underline"><UnderlineIcon className="h-4 w-4" /></Button>
              <div className="mx-1 h-6 w-px bg-border" />
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!canEdit} title="Título 1"><Heading1 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!canEdit} title="Título 2"><Heading2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!canEdit} title="Lista"><List className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={!canEdit} title="Lista numerada"><ListOrdered className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} disabled={!canEdit} title="Citação"><Quote className="h-4 w-4" /></Button>
              <div className="mx-1 h-6 w-px bg-border" />
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('left').run()} disabled={!canEdit} title="Esquerda"><AlignLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('center').run()} disabled={!canEdit} title="Centro"><AlignCenter className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('right').run()} disabled={!canEdit} title="Direita"><AlignRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { const url = prompt('URL do link'); if (url) editor.chain().focus().setLink({ href: url }).run(); }} disabled={!canEdit} title="Link"><Link2 className="h-4 w-4" /></Button>
              <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted" title="Inserir imagem"><ImagePlus className="h-4 w-4" /><input type="file" accept="image/*" className="hidden" onChange={(e) => { void insertImage(e.target.files?.[0]); e.target.value = ''; }} disabled={!canEdit} /></label>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} disabled={!canEdit} title="Tabela"><Table2 className="h-4 w-4" /></Button>
              <div className="ml-auto flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={addComment} disabled={!canEdit || !editor.state.selection.from || !commentText.trim()} title="Adicionar comentário"><MessageSquarePlus className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setAiSuggestion('')} title="Limpar IA"><Sparkles className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          <article className="mx-auto max-w-5xl px-6 py-10 md:px-14">
            <EditorContent editor={editor} className="oryon-tiptap min-h-[70vh] outline-none" />
          </article>

          <div className="sticky bottom-0 border-t border-border bg-background/95 px-5 py-2 text-xs text-muted-foreground backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between"><span>{stats.words} palavras · {stats.characters} caracteres</span><span>{offline ? 'Sem ligação: trabalho guardado no dispositivo' : 'Autosave activo'}</span></div>
          </div>
        </div>

        <aside className="hidden w-[360px] shrink-0 overflow-auto border-l border-border bg-card/30 xl:block">
          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="m-3 grid w-[calc(100%-24px)] grid-cols-4"><TabsTrigger value="ai">IA</TabsTrigger><TabsTrigger value="comments">Comentários</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger><TabsTrigger value="share">Partilha</TabsTrigger></TabsList>
            <TabsContent value="ai" className="space-y-4 px-4 pb-6">
              <Card className="border-border bg-card/60"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" /> OryonAI</CardTitle></CardHeader><CardContent className="space-y-3">
                <Select value={aiAction} onValueChange={setAiAction}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="ask">Perguntar</SelectItem><SelectItem value="write">Escrever</SelectItem><SelectItem value="rewrite">Reescrever</SelectItem><SelectItem value="summarize">Resumir</SelectItem><SelectItem value="correct">Corrigir</SelectItem><SelectItem value="translate">Traduzir</SelectItem><SelectItem value="tone">Alterar tom</SelectItem><SelectItem value="expand">Expandir</SelectItem><SelectItem value="shorten">Encurtar</SelectItem><SelectItem value="title">Criar título</SelectItem><SelectItem value="structure">Criar estrutura</SelectItem><SelectItem value="extractTasks">Extrair tarefas</SelectItem><SelectItem value="extractDecisions">Extrair decisões</SelectItem></SelectContent></Select>
                <Button className="w-full" onClick={() => void callAI()} disabled={!!aiLoading}><Sparkles className="mr-2 h-4 w-4" />{aiLoading ? 'A processar...' : 'Gerar sugestão'}</Button>
                <Textarea value={aiSuggestion} onChange={(e) => setAiSuggestion(e.target.value)} placeholder="A sugestão da IA aparece aqui para revisão antes de aplicar." className="min-h-40" />
                <div className="flex gap-2"><Button className="flex-1" onClick={applyAISuggestion} disabled={!aiSuggestion.trim() || !canEdit}><Check className="mr-2 h-4 w-4" />Aplicar</Button><Button variant="outline" onClick={() => setAiSuggestion('')} disabled={!aiSuggestion}>Limpar</Button></div>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="comments" className="space-y-4 px-4 pb-6">
              <Card className="border-border bg-card/60"><CardContent className="space-y-3 pt-5"><Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Escreva um comentário sobre o texto seleccionado..." disabled={!canEdit} /><Button className="w-full" onClick={() => void addComment()} disabled={!canEdit || !commentText.trim()}><Send className="mr-2 h-4 w-4" />Comentar</Button></CardContent></Card>
              {comments.length === 0 ? <p className="px-2 text-sm text-muted-foreground">Sem comentários.</p> : comments.map((comment) => <Card key={comment.id} className={cn('border-border bg-card/60', comment.resolved && 'opacity-60')}><CardContent className="pt-5"><p className="text-sm whitespace-pre-wrap">{comment.body}</p>{comment.selectedText && <blockquote className="mt-3 border-l-2 border-primary pl-3 text-xs text-muted-foreground">{comment.selectedText}</blockquote>}<div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground"><span>{formatTimestamp(comment.createdAt)}</span><Button variant="ghost" size="sm" onClick={() => void resolveComment(comment.id, !comment.resolved)}>{comment.resolved ? 'Reabrir' : 'Resolver'}</Button></div></CardContent></Card>)}
            </TabsContent>
            <TabsContent value="history" className="space-y-3 px-4 pb-6">
              {versions.map((entry) => <Card key={entry.id} className="border-border bg-card/60"><CardContent className="flex items-center justify-between gap-3 pt-4"><div><div className="font-medium">Versão {entry.version}</div><div className="text-xs text-muted-foreground">por {entry.createdBy.slice(0, 12)} · {formatTimestamp(entry.createdAt)}</div></div><Button variant="outline" size="sm" onClick={() => void restore(entry.version)} disabled={!canEdit || entry.version === version}><RotateCcw className="mr-2 h-3 w-3" />Restaurar</Button></CardContent></Card>)}
            </TabsContent>
            <TabsContent value="share" className="space-y-4 px-4 pb-6">
              {!canEdit || role !== 'owner' ? <p className="text-sm text-muted-foreground">A partilha é gerida pelo proprietário do documento.</p> : <>
                <Card className="border-border bg-card/60"><CardHeader><CardTitle className="text-sm">Partilhar com pessoa</CardTitle></CardHeader><CardContent className="space-y-3"><Select value={shareTarget} onValueChange={setShareTarget}><SelectTrigger><SelectValue placeholder="Escolher colaborador" /></SelectTrigger><SelectContent>{usersByName.map((entry) => <SelectItem key={entry.uid} value={entry.uid}>{entry.displayName || entry.email || entry.uid}</SelectItem>)}</SelectContent></Select><Select value={shareRole} onValueChange={(value) => setShareRole(value as 'viewer' | 'editor')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="viewer">Visualizador</SelectItem><SelectItem value="editor">Editor</SelectItem></SelectContent></Select><Button className="w-full" onClick={() => void share('user')} disabled={!shareTarget}><Users className="mr-2 h-4 w-4" />Partilhar</Button></CardContent></Card>
                <Card className="border-border bg-card/60"><CardHeader><CardTitle className="text-sm">Partilhar com departamento</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={shareDepartment} onChange={(e) => setShareDepartment(e.target.value)} placeholder="ID do departamento" /><Button className="w-full" onClick={() => void share('department')} disabled={!shareDepartment}>Partilhar departamento</Button></CardContent></Card>
                <Card className="border-border bg-card/60"><CardHeader><CardTitle className="text-sm">Toda a empresa</CardTitle></CardHeader><CardContent><Button className="w-full" variant={sharedCompany ? 'outline' : 'default'} onClick={() => void share('company')}>{sharedCompany ? 'Já partilhado' : 'Partilhar com a empresa'}</Button></CardContent></Card>
              </>}
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
