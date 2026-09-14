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
import {
  Activity,
  Bot,
  CheckCircle2,
  GitBranch,
  Mail,
  Play,
  Plus,
  Save,
  Timer,
  Webhook,
  X,
} from 'lucide-react';
import {
  OryonBadge,
  OryonButton,
  OryonEmptyState,
  OryonInput,
  OryonPanel,
  OryonSelect,
} from '@/components/oryon-ui';
import { useToast } from '@/hooks/use-toast';

const PALETTE = [
  ['trigger.form.submitted', 'Trigger · Form submitted', Webhook],
  ['trigger.record.created', 'Trigger · Record created', Plus],
  ['trigger.status.changed', 'Trigger · Status changed', Activity],
  ['action.create.task', 'Action · Create task', CheckCircle2],
  ['action.request.approval', 'Action · Request approval', CheckCircle2],
  ['action.notify', 'Action · Send notification', Mail],
  ['action.condition', 'Logic · Condition', GitBranch],
  ['action.wait', 'Wait', Timer],
  ['action.ai', 'Action · Invoke AI', Bot],
] as const;

type VisualWorkflow = {
  id: string;
  name: string;
  description?: string;
  version?: number;
  workflowId?: string;
  automationId?: string;
  graph?: {
    nodes?: Array<Record<string, unknown>>;
    edges?: Array<Record<string, unknown>>;
  };
};

type FlowData = {
  label: string;
  type: string;
  config: Record<string, unknown>;
};

type FlowNode = Node<FlowData>;

type PublishResult = {
  workflowId?: string;
  automationId?: string;
  workflowVersion?: number;
};

type SaveResult = VisualWorkflow;

