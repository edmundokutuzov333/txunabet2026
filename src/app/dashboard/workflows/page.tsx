import VisualWorkflowBuilder from '@/components/workflow/visual-workflow-builder';
import ReactFlowWorkflowBuilder from '@/components/workflow/react-flow-workflow-builder';

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <ReactFlowWorkflowBuilder />
      <details className="mx-4 md:mx-6 rounded-xl border border-border bg-card/50 p-1">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground">
          Editor clássico do Oryon · compatibilidade
        </summary>
        <VisualWorkflowBuilder />
      </details>
    </div>
  );
}
