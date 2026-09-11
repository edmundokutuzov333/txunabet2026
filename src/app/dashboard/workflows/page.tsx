
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { workflows } from '@/lib/data';
import { PlayCircle, Workflow } from 'lucide-react';

export default function WorkflowsPage() {
  const { toast } = useToast();

  const handleStartWorkflow = (workflowName: string) => {
    toast({
        title: `Iniciando Workflow: ${workflowName}`,
        description: "Esta funcionalidade está em desenvolvimento.",
    });
  }

  return (
    <div className="p-6 fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-8">Workflows da Empresa</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workflows.map(wf => (
                <Card key={wf.id} className="gradient-surface border-0 rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Workflow className="text-primary w-5 h-5"/>
                            {wf.name}
                        </CardTitle>
                        <CardDescription className="pt-2">Departamento: {wf.department}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border-t border-border pt-4 flex justify-between items-center">
                            <p className="text-sm font-semibold">{wf.steps} Etapas</p>
                            <Button variant="link" className="text-primary/80 hover:text-primary p-0 h-auto" onClick={() => handleStartWorkflow(wf.name)}>
                                Iniciar Workflow <PlayCircle className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
}
