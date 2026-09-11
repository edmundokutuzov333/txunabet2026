import { redirect } from 'next/navigation';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import WebMetrics from '@/components/observability/web-metrics';
import { requireIdentity } from '@/server/authorization';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireIdentity();
  } catch {
    redirect('/login');
  }

  return (
    <div className="flex h-screen w-full">
      <WebMetrics />
      <AppSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-grow overflow-y-auto custom-scrollbar">{children}</div>
      </main>
    </div>
  );
}
