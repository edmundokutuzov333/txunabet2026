'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';
import { MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';

type DirectoryMember = {
  uid: string;
  displayName: string;
  role?: string;
  status?: 'online' | 'away' | 'busy' | 'dnd' | 'offline';
  photoURL?: string | null;
};

const statusClasses: Record<NonNullable<DirectoryMember['status']>, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  dnd: 'bg-purple-500',
  offline: 'bg-slate-500',
};

export default function DirectMessagesPage() {
  const { identity, loading: identityLoading } = useEnterpriseIdentity();
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDirectory() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/users/directory', {
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Não foi possível carregar o diretório (${response.status}).`);
        }

        const payload = (await response.json()) as { members?: DirectoryMember[] };
        if (!cancelled) {
          setMembers((payload.members ?? []).filter((member) => member.uid !== identity?.uid));
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o diretório.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (identity?.uid) {
      void loadDirectory();
    } else if (!identityLoading) {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [identity?.uid, identityLoading]);

  const isLoading = identityLoading || loading;

  return (
    <div className="p-6 fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8">Mensagens Diretas</h1>
      <Card className="gradient-surface border-0 rounded-2xl">
        <CardHeader>
          <CardTitle>Iniciar uma Conversa</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="min-h-[220px] flex items-center justify-center" aria-busy="true">
              <Loader2 className="h-6 w-6 animate-spin" aria-label="A carregar diretório" />
            </div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
              {error}
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-background/30 p-8 text-center text-sm text-muted-foreground">
              Não existem outros colaboradores disponíveis para iniciar uma conversa.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((user) => {
                const avatar = user.photoURL ?? PlaceHolderImages.find((p) => p.id === `user-avatar-${user.uid}`)?.imageUrl;
                const status = user.status ?? 'offline';

                return (
                  <div key={user.uid} className="flex items-center justify-between p-3 bg-card/5 rounded-lg hover:bg-card/10 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar>
                          <AvatarImage src={avatar} alt={user.displayName} data-ai-hint="person portrait" />
                          <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${statusClasses[status]} ring-2 ring-background`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.role ?? 'Colaborador'}</p>
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
