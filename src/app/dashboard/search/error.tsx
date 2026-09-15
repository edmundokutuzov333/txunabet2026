'use client';

import { useEffect } from 'react';

export default function SearchError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[ORYON_SEARCH_ERROR]', error);
  }, [error]);

  return (
    <div className="grid min-h-[50vh] place-items-center p-6">
      <div className="max-w-lg text-center">
        <p className="text-label text-primary">Search</p>
        <h1 className="mt-2 text-h1">A pesquisa encontrou um problema</h1>
        <p className="mt-3 text-body text-muted-foreground">
          Oryon não conseguiu concluir esta pesquisa. Os dados não foram alterados.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 inline-flex min-h-9 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition-[filter,transform] duration-150 hover:brightness-105 active:scale-[0.98]"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
