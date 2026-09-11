'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { integrations as initialIntegrations } from '@/lib/data';
import { useState } from 'react';

const iconMap: Record<string, string> = {
    Slack: '💬',
    Salesforce: '☁️',
    GitHub: '💻',
    Figma: '🎨',
    Zoom: '📹',
    Asana: '✅',
    Zendesk: '🎧',
    Stripe: '💳',
    Mailchimp: '🐵',
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(initialIntegrations);

  const toggleConnection = (id: string) => {
    setIntegrations((previous) => previous.map((integration) => (
      integration.id === id ? { ...integration, connected: !integration.connected } : integration
    )));
  };

  return (
    <div className="p-6 fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8">Integrações</h1>
      {integrations.length === 0 ? (
        <Card className="gradient-surface border-0 rounded-2xl">
          <CardContent className="p-8 text-center text-muted-foreground">
            Não existem integrações configuradas para esta empresa.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <Card key={integration.id} className="gradient-surface border-0 rounded-2xl p-6 text-center">
              <CardContent className="p-0 flex flex-col items-center justify-center">
                <div className="text-4xl mb-4">{iconMap[integration.name] || '🧩'}</div>
                <h3 className="text-lg font-bold text-foreground">{integration.name}</h3>
                <div className="my-4">
                  <span className={`text-xs font-semibold py-1 px-3 rounded-full ${integration.connected ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                    {integration.connected ? 'Conectado' : 'Disponível'}
                  </span>
                </div>
                <Button
                  className={`${integration.connected ? 'bg-card/10 hover:bg-card/20' : 'btn-primary-gradient'} w-full py-2 rounded-lg font-semibold transition-colors h-auto`}
                  onClick={() => toggleConnection(integration.id)}
                >
                  {integration.connected ? 'Gerir' : 'Conectar'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
