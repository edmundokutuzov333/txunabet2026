'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[ORYON_APP_ERROR]', error);
  }, [error]);

  return (
    <html lang="pt">
      <body className="min-h-screen bg-background text-foreground">
        <main className="grid min-h-screen place-items-center p-6">
          <div className="max-w-lg text-center">
            <p className="text-label text-primary">Oryon</p>
            <h1 className="mt-2 text-h1">Não foi possível carregar esta página</h1>
            <p className="mt-3 text-body text-muted-foreground">
              Oryon encontrou um erro inesperado. Nenhum dado foi alterado por esta mensagem.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-5 inline-flex min-h-9 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition-[filter,transform] duration-150 hover:brightness-105 active:scale-[0.98]"
            >
              Tentar novamente
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
