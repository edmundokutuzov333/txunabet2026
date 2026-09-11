'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import EnterpriseChatView from '@/components/chat/enterprise-chat-view';
import { ensureConversation, type EnterpriseConversation } from '@/features/chat/use-enterprise-chat';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';

export default function DirectChatPage() {
  const params = useParams<{ userId: string }>();
  const { identity, loading } = useEnterpriseIdentity();
  const [conversation, setConversation] = useState<EnterpriseConversation | null>(null);
  const [name, setName] = useState('Chat privado');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identity || !params.userId) return;
    Promise.all([
      ensureConversation({ type: 'direct', targetUserId: params.userId }),
      fetch('/api/users/directory', { credentials: 'include', cache: 'no-store' }).then((response) => response.json()),
    ]).then(([result, directory]) => {
      setConversation(result.data);
      const target = (directory.members ?? []).find((member: { uid: string; displayName: string }) => member.uid === params.userId);
      setName(target?.displayName ? `Chat com ${target.displayName}` : 'Chat privado');
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o chat privado.'));
  }, [identity, params.userId]);

  if (loading || (!conversation && !error)) return <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  if (!conversation) return null;
  return <EnterpriseChatView conversation={conversation} title={name} subtitle="Conversa privada entre colaboradores da mesma empresa." />;
}
