'use client';

import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';
import { MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';

const statusClasses = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  dnd: 'bg-purple-500',
  offline: 'bg-slate-500',
} as const;

type DirectoryMember = {
  uid: string;
  displayName: string;
  role?: string;
  status?: keyof typeof statusClasses;
  photoURL?: string;
};

export default function DirectMessagesPage() {
  const { identity, loading } = useEnterpriseIdentity();
  const members = useMemo<DirectoryMember[]>(() => {
    if (!identity?.userId) return [];
    return [];
  }, [identity?.userId]);

  if (loading) {
    return (
      <div className="h-full min-h-[320px] flex items-center justify-center" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="A carregar" />
      </div>
    );
  }

  return (
    <div className="p-6 fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8">Mensagens Diretas</h1>
      <Card className="gradient-surface border-0 rounded-2xl">
        <CardHeader>
          <CardTitle>Iniciar uma Conversa</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-background/30 p-8 text-center text-sm text-muted-foreground">
              O diretório de colaboradores será carregado pela camada autenticada de mensagens.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((user) => {
                const avatar = user.photoURL ?? PlaceHolderImages.find((p) => p.id === `user-avatar-${user.uid}`)?.imageUrl;
                const status = user.status ?? 'offline';

                return (
                  <div key={user.uid} className="flex items-center justify-between p-3 bg-card/5 rounded-lg hover:bg-card/10 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={avatar} alt={user.displayName} data-ai-hint="person portrait" />
                          <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${statusClasses[status]} ring-2 ring-background`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">{user.role ?? 'Colaborador'}</p>
                      </div>
                    </div>
                    <Link href={`/dashboard/chat/direct/${user.uid}`}>
                      <Button className="btn-primary-gradient py-1 px-4 text-sm font-semibold rounded-lg">
                        <MessageSquare className="mr-2 h-4 w-4" /> Mensagem
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
