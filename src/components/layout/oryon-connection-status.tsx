'use client';

import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OryonConnectionStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(window.navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (online) return null;

  return (
    <div role="status" aria-live="polite" className="oryon-offline flex min-h-10 items-center justify-center gap-2 border-x-0 border-t-0 px-4 py-2 text-xs font-medium">
      <WifiOff aria-hidden className="h-3.5 w-3.5" />
      <span>Sem ligação. Alterações locais serão retomadas quando a ligação voltar.</span>
    </div>
  );
}
