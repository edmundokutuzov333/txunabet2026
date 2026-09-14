'use client';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ChatExperience from '@/components/core/chat-experience';
import { ensureConversation, type EnterpriseConversation } from '@/features/chat/use-enterprise-chat';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';
export default function GeneralChatPage(){const {identity,loading}=useEnterpriseIdentity();const [conversation,setConversation]=useState<EnterpriseConversation|null>(null);const [error,setError]=useState<string|null>(null);useEffect(()=>{if(!identity)return;ensureConversation({type:'company_general',name:'Geral'}).then(r=>setConversation(r.data)).catch(e=>setError(e instanceof Error?e.message:'Não foi possível abrir o canal geral.'));},[identity]);if(loading||(!conversation&&!error))return <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/></div>;if(error)return <div className="p-4 text-sm text-[hsl(var(--status-danger))]">{error}</div>;if(!conversation)return null;return <ChatExperience conversation={conversation} title="# geral" subtitle="Canal empresarial para toda a empresa."/>}
