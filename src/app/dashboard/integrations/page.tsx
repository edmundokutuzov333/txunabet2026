
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { integrations as initialIntegrations } from '@/lib/data';
import { useState } from 'react';

const iconMap: {[key:string]: string} = {
    "Slack": "💬",
    "Salesforce": "☁️",
    "GitHub": "💻",
    "Figma": "🎨",
    "Zoom": "📹",
    "Asana": "✅",
    "Zendesk": "🎧",
    "Stripe": "💳",
    "Mailchimp": "🐵"
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(initialIntegrations);

  const toggleConnection = (id: number) => {
    setIntegrations(prev =>
      prev.map(int =>
        int.id === id ? { ...int, connected: !int.connected } : int
      )
    );
  };

  return (
    <div className="p-6 fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-8">Integrações</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map(int => (
                <Card key={int.id} className="gradient-surface border-0 rounded-2xl p-6 text-center">
                    <CardContent className="p-0 flex flex-col items-center justify-center">
                        <div className="text-4xl mb-4">{iconMap[int.name] || '🧩'}</div>
                        <h3 className="text-lg font-bold text-foreground">{int.name}</h3>
                        <div className="my-4">
                            <span className={`text-xs font-semibold py-1 px-3 rounded-full ${int.connected ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                                {int.connected ? 'Conectado' : 'Disponível'}
                            </span>
                        </div>
                        <Button 
                            className={`${int.connected ? 'bg-card/10 hover:bg-card/20' : 'btn-primary-gradient'} w-full py-2 rounded-lg font-semibold transition-colors h-auto`}
                            onClick={() => toggleConnection(int.id)}
                        >
                            {int.connected ? 'Gerir' : 'Conectar'}
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
}
