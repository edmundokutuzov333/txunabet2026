'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import EnterpriseChatView from '@/components/chat/enterprise-chat-view';
import { ensureConversation, type EnterpriseConversation } from '@/features/chat/use-enterprise-chat';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';

export default function GeneralChatPage() {
  const { identity, loading } = useEnterpriseIdentity();
  const [conversation, setConversation] = useState<EnterpriseConversation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) return;
    ensureConversation({ type: 'company_general', name: 'Geral' })
      .then((result) => setConversation(result.data))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o canal geral.'));
  }, [identity]);

  if (loading || (!conversation && !error)) return <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  if (!conversation) return null;
  return <EnterpriseChatView conversation={conversation} title="# geral" subtitle="Canal empresarial para toda a empresa." />;
}
