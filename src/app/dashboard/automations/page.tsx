
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { automations as initialAutomations } from '@/lib/data';
import { Bot } from 'lucide-react';
import { useState } from 'react';

export default function AutomationsPage() {
  const [automations, setAutomations] = useState(initialAutomations);

  const toggleAutomation = (id: number) => {
    setAutomations(prev => 
      prev.map(auto => 
        auto.id === id ? { ...auto, active: !auto.active } : auto
      )
    );
  };

  return (
    <div className="p-6 fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-8">Automações</h1>
        <Card className="gradient-surface border-0 rounded-2xl">
            <CardHeader>
                <CardTitle>Automações Ativas e Inativas</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="divide-y divide-border">
                    {automations.map(auto => (
                        <div key={auto.id} className="flex items-center justify-between py-4">
                            <div>
                                <h3 className="font-medium text-foreground flex items-center gap-2">
                                    <Bot className="text-primary w-5 h-5"/>
                                    {auto.name}
                                </h3>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className={`text-sm font-medium ${auto.active ? 'text-green-400' : 'text-destructive'}`}>
                                    {auto.active ? 'Ativa' : 'Inativa'}
                                </span>
                                <Switch
                                    checked={auto.active}
                                    onCheckedChange={() => toggleAutomation(auto.id)}
                                    aria-label={`Toggle automation ${auto.name}`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
