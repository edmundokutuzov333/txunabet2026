'use client';

import '@xyflow/react/dist/style.css';

import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const PALETTE = [
  ['trigger.form.submitted', 'Form submitted'],
  ['trigger.record.created', 'Record created'],
  ['trigger.record.updated', 'Record updated'],
  ['trigger.status.changed', 'Status changed'],
  ['trigger.schedule', 'Schedule'],
  ['trigger.webhook', 'Webhook'],
  ['action.create.task', 'Create task'],
  ['action.request.approval', 'Request approval'],
  ['action.notify', 'Send notification'],
  ['action.email', 'Send email'],
  ['action.assign.user', 'Assign user'],
  ['action.condition', 'Condition'],
  ['action.branch', 'Branch'],
  ['action.join', 'Join'],
  ['action.update.record', 'Update record'],
  ['action.integration', 'Integration'],
  ['action.ai', 'Invoke AI'],
  ['action.wait', 'Wait'],
  ['action.run.workflow', 'Run workflow'],
];

type VisualWorkflow = {
  id: string;
  name: string;
  description?: string;
  version?: number;
  workflowId?: string;
  automationId?: string;
  graph?: { nodes?: Array<Record<string, unknown>>; edges?: Array<Record<string, unknown>>; viewport?: { x: number; y: number; zoom: number } };
};

type FlowNodeData = { label: string; type: string; config: Record<string, unknown> };

type LoadResponse = { data?: VisualWorkflow[]; error?: string };

async function fetchVisualWorkflows(): Promise<VisualWorkflow[]> {
  const response = await fetch('/api/workflow-platform?resource=visual-workflows', { cache: 'no-store' });
  const payload = (await response.json()) as LoadResponse;
  if (!response.ok) throw new Error(payload.error ?? 'Falha ao carregar workflows.');
  return Array.isArray(payload.data) ? payload.data : [];
}

function normalizeNodes(value: VisualWorkflow['graph']): Node<FlowNodeData>[] {
  return (value?.nodes ?? []).map((item, index) => ({
    id: String(item.id ?? `node_${index + 1}`),
    type: 'default',
    position: { x: Number(item.x ?? index * 280), y: Number(item.y ?? 100) },
    data: {
      label: String(item.label ?? item.type ?? 'Node'),
      type: String(item.type ?? 'action'),
      config: (item.config && typeof item.config === 'object' ? item.config : {}) as Record<string, unknown>,
    },
  }));
}

function normalizeEdges(value: VisualWorkflow['graph']): Edge[] {
  return (value?.edges ?? []).map((item, index) => ({
    id: String(item.id ?? `edge_${index + 1}`),
    source: String(item.source ?? ''),
    target: String(item.target ?? ''),
    label: typeof item.label === 'string' ? item.label : undefined,
  })).filter((item) => item.source && item.target);
}

