'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TxunaLogo from './icons/txuna-logo';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityAllowed, setIdentityAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (isUserLoading) return;

    const isAuthPage = pathname.startsWith('/login') || pathname === '/forgot-password';
    const isLandingPage = pathname === '/';

    if (!user && !isAuthPage && !isLandingPage) {
      router.replace('/');
      return;
    }

    if (user && (isAuthPage || isLandingPage)) {
      router.replace('/dashboard');
      return;
    }
  }, [user, isUserLoading, router, pathname]);

  useEffect(() => {
    if (!user || pathname.startsWith('/login') || pathname === '/forgot-password' || pathname === '/') {
      setIdentityAllowed(null);
      setIdentityLoading(false);
      return;
    }

    let cancelled = false;
    setIdentityLoading(true);
    fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      .then((response) => {
        if (cancelled) return;
        setIdentityAllowed(response.ok);
      })
      .catch(() => {
        if (!cancelled) setIdentityAllowed(false);
      })
      .finally(() => {
        if (!cancelled) setIdentityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  if (isUserLoading || identityLoading) {
    return (
      <main className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950">
        <TxunaLogo className="mx-auto mb-4 w-52 h-16" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          A verificar a sua identidade empresarial...
        </div>
      </main>
    );
  }

  if (user && identityAllowed === false && !pathname.startsWith('/login') && pathname !== '/' && pathname !== '/forgot-password') {
    return (
      <main className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950">
        <div className="max-w-md text-center">
          <ShieldAlert className="mx-auto h-14 w-14 text-destructive mb-5" />
          <h1 className="text-2xl font-semibold text-foreground mb-2">Acesso não autorizado</h1>
          <p className="text-muted-foreground mb-6">A sua conta Firebase existe, mas não possui uma membership empresarial ativa nesta plataforma.</p>
          <button className="text-primary hover:underline" onClick={() => router.replace('/login')}>Voltar ao Login</button>
        </div>
      </main>
    );
  }

  if (isUserLoading && pathname !== '/') return null;
  return <>{children}</>;
}
