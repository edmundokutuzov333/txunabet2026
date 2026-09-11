
'use client';
import { LogIn, AlertCircle, Eye, EyeOff, Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TxunaLogo from '@/components/icons/txuna-logo';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
        setError("A password deve ter pelo menos 6 caracteres.");
        setLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const idToken = await userCredential.user.getIdToken(true);

      await sendEmailVerification(userCredential.user);

      toast({
        title: 'Conta Criada com Sucesso!',
        description: 'Enviámos um email de verificação. Por favor, verifique a sua caixa de entrada.',
      });

      setSuccess(true);

    } catch (err: any) {
      console.error('Signup error:', err);
      let errorMessage = 'Ocorreu um erro desconhecido.';
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email já está a ser utilizado por outra conta.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'O formato do email é inválido.';
          break;
        case 'auth/weak-password':
            errorMessage = 'A sua password é demasiado fraca.';
            break;
        default:
          errorMessage = 'Falha no registo. Por favor, tente novamente.';
          break;
      }
      setError(errorMessage);
       toast({
        variant: 'destructive',
        title: 'Falha no Registo',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
      return (
          <main className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950">
            <div className="gradient-surface p-8 md:p-10 rounded-2xl w-full max-w-md mx-4 border-2 border-primary/50 bounce-in text-center">
                <TxunaLogo className="mx-auto mb-4 w-40 h-12" />
                <h1 className="text-2xl font-bold text-foreground mb-2">Verifique o seu Email</h1>
                <p className="text-muted-foreground mb-8">
                    Enviámos um link de verificação para <strong>{email}</strong>. Por favor, clique no link para ativar a sua conta antes de fazer login.
                </p>
                <Link href="/login">
                <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o Login
                </Button>
                </Link>
            </div>
        </main>
      )
  }

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950">
      <div className="gradient-surface p-8 md:p-10 rounded-2xl w-full max-w-md mx-4 border-2 border-primary/50 bounce-in">
        <div className="text-center mb-8">
          <TxunaLogo className="mx-auto mb-4 w-52 h-16" />
          <h1 className="text-3xl font-bold text-foreground mb-1">Criar Conta Txuna Bet</h1>
          <p className="text-muted-foreground">Junte-se à melhor plataforma de apostas.</p>
        </div>

        {error && (
          <div className="bg-destructive/20 text-destructive-foreground p-3 rounded-lg mb-6 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="name" className="text-muted-foreground">
              Nome Completo
            </Label>
            <Input
              type="text"
              id="name"
              name="name"
              className="pl-4 p-3 h-auto rounded-xl bg-card border-border focus:border-primary placeholder:text-muted-foreground"
              placeholder="Seu nome completo"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">
              Email
            </Label>
            <Input
              type="email"
              id="email"
              name="email"
              className="pl-4 p-3 h-auto rounded-xl bg-card border-border focus:border-primary placeholder:text-muted-foreground"
              placeholder="seu.email@exemplo.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="pl-4 pr-10 p-3 h-auto rounded-xl bg-card border-border focus:border-primary placeholder:text-muted-foreground"
                placeholder="Pelo menos 6 caracteres"
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

          <Button type="submit" className="w-full btn-primary-gradient py-3 h-auto text-base font-semibold" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
            {loading ? 'A criar conta...' : 'Criar Conta'}
          </Button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">Já tem uma conta?</p>
            <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2 mt-1">
                <ArrowLeft className="w-4 h-4"/>
                Voltar para o Login
            </Link>
        </div>
      </div>
    </main>
  );
}
