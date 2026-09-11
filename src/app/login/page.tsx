
'use client';
import { LogIn, AlertCircle, Eye, EyeOff, Loader2, UserPlus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import TxunaLogo from '@/components/icons/txuna-logo';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, getIdToken } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { users } from '@/lib/data';

export default function LoginPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('admin@txunabet.com');
  const [password, setPassword] = useState('Oryon@2024!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const idToken = await userCredential.user.getIdToken(true);
      
      toast({
        title: 'Login bem-sucedido!',
        description: 'Bem-vindo de volta à Txuna Bet.',
      });

    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        const mockUser = users.find(u => u.email === email && u.password === password);
        
        if (mockUser) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken(true);
            
            toast({
              title: `Conta para ${mockUser.name} criada!`,
              description: 'A sua conta foi criada com sucesso e a sessão iniciada.',
            });

          } catch (signupErr: any) {
            console.error('Signup error during mock user login:', signupErr);
            setError('Falha ao criar e autenticar a sua conta. Contacte o administrador.');
          }
        } else {
          setError('Credenciais inválidas. Verifique o seu email e password.');
        }
      } else {
        let errorMessage = 'Ocorreu um erro desconhecido.';
        switch (err.code) {
          case 'auth/wrong-password':
            errorMessage = 'Password incorreta. Por favor, verifique a sua password.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'O formato do email é inválido.';
            break;
          default:
            errorMessage = 'Falha no login. Por favor, tente novamente.';
            break;
        }
        setError(errorMessage);
      }
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
          <p className="text-muted-foreground">Plataforma de Gestão Txuna Bet</p>
        </div>

        {error && (
          <div className="bg-destructive/20 text-destructive-foreground p-3 rounded-lg mb-6 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">
              Email
            </Label>
            <div className="relative">
              <Input
                type="email"
                id="email"
                name="email"
                className="pl-4 p-3 h-auto rounded-xl bg-card border-border focus:border-primary placeholder:text-muted-foreground"
                placeholder="seu.email@txunabet.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="pl-4 pr-10 p-3 h-auto rounded-xl bg-card border-border focus:border-primary placeholder:text-muted-foreground"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <Label
              htmlFor="remember"
              className="flex items-center gap-2 font-normal text-muted-foreground cursor-pointer"
            >
              <Checkbox id="remember" name="remember" className="rounded bg-card border-border text-primary focus:ring-primary" />
              Lembrar-me
            </Label>
            <Link href="/forgot-password" className="text-primary/80 hover:text-primary transition-colors">
              Esqueceu a password?
            </Link>
          </div>

          <Button type="submit" className="w-full btn-primary-gradient py-3 h-auto text-base font-semibold" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
            {loading ? 'A verificar...' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">Não tem uma conta?</p>
            <Link href="/login/signup" className="font-semibold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2 mt-1">
                Registe-se e ganhe o seu bónus <ArrowRight className="w-4 h-4"/>
            </Link>
        </div>
      </div>
    </main>
  );
}
