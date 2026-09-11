
'use client'
import { Card, CardContent } from "@/components/ui/card";
import { gameOperations as initialGameOperations } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, AlertTriangle, CheckCircle, Clock } from "lucide-react";

type GameOperation = typeof initialGameOperations[0];

const statusConfig: { [key: string]: { label: string; border: string; } } = {
    prospecting: { label: 'Prospecção', border: 'border-blue-500' },
    integration: { label: 'Integração', border: 'border-purple-500' },
    testing: { label: 'Testes', border: 'border-yellow-500' },
    live: { label: 'Live', border: 'border-green-500 animate-pulse' },
    monitoring: { label: 'Monitorização', border: 'border-slate-500' },
}

const riskConfig: { [key: string]: { label: string; color: string; icon: React.ElementType } } = {
    low: { label: 'Baixo', color: 'text-green-400', icon: CheckCircle },
    medium: { label: 'Médio', color: 'text-yellow-400', icon: Clock },
    high: { label: 'Alto', color: 'text-destructive', icon: AlertTriangle },
}

const GameOperationCard = ({ operation }: { operation: GameOperation }) => {
    const risk = riskConfig[operation.riskLevel] || { label: 'N/D', color: 'text-muted-foreground', icon: AlertTriangle };
    const Icon = risk.icon;

    return (
        <Card className="gradient-surface border-0 rounded-2xl mb-4 hover:shadow-primary/20 hover:-translate-y-1 transition-all cursor-pointer">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                        <Gamepad2 className="w-5 h-5 text-primary/80"/>
                        {operation.name}
                    </h3>
                     <Badge variant="secondary" className={`capitalize text-xs ${risk.color} bg-opacity-10 bg-current`}>
                        <Icon className={`w-3.5 h-3.5 mr-1.5 ${risk.color}`} />
                        Risco: {risk.label}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Fornecedor: <span className="font-semibold text-foreground/90">{operation.provider}</span></p>
                
                <div className="flex items-center justify-between text-xs">
                     <Badge variant="outline" className="capitalize">{operation.gameType.replace('_', ' ')}</Badge>
                </div>
            </CardContent>
        </Card>
    );
};

const OperationColumn = ({ title, operations, border }: { title: string, operations: GameOperation[], border: string }) => {
    return (
        <div className="flex flex-col h-full bg-card/30 rounded-lg">
            <div className={`flex-shrink-0 p-3 border-l-4 ${border}`}>
                <h2 className="text-base font-semibold text-foreground">{title} <span className="text-sm text-muted-foreground font-normal">({operations.length})</span></h2>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto custom-scrollbar p-3">
                {operations.map(op => <GameOperationCard key={op.id} operation={op} />)}
                {operations.length === 0 && <div className="text-sm text-muted-foreground text-center pt-10 px-4">Nenhuma operação nesta fase.</div>}
            </div>
        </div>
    );
}

export default function GameOperationsPage() {
    
    const operationsByStatus = Object.entries(statusConfig).map(([statusKey, config]) => {
        return {
            title: config.label,
            border: config.border,
            operations: initialGameOperations.filter(op => op.integrationStatus === statusKey)
        }
    });

    return (
        <div className="p-6 fade-in h-full flex flex-col">
            <div className="flex justify-between items-center mb-8 flex-shrink-0">
                <h1 className="text-3xl font-bold text-foreground">Operações de Jogo</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 flex-grow overflow-hidden">
                {operationsByStatus.map(group => (
                    <OperationColumn key={group.title} title={group.title} operations={group.operations} border={group.border} />
                ))}
            </div>
        </div>
    );
}
