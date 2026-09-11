import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="min-h-full flex items-center justify-center p-8" role="status" aria-live="polite" aria-label="A carregar">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span>A carregar a área de trabalho...</span>
      </div>
    </div>
  );
}
