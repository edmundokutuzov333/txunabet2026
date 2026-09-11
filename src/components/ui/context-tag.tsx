'use client';
import Link from 'next/link';
import { Target, Gamepad2, User, Video } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import type { Context } from '@/lib/types';

const contextConfig = {
  campaign: { icon: Target, color: 'bg-green-500/20 text-green-300', path: '/dashboard/campaigns' },
  game_operation: { icon: Gamepad2, color: 'bg-blue-500/20 text-blue-300', path: '/dashboard/operations' },
  user: { icon: User, color: 'bg-purple-500/20 text-purple-300', path: '/dashboard/team' },
  meeting: { icon: Video, color: 'bg-orange-500/20 text-orange-300', path: '/dashboard/meetings' },
};

export function ContextTag({ context }: { context?: Context | null }) {
  if (!context) return null;

  const config = contextConfig[context.type];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Link href={`${config.path}/${context.id}`} className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80',
      config.color
    )}>
      <Icon className="h-3.5 w-3.5" />
      <span>{context.name}</span>
    </Link>
  );
}
