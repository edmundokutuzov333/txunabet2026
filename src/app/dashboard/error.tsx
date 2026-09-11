'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Oryon dashboard error', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4" role="alert">
        <AlertTriangle className="h-10 w-10 mx-auto text-destructive" aria-hidden="true" />
        <div><h2 className="text-xl font-semibold">Não foi possível carregar esta área</h2><p className="text-sm text-muted-foreground mt-2">O erro foi registado. Pode tentar carregar a página novamente.</p></div>
        <Button onClick={() => reset()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>
      </div>
    </div>
  );
}
