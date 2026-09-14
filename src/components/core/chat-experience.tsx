'use client';

import { useState } from 'react';
import { Bot, FileText, ListTodo, MessageSquare, Users, Video } from 'lucide-react';
import EnterpriseChatView from '@/components/chat/enterprise-chat-view';
import type { EnterpriseConversation } from '@/features/chat/use-enterprise-chat';
import { OryonBadge, OryonButton, OryonPanel } from '@/components/oryon-ui';

export default function ChatExperience({ conversation, title, subtitle }: { conversation: EnterpriseConversation; title: string; subtitle?: string }) {
  const [contextTab, setContextTab] = useState<'files'|'tasks'|'meetings'|'people'|'decisions'|'ai'>('files');
  const tabs = [
    ['files','Files',FileText],['tasks','Tasks',ListTodo],['meetings','Meetings',Video],['people','People',Users],['decisions','Decisions',MessageSquare],['ai','AI',Bot],
  ] as const;
  return <div className="grid h-[calc(100dvh-140px)] min-h-[620px] grid-cols-[190px_minmax(0,1fr)_260px] overflow-hidden rounded-[12px] border border-border bg-surface-0 max-lg:grid-cols-[170px_minmax(0,1fr)] max-lg:[&>aside:last-child]:hidden">
    <aside className="border-r border-border bg-surface-1 p-2"><p className="px-2 py-2 text-label">Channels / DMs</p><button className="mb-2 w-full rounded-[8px] border border-primary/30 bg-primary/[0.07] p-3 text-left"><span className="block text-[12px] font-semibold text-foreground">{title}</span><span className="mt-1 block text-[10px] text-muted-foreground">{subtitle ?? 'Work conversation'}</span></button><p className="px-2 py-2 text-label">Context</p><div className="grid gap-1">{tabs.map(([key,label,Icon])=><button key={key} onClick={()=>setContextTab(key)} className={`flex items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[11px] ${contextTab===key?'bg-surface-2 text-primary':'text-muted-foreground hover:bg-surface-2'}`}><Icon className="h-3.5 w-3.5"/>{label}</button>)}</div></aside>
    <main className="min-w-0 overflow-hidden"><EnterpriseChatView conversation={conversation} title={title} subtitle={subtitle} /></main>
    <aside className="border-l border-border bg-surface-1 p-3"><div className="flex items-center justify-between"><p className="text-label">{tabs.find(([key])=>key===contextTab)?.[1]}</p><OryonBadge tone={contextTab==='ai'?'accent':'neutral'}>{contextTab==='ai'?'Intelligence':'Context'}</OryonBadge></div><div className="mt-4 rounded-[9px] border border-border bg-surface-0 p-4"><p className="text-[12px] font-medium text-foreground">{contextTab === 'ai' ? 'Ask Oryon' : `Context from ${tabs.find(([key])=>key===contextTab)?.[1]}`}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Use esta coluna para manter o contexto do trabalho visível sem sair da conversa.</p>{contextTab==='ai' ? <OryonButton className="mt-4 w-full" size="sm" onClick={()=>window.location.href='/dashboard/oryon-ai'}><Bot className="h-3.5 w-3.5"/>Abrir OryonAI</OryonButton> : null}</div></aside>
  </div>;
}
