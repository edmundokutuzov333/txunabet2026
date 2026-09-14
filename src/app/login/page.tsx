'use client';

import { LogIn, AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import TxunaLogo from '@/components/icons/txuna-logo';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';

async function establishServerSession(idToken: string): Promise<void> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      credentials: 'include',
      signal: controller.signal,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || 'SESSION_CREATION_FAILED');
    }
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function LoginPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken(true);
      await establishServerSession(idToken);
      toast({ title: 'Login bem-sucedido', description: 'Sessão criada com sucesso.' });
      router.replace('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: unknown }).code) : '';
      const message = code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password'
        ? 'Email ou password inválidos.'
        : code === 'auth/too-many-requests'
          ? 'Demasiadas tentativas. Aguarde alguns minutos e tente novamente.'
          : err instanceof Error && err.message
            ? err.message
            : 'Não foi possível iniciar a sessão. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950">
      <div className="gradient-surface p-8 md:p-10 rounded-2xl w-full max-w-md mx-4 border-2 border-primary/50 bounce-in">
        <div className="text-center mb-8">
          <TxunaLogo className="mx-auto mb-4 w-52 h-16" />
          <h1 className="text-4xl font-bold text-foreground mb-1">Entre para a Ação</h1>
          <p className="text-muted-foreground">Plataforma Corporativa Txuna Bet</p>
        </div>
        {error && (
          <div className="bg-destructive/20 text-destructive-foreground p-3 rounded-lg mb-6 flex items-center gap-3 text-sm" role="alert">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-6" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">Email corporativo</Label>
            <Input type="email" id="email" name="email" autoComplete="username" className="pl-4 p-3 h-auto rounded-xl bg-card border-border focus:border-primary" placeholder="nome@txunabet.com" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} id="password" name="password" autoComplete="current-password" className="pl-4 pr-10 p-3 h-auto rounded-xl bg-card border-border focus:border-primary" placeholder="A sua password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} />
              <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:bg-transparent" onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <Label htmlFor="remember" className="flex items-center gap-2 font-normal text-muted-foreground cursor-pointer">
              <Checkbox id="remember" name="remember" className="rounded bg-card border-border" />
              Lembrar-me
            </Label>
            <Link href="/forgot-password" className="text-primary/80 hover:text-primary transition-colors">Esqueceu a password?</Link>
          </div>
          <Button type="submit" className="w-full btn-primary-gradient py-3 h-auto text-base font-semibold" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
            {loading ? 'A iniciar sessão...' : 'Entrar'}
          </Button>
        </form>
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">Acesso exclusivo a colaboradores autorizados.</p>
          <Link href="/login/signup" className="font-semibold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2 mt-2">Pedir acesso à plataforma <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </main>
  );
}
