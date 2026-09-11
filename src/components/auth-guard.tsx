
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import TxunaLogo from './icons/txuna-logo';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until the user state is loaded
    }

    const isAuthPage = pathname.startsWith('/login') || pathname === '/forgot-password';
    const isLandingPage = pathname === '/';

    if (user && (isAuthPage || isLandingPage)) {
      // If user is logged in and on an auth or landing page, redirect to dashboard
      router.push('/dashboard');
    } else if (!user && !isAuthPage && !isLandingPage) {
      // If user is not logged in and not on an auth/landing page, redirect to landing
      router.push('/');
    }
  }, [user, isUserLoading, router, pathname]);

  // Show a loading screen while checking auth state, except on the public landing page.
  if (isUserLoading && pathname !== '/') {
    return (
      <main className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950">
        <TxunaLogo className="mx-auto mb-4 w-52 h-16" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          A verificar a sua sessão...
        </div>
      </main>
    );
  }

  // Prevent auth pages from flashing before redirecting to dashboard
  if (user && (pathname.startsWith('/login') || pathname === '/')) {
      return (
        <main className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950">
            <TxunaLogo className="mx-auto mb-4 w-52 h-16" />
            <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            A redirecionar para o seu dashboard...
            </div>
        </main>
    );
  }


  return <>{children}</>;
}
