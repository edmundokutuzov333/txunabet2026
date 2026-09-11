

'use client';

import { Mail, ShieldCheck, Send, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TxunaLogo from '@/components/icons/txuna-logo';
import { useFormState, useFormStatus } from 'react-dom';
import { handleForgotPassword } from '@/app/auth/actions';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full btn-primary-gradient py-3 h-auto text-base font-semibold" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
      {pending ? 'A enviar...' : 'Enviar Link de Recuperação'}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(handleForgotPassword, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: state.error,
      });
    }
  }, [state, toast]);

  if (state?.message) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="gradient-surface p-8 md:p-10 rounded-2xl w-full max-w-md mx-4 border-2 border-primary/50 bounce-in text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-400 mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Verifique o seu Email</h1>
            <p className="text-muted-foreground mb-8">
                {state.message}
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o Login
              </Button>
            </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="gradient-surface p-8 md:p-10 rounded-2xl w-full max-w-md mx-4 border-2 border-primary/50 bounce-in">
        <div className="text-center mb-8">
          <TxunaLogo className="mx-auto mb-4 w-52 h-16" />
          <h1 className="text-2xl font-bold text-foreground mb-1">Recuperar Password</h1>
          <p className="text-muted-foreground">Insira o seu email para receber um link de recuperação.</p>
        </div>

        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                id="email"
                name="email"
                className="pl-12 p-3 h-auto rounded-xl bg-card border-border focus:border-primary placeholder:text-muted-foreground"
                placeholder="seu.email@txunabet.com"
                required
              />
            </div>
          </div>
          
          <ResetButton />
        </form>

        <div className="mt-8 text-center">
           <Link href="/login" className="text-sm text-primary/80 hover:text-primary transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4"/>
              Lembrou-se da password? Voltar ao Login
            </Link>
        </div>
      </div>
    </main>
  );
}
