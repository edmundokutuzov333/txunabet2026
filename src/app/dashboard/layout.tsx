import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