export default function ReactFlowWorkflowBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const workflows = useQuery({ queryKey: ['visual-workflows'], queryFn: fetchVisualWorkflows, staleTime: 15_000 });
  const [selected, setSelected] = useState<VisualWorkflow | null>(null);
  const [name, setName] = useState('Novo workflow visual');
  const [description, setDescription] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [counter, setCounter] = useState(0);

  const graph = useMemo(
    () => ({
      nodes: nodes.map((node) => ({ id: node.id, type: node.data.type, label: node.data.label, x: node.position.x, y: node.position.y, config: node.data.config })),
      edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, label: edge.label })),
    }),
    [edges, nodes],
  );

  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/workflow-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'visual.save', id: selected?.id, input: { name, description, active: true, graph } }),
      });
      const payload = (await response.json()) as { data?: VisualWorkflow; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Falha ao guardar workflow.');
      return payload.data;
    },
    onSuccess: async (workflow) => {
      toast({ title: 'Workflow guardado', description: `Versão ${workflow?.version ?? 'n/a'}` });
      await queryClient.invalidateQueries({ queryKey: ['visual-workflows'] });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Erro', description: error.message }),
  });

  const publish = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch('/api/workflow-platform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'visual.publish', id }) });
      const payload = (await response.json()) as { data?: { workflowId?: string; automationId?: string }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Falha ao publicar.');
      return payload.data;
    },
    onSuccess: async (result) => {
      toast({ title: 'Publicado', description: `Workflow ${result?.workflowId ?? 'n/a'} · automation ${result?.automationId ?? 'n/a'}` });
      await queryClient.invalidateQueries({ queryKey: ['visual-workflows'] });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Publicação falhou', description: error.message }),
  });

  const testRun = useMutation({
    mutationFn: async (automationId: string) => {
      const response = await fetch('/api/workflow-platform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'execution.run', automationId, payload: { testRun: true, source: 'react-flow-workflow-builder' } }) });
      const payload = (await response.json()) as { data?: { jobId?: string }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Falha no test run.');
      return payload.data;
    },
    onSuccess: (result) => toast({ title: 'Test run colocado na fila', description: `Job ${result?.jobId ?? 'n/a'}` }),
    onError: (error) => toast({ variant: 'destructive', title: 'Test run falhou', description: error.message }),
  });

  const edit = (workflow: VisualWorkflow) => {
    setSelected(workflow);
    setName(workflow.name);
    setDescription(workflow.description ?? '');
    setNodes(normalizeNodes(workflow.graph));
    setEdges(normalizeEdges(workflow.graph));
  };

  const reset = () => {
    setSelected(null);
    setName('Novo workflow visual');
    setDescription('');
    setNodes([]);
    setEdges([]);
    setCounter(0);
  };

  const addNode = (type: string) => {
    const id = `rf_${Date.now()}_${counter + 1}`;
    setCounter((value) => value + 1);
    setNodes((current) => [
      ...current,
      {
        id,
        type: 'default',
        position: { x: 80 + (current.length % 3) * 260, y: 80 + Math.floor(current.length / 3) * 160 },
        data: { label: PALETTE.find(([key]) => key === type)?.[1] ?? type, type, config: {} },
      },
    ]);
  };

  const onConnect = (connection: Connection) => setEdges((current) => addEdge({ ...connection, animated: true }, current));

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <div className="text-sm text-muted-foreground">Automation Platform · React Flow</div>
        <h1 className="text-3xl font-bold mt-1">Workflow Builder</h1>
        <p className="text-muted-foreground">Editor baseado em React Flow, persistindo no mesmo control plane e execution engine do Oryon.</p>
      </div>
      <div className="grid xl:grid-cols-[260px_1fr_300px] gap-4">
        <Card className="h-[760px] overflow-hidden">
          <CardHeader><CardTitle className="text-sm">Paleta</CardTitle></CardHeader>
          <CardContent className="space-y-2 overflow-y-auto max-h-[680px]">
            <Button className="w-full" variant="secondary" onClick={reset}>Novo workflow</Button>
            {PALETTE.map(([type, label]) => <Button key={type} className="w-full justify-start text-xs" variant="outline" onClick={() => addNode(type)}>{label}</Button>)}
          </CardContent>
        </Card>

        <Card className="h-[760px] overflow-hidden">
          <CardHeader className="py-3 flex-row items-center justify-between">
            <CardTitle className="text-sm">Canvas</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'A guardar...' : 'Guardar'}</Button>
              {selected?.id ? <Button size="sm" variant="secondary" onClick={() => publish.mutate(selected.id)} disabled={publish.isPending}>Publicar</Button> : null}
              {selected?.automationId ? <Button size="sm" variant="outline" onClick={() => testRun.mutate(selected.automationId!)} disabled={testRun.isPending}>Test run</Button> : null}
            </div>
          </CardHeader>
          <CardContent className="p-0 h-[700px]">
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
              <Background gap={24} size={1} />
              <MiniMap />
              <Controls />
            </ReactFlow>
          </CardContent>
        </Card>

        <Card className="h-[760px] overflow-hidden">
          <CardHeader><CardTitle className="text-sm">Workflows persistidos</CardTitle></CardHeader>
          <CardContent className="space-y-3 overflow-y-auto max-h-[680px]">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" />
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição" />
            {workflows.isLoading ? <p className="text-sm text-muted-foreground">A carregar...</p> : null}
            {workflows.error ? <p className="text-sm text-destructive">{workflows.error.message}</p> : null}
            {(workflows.data ?? []).map((workflow) => (
              <button key={workflow.id} type="button" className={`w-full rounded-lg border p-3 text-left hover:bg-muted/50 ${selected?.id === workflow.id ? 'border-primary' : 'border-border'}`} onClick={() => edit(workflow)}>
                <div className="font-medium truncate">{workflow.name}</div>
                <div className="text-xs text-muted-foreground">v{workflow.version ?? 1}{workflow.automationId ? ` · ${workflow.automationId}` : ''}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
