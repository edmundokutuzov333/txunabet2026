'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Phone, Search, Video } from 'lucide-react';
import { users } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useState } from 'react';
import Link from 'next/link';

const statusClasses: { [key: string]: string } = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  dnd: 'bg-purple-500',
  offline: 'bg-slate-500',
};

export default function StartCallDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    const statusOrder = { online: 1, away: 2, busy: 3, dnd: 4, offline: 5 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="gradient-surface border-primary/50 max-w-lg p-0 flex flex-col h-[60vh]">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Video className="h-8 w-8 text-primary" />
            Iniciar Chamada
          </DialogTitle>
          <DialogDescription>
            Selecione um membro da equipa para iniciar uma chamada de vídeo ou voz.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisar membro da equipa..."
              className="pl-10 pr-4 py-2 w-full h-auto bg-card border-border rounded-xl focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar px-6 space-y-2">
            {filteredUsers.map(user => {
                const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${user.id}`)?.imageUrl;
                return (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg hover:bg-card/80 transition-colors">
                        <div className="flex items-center gap-3">
                             <div className="relative">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={avatar} alt={user.name} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ${statusClasses[user.status]} ring-2 ring-background`}></span>
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.department}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={`/dashboard/call/${user.id}?type=voice`}>
                                <Button size="icon" variant="outline" className="rounded-full bg-card/50 border-border hover:bg-primary/20 hover:text-primary">
                                    <Phone className="w-5 h-5"/>
                                </Button>
                            </Link>
                            <Link href={`/dashboard/call/${user.id}?type=video`}>
                                <Button size="icon" variant="outline" className="rounded-full bg-card/50 border-border hover:bg-primary/20 hover:text-primary">
                                    <Video className="w-5 h-5"/>
                                </Button>
                            </Link>
                        </div>
                    </div>
                )
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
