'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
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

type Role = 'owner' | 'editor' | 'viewer';
type JsonDoc = Record<string, unknown>;
interface Doc { id: string; companyId: string; title: string; content: JsonDoc; contentVersion: number; currentVersion: number; sharedCompany: boolean; }
interface Version { id: string; version: number; createdBy: string; createdAt?: { _seconds?: number }; }
interface Comment { id: string; authorId: string; body: string; selectedText?: string; resolved: boolean; createdAt?: { _seconds?: number }; }
interface DirectoryUser { uid: string; displayName: string; email: string | null; departmentIds: string[]; role: string; }

const EMPTY_DOC: JsonDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
const DRAFT_PREFIX = 'oryon-document-draft:';
const ERR = (e: unknown) => e instanceof Error ? e.message : 'REQUEST_FAILED';
const stats = (text: string) => ({ words: text.trim() ? text.trim().split(/\s+/).length : 0, characters: text.length });
const dateText = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('_seconds' in value)) return 'agora';
  return new Date(Number((value as { _seconds: number })._seconds) * 1000).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
};

export function DocumentWorkspaceV3({ initialDocumentId }: { initialDocumentId?: string }) {
  const { toast } = useToast();
  const { user } = useUser();
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [companyId, setCompanyId] = useState('');
  const [title, setTitle] = useState('Novo documento');
  const [role, setRole] = useState<Role>('owner');
  const [version, setVersion] = useState(1);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [counts, setCounts] = useState({ words: 0, characters: 0 });
  const [versions, setVersions] = useState<Version[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [commentText, setCommentText] = useState('');
  const [shareTarget, setShareTarget] = useState('');
  const [shareRole, setShareRole] = useState<'viewer' | 'editor'>('viewer');
  const [shareDepartment, setShareDepartment] = useState('');
  const [sharedCompany, setSharedCompany] = useState(false);
  const [aiAction, setAiAction] = useState('rewrite');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ai');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRemote = useRef(false);
  const latestSave = useRef<(() => Promise<void>) | null>(null);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false }), Underline, Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }), Image.configure({ inline: false, allowBase64: false }), Table.configure({ resizable: true }), TableRow, TableHeader, TableCell],
    content: EMPTY_DOC,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      if (loadingRemote.current) return;
      setCounts(stats(currentEditor.getText()));
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { void latestSave.current?.(); }, 900);
    },
  });

  const loadMeta = useCallback(async (id: string) => {
    const [v, c, d] = await Promise.all([
      fetch(`/api/documents/${encodeURIComponent(id)}/versions`, { cache: 'no-store' }),
      fetch(`/api/documents/${encodeURIComponent(id)}/comments`, { cache: 'no-store' }),
      fetch('/api/users/directory', { cache: 'no-store' }),
    ]);
    if (v.ok) setVersions((await v.json()).versions ?? []);
    if (c.ok) setComments((await c.json()).comments ?? []);
    if (d.ok) setDirectory((await d.json()).users ?? []);
  }, []);

  const createIfNeeded = useCallback(async () => {
    if (documentId) return documentId;
    const response = await fetch('/api/documents', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, content: EMPTY_DOC, textPreview: '' }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'DOCUMENT_CREATE_FAILED');
    setDocumentId(payload.document.id);
    setCompanyId(payload.document.companyId);
    setVersion(Number(payload.document.contentVersion ?? 1));
    return String(payload.document.id);
  }, [documentId, title]);

  const save = useCallback(async (checkpoint = false) => {
    if (!editor || !documentId || role === 'viewer' || !dirty) return;
    const content = editor.getJSON() as JsonDoc;
    const text = editor.getText();
    const payload = { title: title.trim().slice(0, 240) || 'Novo documento', content, textPreview: text.slice(0, 500), checkpoint, expectedVersion: version };
    const key = `${DRAFT_PREFIX}${documentId}`;
    if (offline || !navigator.onLine) { localStorage.setItem(key, JSON.stringify({ ...payload, baseVersion: version })); setLastSaved(null); return; }
    setSaving(true);
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'DOCUMENT_SAVE_FAILED');
      setVersion(Number(result.document.contentVersion ?? version));
      setLastSaved(new Date());
      setDirty(false);
      localStorage.removeItem(key);
      if (checkpoint) await loadMeta(documentId);
    } catch (error) {
      localStorage.setItem(key, JSON.stringify({ ...payload, baseVersion: version }));
      if (ERR(error) === 'DOCUMENT_VERSION_CONFLICT') toast({ title: 'Conflito de versão', description: 'O seu trabalho foi preservado no dispositivo.', variant: 'destructive' });
    } finally { setSaving(false); }
  }, [editor, documentId, role, dirty, title, version, offline, loadMeta, toast]);
  latestSave.current = () => save(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') setOffline(!navigator.onLine);
    const onOnline = () => { setOffline(false); void save(true); };
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [save]);

  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    void createIfNeeded().then(async (id) => {
      if (cancelled) return;
      const pendingKey = `${DRAFT_PREFIX}${id}`;
      const pending = localStorage.getItem(pendingKey);
      const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'DOCUMENT_LOAD_FAILED');
      if (cancelled) return;
      const remote = payload.document as Doc;
      loadingRemote.current = true;
      setCompanyId(remote.companyId); setRole(payload.role as Role); setTitle(remote.title || 'Novo documento'); setVersion(Number(remote.contentVersion ?? 1)); setSharedCompany(Boolean(remote.sharedCompany));
      editor.setEditable(payload.role !== 'viewer');
      editor.commands.setContent(remote.content || EMPTY_DOC, { emitUpdate: false });
      setCounts(stats(editor.getText()));
      queueMicrotask(() => { loadingRemote.current = false; });
      await loadMeta(id);
      if (pending && payload.role !== 'viewer') {
        const draft = JSON.parse(pending) as { title: string; content: JsonDoc; baseVersion: number };
        if (confirm('Existe trabalho local não sincronizado. Recuperá-lo?')) {
          setTitle(draft.title || remote.title);
          loadingRemote.current = true; editor.commands.setContent(draft.content || EMPTY_DOC, { emitUpdate: false }); setVersion(draft.baseVersion || remote.contentVersion); queueMicrotask(() => { loadingRemote.current = false; setDirty(true); void save(true); });
        } else localStorage.removeItem(pendingKey);
      }
    }).catch((error) => { toast({ title: 'Editor', description: ERR(error), variant: 'destructive' }); });
    return () => { cancelled = true; };
  }, [editor, createIfNeeded, loadMeta, save, toast]);

  useEffect(() => {
    if (!editor || role === 'viewer') return;
    const timer = window.setInterval(() => { if (dirty) void save(true); }, 30_000);
    return () => window.clearInterval(timer);
  }, [editor, role, dirty, save]);

  const runAI = async () => {
    if (!editor || !documentId) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, '\n').trim();
    const source = selected || editor.getText().trim();
    if (!source) { toast({ title: 'OryonAI', description: 'Escreva ou seleccione conteúdo antes de usar a IA.', variant: 'destructive' }); return; }
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: aiAction, prompt: source, contextType: 'document', contextId: documentId }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? 'AI_REQUEST_FAILED');
      setAiSuggestion(payload.suggestion ?? ''); setActiveTab('ai');
    } catch (error) { toast({ title: 'OryonAI', description: ERR(error), variant: 'destructive' }); }
    finally { setAiLoading(false); }
  };

  const applyAI = () => {
    if (!editor || role === 'viewer' || !aiSuggestion.trim()) return;
    const { from, to } = editor.state.selection;
    if (aiAction === 'title') setTitle(aiSuggestion.split('\n')[0].replace(/^#+\s*/, '').trim().slice(0, 240));
    else if (from !== to) editor.chain().focus().deleteRange({ from, to }).insertContent(aiSuggestion).run();
    else editor.chain().focus().insertContent(aiSuggestion).run();
    setAiSuggestion(''); setDirty(true); void save(true);
  };

  const addComment = async () => {
    if (!documentId || role === 'viewer' || !commentText.trim() || !editor) return;
    const { from, to } = editor.state.selection;
    const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: commentText, selectedText: editor.state.doc.textBetween(from, to, ' ').slice(0, 1000), anchorFrom: from, anchorTo: to }) });
    const payload = await response.json(); if (!response.ok) { toast({ title: 'Comentário', description: payload.error ?? 'COMMENT_FAILED', variant: 'destructive' }); return; }
    setComments((items) => [...items, payload.comment]); setCommentText('');
  };

  const restore = async (target: number) => {
    if (!documentId || role === 'viewer') return;
    if (!confirm(`Restaurar a versão ${target}? Será criada uma nova versão.`)) return;
    const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/versions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: target }) });
    const payload = await response.json(); if (!response.ok) { toast({ title: 'Histórico', description: payload.error ?? 'RESTORE_FAILED', variant: 'destructive' }); return; }
    loadingRemote.current = true; setTitle(payload.document.title); setVersion(Number(payload.document.contentVersion)); editor?.commands.setContent(payload.document.content || EMPTY_DOC, { emitUpdate: false }); queueMicrotask(() => { loadingRemote.current = false; }); setDirty(false); await loadMeta(documentId); toast({ title: 'Histórico', description: `Versão ${target} restaurada.` });
  };

  const share = async (kind: 'user' | 'department' | 'company') => {
    if (!documentId || role !== 'owner') return;
    const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/share`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, targetId: kind === 'user' ? shareTarget : kind === 'department' ? shareDepartment : undefined, role: shareRole }) });
    const payload = await response.json(); if (!response.ok) { toast({ title: 'Partilha', description: payload.error ?? 'SHARE_FAILED', variant: 'destructive' }); return; }
    setSharedCompany(Boolean(payload.document.sharedCompany)); toast({ title: 'Partilha', description: 'Permissões actualizadas.' });
  };

  const insertImage = async (file?: File) => {
    if (!file || !editor || !companyId || !documentId || !user || role === 'viewer') return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { toast({ title: 'Imagem', description: 'Use uma imagem até 10 MB.', variant: 'destructive' }); return; }
    const safe = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-120);
    const path = `companies/${companyId}/documents/${documentId}/${user.uid}/${Date.now()}_${safe}`;
    try { const ref = storageRef(getStorage(), path); await uploadBytes(ref, file, { contentType: file.type }); editor.chain().focus().setImage({ src: await getDownloadURL(ref), alt: safe }).run(); void save(true); }
    catch (error) { toast({ title: 'Imagem', description: ERR(error), variant: 'destructive' }); }
  };

  const exportDocument = async () => {
    if (!documentId) return;
    const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/export`);
    if (!response.ok) return;
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${title || 'documento'}.json`; link.click(); URL.revokeObjectURL(url);
  };

  const collaborators = useMemo(() => directory.filter((entry) => entry.uid !== user?.uid), [directory, user?.uid]);
  const canEdit = role !== 'viewer';
  if (!editor) return <div className="p-8 text-muted-foreground">A preparar o editor...</div>;

  return <div className="flex h-full min-h-0 flex-col bg-background">
    <header className="border-b border-border bg-card/70 px-5 py-3"><div className="flex items-center gap-4"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><LinkNext href="/dashboard/documents" className="text-xs text-muted-foreground">Documentos</LinkNext><span className="text-xs text-muted-foreground">/</span><Input value={title} disabled={!canEdit} onChange={(e) => { setTitle(e.target.value.slice(0, 240)); setDirty(true); }} className="h-8 max-w-xl border-transparent bg-transparent px-2 text-lg font-semibold" /></div><div className="flex items-center gap-3 px-2 text-[11px] text-muted-foreground">{saving ? <><Loader2 className="h-3 w-3 animate-spin" />A guardar...</> : lastSaved ? <><Check className="h-3 w-3" />Guardado</> : offline ? <><Cloud className="h-3 w-3" />Offline, rascunho local</> : <><Cloud className="h-3 w-3" />Autosave activo</>}<span>v{version}</span><span>{role === 'owner' ? 'Proprietário' : role === 'editor' ? 'Editor' : 'Visualizador'}</span></div></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void save(true)} disabled={!canEdit || saving}><Save className="mr-2 h-4 w-4" />Checkpoint</Button><Button variant="outline" size="sm" onClick={() => void exportDocument()}><FileDown className="mr-2 h-4 w-4" />Exportar</Button></div></div></header>
    <div className="flex min-h-0 flex-1"><main className="min-w-0 flex-1 overflow-auto"><div className="sticky top-0 z-10 border-b border-border bg-background/95 p-2"><div className="flex flex-wrap items-center gap-1"><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!canEdit}><Undo2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!canEdit}><Redo2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!canEdit}><Bold className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!canEdit}><Italic className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!canEdit}>U</Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!canEdit}><Heading1 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!canEdit}><Heading2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!canEdit}><List className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={!canEdit}><ListOrdered className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} disabled={!canEdit}><Quote className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => { const url = prompt('URL do link'); if (url) editor.chain().focus().setLink({ href: url }).run(); }} disabled={!canEdit}><Link2 className="h-4 w-4" /></Button><label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md"><ImagePlus className="h-4 w-4" /><input type="file" accept="image/*" className="hidden" disabled={!canEdit} onChange={(e) => { void insertImage(e.target.files?.[0]); e.currentTarget.value = ''; }} /></label><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} disabled={!canEdit}><Table2 className="h-4 w-4" /></Button></div></div><article className="mx-auto max-w-5xl px-6 py-10 md:px-14"><EditorContent editor={editor} className="oryon-tiptap min-h-[70vh] outline-none" /></article><footer className="sticky bottom-0 border-t border-border bg-background/95 px-5 py-2 text-xs text-muted-foreground"><div className="mx-auto flex max-w-5xl items-center justify-between"><span>{counts.words} palavras · {counts.characters} caracteres</span><span>{offline ? 'Sem ligação: rascunho local' : 'Sincronização automática'}</span></div></footer></main>
    <aside className="hidden w-[360px] shrink-0 overflow-auto border-l border-border bg-card/30 xl:block"><Tabs value={activeTab} onValueChange={setActiveTab}><TabsList className="m-3 grid w-[calc(100%-24px)] grid-cols-4"><TabsTrigger value="ai">IA</TabsTrigger><TabsTrigger value="comments">Comentários</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger><TabsTrigger value="share">Partilha</TabsTrigger></TabsList>
      <TabsContent value="ai" className="space-y-4 px-4 pb-6"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" />OryonAI</CardTitle></CardHeader><CardContent className="space-y-3"><Select value={aiAction} onValueChange={setAiAction}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[['ask','Perguntar'],['write','Escrever'],['rewrite','Reescrever'],['summarize','Resumir'],['correct','Corrigir'],['translate','Traduzir'],['tone','Alterar tom'],['expand','Expandir'],['shorten','Encurtar'],['title','Criar título'],['structure','Criar estrutura'],['extractTasks','Extrair tarefas'],['extractDecisions','Extrair decisões']].map(([id,label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select><Button className="w-full" onClick={() => void runAI()} disabled={aiLoading}>{aiLoading ? 'A processar...' : 'Gerar sugestão'}</Button><Textarea value={aiSuggestion} onChange={(e) => setAiSuggestion(e.target.value)} className="min-h-44" placeholder="Resultado para revisão antes de aplicar." /><div className="flex gap-2"><Button className="flex-1" disabled={!aiSuggestion.trim() || !canEdit} onClick={applyAI}><Check className="mr-2 h-4 w-4" />Aplicar</Button><Button variant="outline" onClick={() => setAiSuggestion('')}>Limpar</Button></div></CardContent></Card></TabsContent>
      <TabsContent value="comments" className="space-y-4 px-4 pb-6"><Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} disabled={!canEdit} placeholder="Comentário sobre a selecção..." /><Button className="w-full" onClick={() => void addComment()} disabled={!canEdit || !commentText.trim()}><MessageSquarePlus className="mr-2 h-4 w-4" />Comentar</Button>{comments.map((comment) => <Card key={comment.id} className={comment.resolved ? 'opacity-60' : ''}><CardContent className="pt-4"><p className="whitespace-pre-wrap text-sm">{comment.body}</p>{comment.selectedText && <blockquote className="mt-2 border-l-2 border-primary pl-3 text-xs text-muted-foreground">{comment.selectedText}</blockquote>}<div className="mt-3 flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{dateText(comment.createdAt)}</span><Button size="sm" variant="ghost" onClick={async () => { const response = await fetch(`/api/documents/${documentId}/comments`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ commentId: comment.id, resolved: !comment.resolved }) }); if (response.ok) setComments((items) => items.map((item) => item.id === comment.id ? { ...item, resolved: !item.resolved } : item)); }}>{comment.resolved ? 'Reabrir' : 'Resolver'}</Button></div></CardContent></Card>)}</TabsContent>
      <TabsContent value="history" className="space-y-3 px-4 pb-6">{versions.map((entry) => <Card key={entry.id}><CardContent className="flex items-center justify-between gap-2 pt-4"><div><div className="font-medium">Versão {entry.version}</div><div className="text-xs text-muted-foreground">{entry.createdBy.slice(0, 12)} · {dateText(entry.createdAt)}</div></div><Button size="sm" variant="outline" onClick={() => void restore(entry.version)} disabled={!canEdit || entry.version === version}><RotateCcw className="mr-2 h-3 w-3" />Restaurar</Button></CardContent></Card>)}</TabsContent>
      <TabsContent value="share" className="space-y-4 px-4 pb-6">{role !== 'owner' ? <p className="text-sm text-muted-foreground">A partilha é gerida pelo proprietário.</p> : <><Select value={shareTarget} onValueChange={setShareTarget}><SelectTrigger><SelectValue placeholder="Escolher colaborador" /></SelectTrigger><SelectContent>{collaborators.map((entry) => <SelectItem key={entry.uid} value={entry.uid}>{entry.displayName || entry.email || entry.uid}</SelectItem>)}</SelectContent></Select><Select value={shareRole} onValueChange={(v) => setShareRole(v as 'viewer' | 'editor')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="viewer">Visualizador</SelectItem><SelectItem value="editor">Editor</SelectItem></SelectContent></Select><Button className="w-full" onClick={() => void share('user')} disabled={!shareTarget}><Users className="mr-2 h-4 w-4" />Partilhar com pessoa</Button><Input value={shareDepartment} onChange={(e) => setShareDepartment(e.target.value)} placeholder="ID do departamento" /><Button className="w-full" variant="outline" onClick={() => void share('department')} disabled={!shareDepartment}>Partilhar departamento</Button><Button className="w-full" variant={sharedCompany ? 'outline' : 'default'} onClick={() => void share('company')}>{sharedCompany ? 'Já partilhado com a empresa' : 'Partilhar com a empresa'}</Button></>}</TabsContent>
    </Tabs></aside></div></div>;
}
