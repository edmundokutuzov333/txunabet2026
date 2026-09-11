'use client';

import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TxunaLogo from '@/components/icons/txuna-logo';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950">
      <div className="gradient-surface p-8 md:p-10 rounded-2xl w-full max-w-md mx-4 border-2 border-primary/50 bounce-in text-center">
        <TxunaLogo className="mx-auto mb-4 w-40 h-12" />
        <ShieldCheck className="mx-auto h-12 w-12 text-primary mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Acesso interno</h1>
        <p className="text-muted-foreground mb-8">
          A criação de contas é administrada pela Txuna Bet. Para entrar na plataforma, a sua conta deve ser criada por um administrador e associada a uma empresa e a um departamento.
        </p>
        <Link href="/login" className="block">
          <Button className="w-full btn-primary-gradient">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Login
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground mt-4">Não partilhe passwords ou códigos de acesso.</p>
      </div>
    </main>
  );
}