async function fetchVisualWorkflows(): Promise<VisualWorkflow[]> {
  const response = await fetch('/api/workflow-platform?resource=visual-workflows', {
    cache: 'no-store',
    credentials: 'include',
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Falha ao carregar workflows.');
  }
  return Array.isArray(payload.data) ? (payload.data as VisualWorkflow[]) : [];
}

function normalizeNodes(graph: VisualWorkflow['graph']): FlowNode[] {
  return (graph?.nodes ?? []).map((item, index) => ({
    id: String(item.id ?? `node_${index + 1}`),
    position: {
      x: Number(item.x ?? 80 + index * 240),
      y: Number(item.y ?? 100),
    },
    data: {
      label: String(item.label ?? item.type ?? 'Node'),
      type: String(item.type ?? 'action'),
      config:
        item.config && typeof item.config === 'object'
          ? (item.config as Record<string, unknown>)
          : {},
    },
  }));
}

function normalizeEdges(graph: VisualWorkflow['graph']): Edge[] {
  return (graph?.edges ?? [])
    .map((item, index) => ({
      id: String(item.id ?? `edge_${index + 1}`),
      source: String(item.source ?? ''),
      target: String(item.target ?? ''),
      label: typeof item.label === 'string' ? item.label : undefined,
    }))
    .filter((edge) => edge.source && edge.target);
}

export default function ReactFlowWorkflowBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const workflows = useQuery({
    queryKey: ['visual-workflows'],
    queryFn: fetchVisualWorkflows,
    staleTime: 15_000,
  });

  const [selectedWorkflow, setSelectedWorkflow] = useState<VisualWorkflow | null>(null);
  const [name, setName] = useState('Novo workflow visual');
  const [description, setDescription] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [counter, setCounter] = useState(0);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  const graph = useMemo(
    () => ({
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.data.type,
        label: node.data.label,
        x: node.position.x,
        y: node.position.y,
        config: node.data.config,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
      })),
    }),
    [nodes, edges],
  );

  const save = useMutation<SaveResult, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/workflow-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'visual.save',
          id: selectedWorkflow?.id,
          input: {
            name,
            description,
            active: true,
            graph,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Falha ao guardar workflow.');
      }
      return payload.data as SaveResult;
    },
    onSuccess: async (workflow) => {
      setSelectedWorkflow(workflow);
      toast({
        title: 'Workflow guardado',
        description: `Versão ${workflow.version ?? 'n/a'}`,
      });
      await queryClient.invalidateQueries({ queryKey: ['visual-workflows'] });
    },
    onError: (error) =>
      toast({ variant: 'destructive', title: 'Erro', description: error.message }),
  });

  const publish = useMutation<PublishResult, Error, string>({
    mutationFn: async (workflowId) => {
      const response = await fetch('/api/workflow-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'visual.publish', id: workflowId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Falha ao publicar.');
      }
      return payload.data as PublishResult;
    },
    onSuccess: (payload) =>
      toast({
        title: 'Publicado',
        description: `Workflow ${payload.workflowId ?? 'n/a'} · automation ${payload.automationId ?? 'n/a'}`,
      }),
    onError: (error) =>
      toast({ variant: 'destructive', title: 'Publicação falhou', description: error.message }),
  });

  const run = useMutation<{ jobId?: string }, Error, string>({
    mutationFn: async (automationId) => {
      const response = await fetch('/api/workflow-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'execution.run',
          automationId,
          payload: { testRun: true, source: 'oryon-react-flow' },
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Falha no test run.');
      }
      return payload.data as { jobId?: string };
    },
    onSuccess: (payload) =>
      toast({ title: 'Test run colocado na fila', description: `Job ${payload.jobId ?? 'n/a'}` }),
    onError: (error) =>
      toast({ variant: 'destructive', title: 'Test run falhou', description: error.message }),
  });

  const reset = () => {
    setSelectedWorkflow(null);
    setName('Novo workflow visual');
    setDescription('');
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
  };

  const edit = (workflow: VisualWorkflow) => {
    setSelectedWorkflow(workflow);
    setName(workflow.name);
    setDescription(workflow.description ?? '');
    const nextNodes = normalizeNodes(workflow.graph);
    setNodes(nextNodes);
    setEdges(normalizeEdges(workflow.graph));
    setSelectedNodeId(nextNodes[0]?.id ?? null);
  };

  const addNode = (type: string) => {
    const id = `rf_${Date.now()}_${counter + 1}`;
    setCounter((value) => value + 1);
    const paletteItem = PALETTE.find(([key]) => key === type);
    setNodes((current) => [
      ...current,
      {
        id,
        position: {
          x: 80 + (current.length % 3) * 240,
          y: 80 + Math.floor(current.length / 3) * 140,
        },
        data: {
          label: paletteItem?.[1] ?? type,
          type,
          config: {},
        },
      },
    ]);
    setSelectedNodeId(id);
  };

  const patchNode = (patch: Partial<FlowData>) => {
    if (!selectedNodeId) return;
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId
          ? { ...node, data: { ...node.data, ...patch } }
          : node,
      ),
    );
  };

  const patchConfig = (key: string, value: string) => {
    if (!selectedNodeId) return;
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== selectedNodeId) return node;
        return {
          ...node,
          data: {
            ...node.data,
            config: {
              ...node.data.config,
              [key]: value,
            },
          },
        };
      }),
    );
  };

  const onConnect = (connection: Connection) => {
    setEdges((current) => addEdge({ ...connection, animated: false }, current));
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary">Automate</p>
          <h1 className="mt-1 text-h1">Workflow Builder</h1>
          <p className="mt-1 text-body-small text-muted-foreground">
            Canvas visual único do Oryon. Trigger, logic, action, condition e wait, com persistência real.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OryonButton variant="outline" size="sm" onClick={reset}>
            <Plus className="h-3.5 w-3.5" />
            Novo
          </OryonButton>
          <OryonButton size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-3.5 w-3.5" />
            {save.isPending ? 'A guardar…' : 'Guardar'}
          </OryonButton>
          {selectedWorkflow?.id ? (
            <OryonButton
              variant="secondary"
              size="sm"
              onClick={() => publish.mutate(selectedWorkflow.id)}
              disabled={publish.isPending}
            >
              Publicar
            </OryonButton>
          ) : null}
          {selectedWorkflow?.automationId ? (
            <OryonButton
              variant="outline"
              size="sm"
              onClick={() => run.mutate(selectedWorkflow.automationId!)}
              disabled={run.isPending}
            >
              <Play className="h-3.5 w-3.5" />
              Test run
            </OryonButton>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <OryonPanel className="h-[640px] overflow-hidden p-3">
          <p className="px-2 py-2 text-label">Node library</p>
          <div className="grid gap-1.5 overflow-y-auto pr-1 custom-scrollbar">
            {PALETTE.map(([type, label, Icon]) => (
              <button
                key={type}
                type="button"
                onClick={() => addNode(type)}
                className="flex items-center gap-2 rounded-[8px] border border-transparent bg-surface-1 px-2.5 py-2 text-left text-[11px] text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
              </button>
            ))}
          </div>
        </OryonPanel>

        <OryonPanel className="h-[640px] overflow-hidden p-0">
          <div className="flex h-11 items-center justify-between border-b border-border px-3">
            <div>
              <p className="text-label">Canvas</p>
              <p className="text-[10px] text-muted-foreground">
                {nodes.length} nodes · {edges.length} connections
              </p>
            </div>
            <div className="flex gap-1.5">
              <OryonBadge>React Flow</OryonBadge>
              <OryonBadge tone="accent">Live graph</OryonBadge>
            </div>
          </div>
          <div className="h-[596px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              fitView
            >
              <Background gap={24} size={1} />
              <MiniMap />
              <Controls />
            </ReactFlow>
          </div>
        </OryonPanel>

        <OryonPanel className="h-[640px] overflow-hidden p-0">
          <div className="flex h-11 items-center justify-between border-b border-border px-4">
            <p className="text-label">Inspector</p>
            {selectedNode ? (
              <OryonButton
                variant="ghost"
                size="icon"
                onClick={() => setSelectedNodeId(null)}
                aria-label="Fechar inspector"
              >
                <X className="h-3.5 w-3.5" />
              </OryonButton>
            ) : null}
          </div>
          <div className="h-[596px] overflow-y-auto p-4 custom-scrollbar">
            {selectedNode ? (
              <div className="grid gap-4">
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{selectedNode.data.label}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{selectedNode.data.type}</p>
                </div>
                <OryonInput
                  label="Label"
                  value={selectedNode.data.label}
                  onChange={(event) => patchNode({ label: event.target.value })}
                />
                <OryonSelect
                  label="Node type"
                  value={selectedNode.data.type}
                  onChange={(event) => patchNode({ type: event.target.value })}
                >
                  {PALETTE.map(([type, label]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </OryonSelect>
                <OryonInput
                  label="Reference"
                  value={String(selectedNode.data.config.reference ?? '')}
                  onChange={(event) => patchConfig('reference', event.target.value)}
                  placeholder="payload.reference"
                />
                <OryonInput
                  label="Value / target"
                  value={String(selectedNode.data.config.value ?? '')}
                  onChange={(event) => patchConfig('value', event.target.value)}
                  placeholder="Ex.: task.completed"
                />
                <OryonButton
                  variant="danger"
                  onClick={() => {
                    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
                    setSelectedNodeId(null);
                  }}
                >
                  Remover node
                </OryonButton>
              </div>
            ) : (
              <OryonEmptyState
                icon={<GitBranch className="h-5 w-5" />}
                title="Select a node"
                description="Escolha um elemento no canvas para configurar os seus parâmetros."
              />
            )}
          </div>
        </OryonPanel>
      </div>

      <OryonPanel className="p-4">
        <div className="grid gap-2 lg:grid-cols-2">
          <OryonInput
            label="Nome do workflow"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
          />
          <label className="grid gap-1.5">
            <span className="text-label text-foreground">Descrição</span>
            <textarea
              className="min-h-9 w-full rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/65 focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descrição do workflow"
            />
          </label>
        </div>
      </OryonPanel>

      {workflows.data?.length ? (
        <OryonPanel className="p-3">
          <p className="text-label">Saved workflows</p>
          <div className="mt-2 grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
            {workflows.data.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                onClick={() => edit(workflow)}
                className="rounded-[8px] border border-border bg-surface-1 p-3 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                <p className="text-[12px] font-medium text-foreground">{workflow.name}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  v{workflow.version ?? 1} · {workflow.automationId ? 'published' : 'draft'}
                </p>
              </button>
            ))}
          </div>
        </OryonPanel>
      ) : null}
    </div>
  );
}
