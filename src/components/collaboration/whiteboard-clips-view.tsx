'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CircleStop, Link2, Plus, Save, Square, StickyNote, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type Obj = {
  id: string;
  type: 'note' | 'shape' | 'task' | 'project' | 'workflow' | 'person';
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  refType?: string;
  refId?: string;
};

type Board = {
  id: string;
  name: string;
  objects: Obj[];
  edges: Array<{ id: string; source: string; target: string; label?: string }>;
};

export default function WhiteboardClipsView() {
  const { toast } = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selected, setSelected] = useState<Board | null>(null);
  const [name, setName] = useState('Oryon Whiteboard');
  const [recording, setRecording] = useState(false);
  const [clipTitle, setClipTitle] = useState('Oryon Clip');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    fetch('/api/collaboration?resource=whiteboards', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.data)) setBoards(payload.data);
      })
      .catch(() => undefined);
  }, []);

  const add = (type: Obj['type']) => {
    setSelected((current) => {
      const base = current ?? { id: '', name, objects: [], edges: [] };
      const index = base.objects.length;
      const object: Obj = {
        id: `o_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        x: 120 + index * 25,
        y: 120 + index * 25,
        w: 180,
        h: 80,
        text: type === 'note' ? 'Nova nota' : type.toUpperCase(),
        refType: type === 'task' || type === 'project' || type === 'workflow' ? type : undefined,
      };
      return { ...base, objects: [...base.objects, object] };
    });
  };

  const save = async () => {
    if (!selected) return;
    try {
      const response = await fetch('/api/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'whiteboard',
          input: {
            id: selected.id || undefined,
            name: selected.name || name,
            objects: selected.objects,
            edges: selected.edges,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'WHITEBOARD_SAVE_FAILED');
      setSelected(payload.data);
      setBoards((current) => [payload.data, ...current.filter((item) => item.id !== payload.data.id)]);
      toast({ title: 'Whiteboard guardado', description: 'As alterações foram persistidas.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível guardar',
        description: error instanceof Error ? error.message : 'Falha ao guardar',
      });
    }
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      chunks.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        try {
          const file = new File(
            [new Blob(chunks.current, { type: 'video/webm' })],
            `${clipTitle.replace(/[^a-z0-9-_]/gi, '_')}.webm`,
            { type: 'video/webm' },
          );
          const form = new FormData();
          form.append('file', file);
          const uploadResponse = await fetch('/api/modules/cloud/upload', { method: 'POST', body: form });
          const uploadPayload = await uploadResponse.json();
          if (!uploadResponse.ok) throw new Error(uploadPayload.error ?? 'CLIP_UPLOAD_FAILED');

          const createResponse = await fetch('/api/collaboration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resource: 'clip',
              input: {
                title: clipTitle,
                cloudFileId: uploadPayload.data.id,
                storagePath: uploadPayload.data.storagePath,
                durationMs: 0,
                sourceType: 'screen',
              },
            }),
          });
          const createPayload = await createResponse.json();
          if (!createResponse.ok) throw new Error(createPayload.error ?? 'CLIP_CREATE_FAILED');
          toast({ title: 'Clip criado', description: createPayload.data.id });
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Falha ao criar clip',
            description: error instanceof Error ? error.message : 'Erro inesperado',
          });
        }
      };
      mediaRecorder.start();
      recorder.current = mediaRecorder;
      setRecording(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gravação falhou',
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    }
  };

  const stop = () => {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  };

  const newBoard = () => setSelected({ id: '', name: 'Oryon Whiteboard', objects: [], edges: [] });

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <div className="text-sm text-muted-foreground">Collaboration</div>
        <h1 className="mt-1 text-3xl font-bold">Whiteboard + Clips</h1>
        <p className="text-muted-foreground">Quadro visual ligado a objectos reais e gravação de ecrã com upload seguro.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-sm">Boards</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={newBoard}><Plus className="mr-2 h-4 w-4" />Novo whiteboard</Button>
            {boards.map((board) => (
              <Button key={board.id} variant={selected?.id === board.id ? 'secondary' : 'outline'} className="w-full justify-start" onClick={() => setSelected(board)}>{board.name}</Button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selected ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle>{selected.name || name}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => add('note')}><StickyNote className="mr-2 h-4 w-4" />Post-it</Button>
                  <Button variant="outline" onClick={() => add('task')}>Task</Button>
                  <Button variant="outline" onClick={() => add('project')}>Project</Button>
                  <Button variant="outline" onClick={() => add('workflow')}><Link2 className="mr-2 h-4 w-4" />Workflow</Button>
                  <Button onClick={() => void save()}><Save className="mr-2 h-4 w-4" />Guardar</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Input value={selected.name} onChange={(event) => setSelected({ ...selected, name: event.target.value })} className="mb-3" />
                <div className="relative h-[620px] overflow-hidden rounded-xl border bg-[radial-gradient(circle,_hsl(var(--muted-foreground)/.15)_1px,_transparent_1px)] [background-size:24px_24px]">
                  {selected.objects.map((object) => (
                    <div key={object.id} className="absolute rounded-lg border bg-background p-3 shadow-sm" style={{ left: object.x, top: object.y, width: object.w, height: object.h }}>
                      <Badge variant="secondary">{object.type}</Badge>
                      <div className="mt-2 text-sm font-medium">{object.text}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">{object.refId ? 'Linked object' : 'Object livre'}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-16 text-center text-muted-foreground"><Square className="mx-auto mb-2 h-8 w-8" />Crie ou seleccione um whiteboard.</CardContent></Card>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-4 w-4" />Clips</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Input aria-label="Título do clip" className="max-w-sm" value={clipTitle} onChange={(event) => setClipTitle(event.target.value)} />
              <Button variant={recording ? 'destructive' : 'default'} onClick={recording ? stop : () => void start()} aria-pressed={recording}>
                {recording ? <CircleStop className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                {recording ? 'Parar gravação' : 'Gravar ecrã'}
              </Button>
              <span className="text-xs text-muted-foreground">O browser pedirá autorização para capturar o ecrã.</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
