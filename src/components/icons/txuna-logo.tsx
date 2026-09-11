import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function TxunaLogo({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-52 h-16", className)}>
      <Image
        src="/TxunaBet.webp"
        alt="Txuna Bet Logo"
        fill
        priority
        className="object-contain"
      />
    </div>
  );
}
