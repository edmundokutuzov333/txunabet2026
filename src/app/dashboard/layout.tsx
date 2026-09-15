import { redirect } from 'next/navigation';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { MobileBottomNav, OryonShellProvider } from '@/components/layout/oryon-shell-v2';
import OryonConnectionStatus from '@/components/layout/oryon-connection-status';
import WebMetrics from '@/components/observability/web-metrics';
import { requireIdentity } from '@/server/authorization';
import { ensureDemoData } from '@/server/services/demo-seed';
import { ensureDemoDataExtra } from '@/server/services/demo-seed-extra';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try {
    const identity = await requireIdentity();

    // Demo fixtures are never allowed in production. They may only be enabled
    // during non-production development with an explicit environment flag.
    if (process.env.NODE_ENV !== 'production' && process.env.ORYON_ENABLE_DEMO_SEED === 'true') {
      await ensureDemoData(identity);
      await ensureDemoDataExtra(identity);
    }
  } catch {
    redirect('/login');
  }

  return (
    <OryonShellProvider>
      <div className="oryon-app-shell flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
        <WebMetrics />
        <AppSidebar />
        <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
          <Header />
          <OryonConnectionStatus />
          <div className="oryon-page-viewport flex-1 overflow-y-auto custom-scrollbar pb-14 md:pb-0">
            <div className="oryon-page-content min-h-full px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
              {children}
            </div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </OryonShellProvider>
  );
}
